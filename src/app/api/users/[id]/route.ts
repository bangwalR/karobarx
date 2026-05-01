import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { normalizeRole, ROLE_PERMISSIONS } from "@/lib/permissions";
import { canEditTargetUser, canManageTargetRole, requireTenantContext } from "@/lib/tenant";

async function loadTargetUser(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  return supabase
    .from("admin_users")
    .select("id, username, email, full_name, phone, avatar_url, role, permissions, profile_id, is_active, last_login_at, login_count, created_at")
    .eq("id", id)
    .maybeSingle();
}

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireTenantContext(request, {
    module: "users",
    action: "read",
    requireProfile: false,
    allowSuperAdminWithoutProfile: true,
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await loadTargetUser(supabase, id);

  if (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!canEditTargetUser(guard.context, data)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ user: data });
}

// UPDATE user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireTenantContext(request, {
    module: "users",
    action: "write",
    requireProfile: false,
    allowSuperAdminWithoutProfile: true,
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();
  const { data: target, error: targetError } = await loadTargetUser(supabase, id);

  if (targetError) {
    console.error("Error loading user:", targetError);
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!canEditTargetUser(guard.context, target)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const updates: Record<string, unknown> = {};

  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (full_name !== undefined) updates.full_name = full_name;
  if (phone !== undefined) updates.phone = phone || null;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url || null;
  if (is_active !== undefined) updates.is_active = is_active;

  if (role !== undefined) {
    const targetRole = normalizeRole(role);
    if (!canManageTargetRole(guard.context.role, targetRole)) {
      return NextResponse.json({ error: "You cannot assign this role" }, { status: 403 });
    }

    updates.role = targetRole;
    updates.permissions = guard.context.isSuperAdmin && permissions
      ? permissions
      : ROLE_PERMISSIONS[targetRole];
    updates.profile_id = targetRole === "super_admin"
      ? null
      : guard.context.isSuperAdmin
        ? profile_id ?? target.profile_id
        : guard.context.profileId;

    if (targetRole !== "super_admin" && !updates.profile_id) {
      return NextResponse.json({ error: "Account is required for this user" }, { status: 400 });
    }
  } else if (permissions !== undefined && guard.context.isSuperAdmin) {
    updates.permissions = permissions;
  }

  if (profile_id !== undefined && guard.context.isSuperAdmin && normalizeRole((updates.role as string | undefined) ?? target.role) !== "super_admin") {
    updates.profile_id = profile_id;
  }

  if (password) {
    const { data: hashResult, error: hashError } = await supabase
      .rpc("hash_password", { password });

    if (hashError) {
      console.error("Error hashing password:", hashError);
      return NextResponse.json({ error: "Failed to hash password" }, { status: 500 });
    }

    updates.password_hash = hashResult;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .update(updates)
    .eq("id", id)
    .select("id, username, email, full_name, phone, avatar_url, role, permissions, profile_id, is_active, created_at")
    .single();

  if (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireTenantContext(request, {
    module: "users",
    action: "delete",
    requireProfile: false,
    allowSuperAdminWithoutProfile: true,
  });
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const supabase = await createClient();
  const { data: target, error: targetError } = await loadTargetUser(supabase, id);

  if (targetError) {
    console.error("Error loading user:", targetError);
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!canEditTargetUser(guard.context, target)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (target.role === "super_admin") {
    const { count } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");

    if (count && count <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last super admin" },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
