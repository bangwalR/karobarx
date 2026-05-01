import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { username, email, password, full_name, is_owner } = await req.json();

    if (!username || !email || !password || !full_name) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Check if username or email already exists
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Username or email already in use." },
        { status: 409 }
      );
    }

    // Hash the password using the existing Supabase function
    const { data: passwordHash, error: hashError } = await supabase.rpc(
      "hash_password",
      { password }
    );

    if (hashError || !passwordHash) {
      return NextResponse.json(
        { error: "Failed to process password." },
        { status: 500 }
      );
    }

    // Insert the new admin user — owners get super_admin, otherwise staff
    const adminPermissions = {
      dashboard: { read: true },
      inventory: { read: true, write: true, delete: true },
      customers: { read: true, write: true, delete: true },
      orders: { read: true, write: true, delete: true },
      inquiries: { read: true, write: true, delete: true },
      leads: { read: true, write: true, delete: true },
      marketing: { read: true, write: true, delete: true },
      settings: { read: true, write: true },
      users: { read: true, write: true, delete: true },
    };
    const staffPermissions = {
      dashboard: { read: true },
      inventory: { read: true, write: false, delete: false },
      customers: { read: true, write: false, delete: false },
      orders: { read: true, write: false, delete: false },
      inquiries: { read: true, write: false, delete: false },
      leads: { read: true, write: false, delete: false },
      settings: { read: false, write: false },
    };
    const { data: newUser, error: insertError } = await supabase
      .from("admin_users")
      .insert({
        username,
        email,
        password_hash: passwordHash,
        full_name,
        role: is_owner ? "admin" : "staff",
        is_active: true,
        permissions: is_owner ? adminPermissions : staffPermissions,
      })
      .select("id, username, email, full_name, role")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
