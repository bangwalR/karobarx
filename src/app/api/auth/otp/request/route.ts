import { createAdminClient } from "@/lib/supabase/admin";
import { logAuthEvent } from "@/lib/auth/audit";
import { getClientAddress, checkRateLimit } from "@/lib/security/rate-limit";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

    const { email, flow, full_name, username, password } = payload as Record<string, string>;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedFlow = flow === "signup" ? "signup" : "login";
    const normalizedUsername = (username || "").trim().toLowerCase();
    const normalizedName = (full_name || "").trim();
    const normalizedPassword = (password || "").trim();
    const ipAddress = getClientAddress(request.headers);
    let signupPasswordHash: string | null = null;

    const limiter = checkRateLimit(`otp:${ipAddress}:${normalizedEmail}`, 5, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Too many OTP requests. Please try again later." }, { status: 429 });
    }

    if (!emailPattern.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (normalizedFlow === "signup") {
      if (!normalizedName || !normalizedUsername || !normalizedPassword) {
        return NextResponse.json({ error: "Full name, username, and password are required for signup." }, { status: 400 });
      }

      if (normalizedUsername.length < 3) {
        return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
      }

      if (normalizedPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
      }

      const { data: existingUser } = await supabase
        .from("admin_users")
        .select("id")
        .or(`username.eq.${normalizedUsername},email.eq.${normalizedEmail}`)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json({ error: "That email or username is already registered." }, { status: 409 });
      }

      const { data: passwordHash, error: hashError } = await supabase.rpc("hash_password", {
        password: normalizedPassword,
      });

      if (hashError || !passwordHash) {
        return NextResponse.json({ error: "Failed to secure your password." }, { status: 500 });
      }

      signupPasswordHash = passwordHash as string;
    } else {
      const { data: existingUser } = await supabase
        .from("admin_users")
        .select("id, is_active")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!existingUser || !existingUser.is_active) {
        return NextResponse.json({ error: "No active admin account exists for this email." }, { status: 403 });
      }
    }

    const otpClient = getOtpSupabase();
    const { error: otpError } = await otpClient.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: normalizedFlow === "signup",
      },
    });

    if (otpError) {
      return NextResponse.json({ error: otpError.message }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data: challenge, error: challengeError } = await supabase
      .from("auth_otp_challenges")
      .insert({
        email: normalizedEmail,
        flow: normalizedFlow,
        full_name: normalizedFlow === "signup" ? normalizedName : null,
        username: normalizedFlow === "signup" ? normalizedUsername : null,
        password_hash: normalizedFlow === "signup" ? signupPasswordHash : null,
        requested_role: normalizedFlow === "signup" ? "super_admin" : null,
        expires_at: expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (challengeError) {
      return NextResponse.json({ error: challengeError.message }, { status: 500 });
    }

    await logAuthEvent({
      action: normalizedFlow === "signup" ? "otp_signup_requested" : "otp_login_requested",
      description: `OTP requested for ${normalizedEmail}`,
      ipAddress,
      metadata: { flow: normalizedFlow },
    });

    return NextResponse.json({
      success: true,
      challengeId: challenge.id,
      expiresAt: challenge.expires_at,
      message: "OTP sent to your email address.",
    });
  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json({ error: "Failed to send OTP." }, { status: 500 });
  }
}
