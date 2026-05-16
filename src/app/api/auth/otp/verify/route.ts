import { createAdminClient } from "@/lib/supabase/admin";
import { logAuthEvent } from "@/lib/auth/audit";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { getClientAddress, checkRateLimit } from "@/lib/security/rate-limit";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getOtpSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { email, token, challengeId } = payload as Record<string, string>;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedToken = (token || "").trim();
    const ipAddress = getClientAddress(request.headers);

    const limiter = checkRateLimit(`otp-verify:${ipAddress}:${normalizedEmail}`, 10, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Too many verification attempts. Please try again later." }, { status: 429 });
    }

    if (!emailPattern.test(normalizedEmail) || !normalizedToken || !challengeId) {
      return NextResponse.json({ error: "Email, OTP, and challenge id are required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: challenge, error: challengeError } = await supabase
      .from("auth_otp_challenges")
      .select("*")
      .eq("id", challengeId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (challengeError || !challenge) {
      return NextResponse.json({ error: "OTP challenge not found." }, { status: 404 });
    }

    if (challenge.consumed_at || new Date(challenge.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "OTP has expired. Please request a new code." }, { status: 400 });
    }

    const otpClient = getOtpSupabase();
    const { data: verifyData, error: verifyError } = await otpClient.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type: "email",
    });

    if (verifyError || !verifyData.user) {
      return NextResponse.json({ error: verifyError?.message || "Invalid OTP code." }, { status: 400 });
    }

    let adminUser:
      | { id: string; username: string; email: string; full_name: string; profile_id: string | null }
      | null = null;

    if (challenge.flow === "signup") {
      const { data: createdUser, error: insertError } = await supabase
        .from("admin_users")
        .insert({
          username: challenge.username,
          email: normalizedEmail,
          full_name: challenge.full_name,
          password_hash: challenge.password_hash || null,
          role: "super_admin",
          is_active: true,
          auth_user_id: verifyData.user.id,
          auth_provider: "supabase_otp",
          permissions: ROLE_PERMISSIONS.super_admin,
        })
        .select("id, username, email, full_name, profile_id")
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      adminUser = createdUser;
    } else {
      const { data: existingUser, error: userError } = await supabase
        .from("admin_users")
        .update({
          auth_user_id: verifyData.user.id,
          auth_provider: "supabase_otp",
          failed_login_attempts: 0,
          locked_until: null,
          last_failed_login_at: null,
        })
        .eq("email", normalizedEmail)
        .eq("is_active", true)
        .select("id, username, email, full_name, profile_id")
        .single();

      if (userError || !existingUser) {
        return NextResponse.json({ error: userError?.message || "Admin account not found." }, { status: 403 });
      }

      adminUser = existingUser;
    }

    await supabase
      .from("auth_otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);

    const ticket = randomBytes(24).toString("hex");
    await supabase.from("auth_otp_tickets").insert({
      admin_user_id: adminUser.id,
      email: normalizedEmail,
      ticket,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    await logAuthEvent({
      userId: adminUser.id,
      action: challenge.flow === "signup" ? "otp_signup_verified" : "otp_login_verified",
      description: `OTP verified for ${normalizedEmail}`,
      ipAddress,
      metadata: { flow: challenge.flow, auth_user_id: verifyData.user.id },
    });

    return NextResponse.json({
      success: true,
      ticket,
      needsSetup: !adminUser.profile_id,
      message: challenge.flow === "signup" ? "Account verified. Signing you in." : "OTP verified. Signing you in.",
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "Failed to verify OTP." }, { status: 500 });
  }
}
