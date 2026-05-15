import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { normalizeRole, ROLE_PERMISSIONS } from "@/lib/permissions";
import {
  canManageTargetRole,
  requireTenantContext,
  type TenantContext,
} from "@/lib/tenant";

function resolveProfileForNewUser(context: TenantContext, targetRole: ReturnType<typeof normalizeRole>, requestedProfileId?: string | null) {
  if (targetRole === "super_admin") return null;
  if (context.isSuperAdmin) return requestedProfileId ?? null;
  return context.profileId;
}

// GET all visible users
export async function GET(request: NextRequest) {
  const guard = await requireTenantContext(request, {
    module: "users",
    action: "read",
    requireProfile: false,
    allowSuperAdminWithoutProfile: true,
  });
  if (!guard.ok) return guard.response;

  const { context } = guard;
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const role = searchParams.get("role");
  const active = searchParams.get("active");

  let query = supabase
    .from("admin_users")
    .select("id, username, email, full_name, phone, avatar_url, role, permissions, profile_id, is_active, last_login_at, login_count, created_at")
    .order("created_at", { ascending: false });

  if (!context.isSuperAdmin) {
    query = query.eq("profile_id", context.profileId);
    if (context.role === "manager") query = query.eq("role", "staff");
  }

  if (role) query = query.eq("role", role);
  if (active !== null) query = query.eq("is_active", active === "true");

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: rolePresets } = await supabase
    .from("role_presets")
    .select("*")
    .order("role");

  return NextResponse.json({ users: data, rolePresets });
}

// CREATE new user
export async function POST(request: NextRequest) {
  const guard = await requireTenantContext(request, {
    module: "users",
    action: "write",
    requireProfile: false,
    allowSuperAdminWithoutProfile: true,
  });
  if (!guard.ok) return guard.response;

  const { context } = guard;
  const supabase = await createClient();
  const body = await request.json();

  const {
    username,
    email,
    password,
    full_name,
    phone,
    avatar_url,
    role,
    permissions,
    is_active,
    profile_id,
  } = body;

  if (!username || !email || !password || !full_name) {
    return NextResponse.json(
      { error: "Username, email, password, and full name are required" },
      { status: 400 }
    );
  }

  const targetRole = normalizeRole(role || "staff");
  if (!canManageTargetRole(context.role, targetRole)) {
    return NextResponse.json({ error: "You cannot assign this role" }, { status: 403 });
  }

  const targetProfileId = resolveProfileForNewUser(context, targetRole, profile_id);
  if (targetRole !== "super_admin" && !targetProfileId) {
    return NextResponse.json({ error: "Account is required for this user" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("admin_users")
    .select("id, username, email")
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle();

  if (existing) {
    if (existing.username === username) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }
    if (existing.email === email) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
  }

  const { data: hashResult, error: hashError } = await supabase
    .rpc("hash_password", { password });

  if (hashError) {
    console.error("Error hashing password:", hashError);
    return NextResponse.json({ error: "Failed to hash password" }, { status: 500 });
  }

  const safePermissions = permissions && context.isSuperAdmin
    ? permissions
    : ROLE_PERMISSIONS[targetRole];

  const { data, error } = await supabase
    .from("admin_users")
    .insert([{
      username,
      email,
      password_hash: hashResult,
      full_name,
      phone: phone || null,
      avatar_url: avatar_url || null,
      role: targetRole,
      permissions: safePermissions || {},
      profile_id: targetProfileId,
      is_active: is_active !== false,
      created_by: context.user.id,
    }])
    .select("id, username, email, full_name, phone, avatar_url, role, permissions, profile_id, is_active, created_at")
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
