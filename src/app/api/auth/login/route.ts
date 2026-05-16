import { createClient } from "@/lib/supabase/server";
import { logAuthEvent } from "@/lib/auth/audit";
import { validatePasswordLogin } from "@/lib/auth/password-login";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 }
    );
  }

  const validation = await validatePasswordLogin(username, password);

  if (validation.ok) {
    const { user } = validation;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        permissions: user.permissions,
      },
    });
  }

  if (validation.userId && validation.status === 401 && validation.error.startsWith("Invalid password.")) {
    const { data: currentUser } = await supabase
      .from("admin_users")
      .select("failed_login_attempts")
      .eq("id", validation.userId)
      .maybeSingle();

    const nextAttempts = (currentUser?.failed_login_attempts || 0) + 1;
    const lockedUntil = nextAttempts >= 5
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null;

    await supabase
      .from("admin_users")
      .update({
        failed_login_attempts: nextAttempts,
        locked_until: lockedUntil,
        last_failed_login_at: new Date().toISOString(),
      })
      .eq("id", validation.userId);

    await logAuthEvent({
      userId: validation.userId,
      action: "failed_login",
      description: `Failed password login for ${username}`,
    });
  }

  if (validation.status === 423) {
    return NextResponse.json({ error: validation.error }, { status: 423 });
  }

  if (validation.status === 403) {
    return NextResponse.json({ error: validation.error }, { status: 403 });
  }

  return NextResponse.json({ error: validation.error }, { status: 401 });
}
