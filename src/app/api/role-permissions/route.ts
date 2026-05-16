import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeRole,
  ROLE_PERMISSIONS,
  type AdminRole,
  type RolePermissionMap,
} from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

const EDITABLE_ROLES: AdminRole[] = ["admin", "manager", "staff", "sales", "support", "viewer"];

function lockProtectedPermissions(role: AdminRole, permissions: RolePermissionMap) {
  if (role === "super_admin") return ROLE_PERMISSIONS.super_admin;

  return {
    ...permissions,
    users: ROLE_PERMISSIONS[role].users,
    credentials: { read: false, write: false, delete: false },
    settings: ROLE_PERMISSIONS[role].settings,
  };
}

async function requireSuperAdmin() {
  const session = await auth();
  return session?.user?.role === "super_admin";
}

export async function GET() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("role_presets")
    .select("role, display_name, description, permissions")
    .in("role", ["super_admin", ...EDITABLE_ROLES])
    .order("role");

  const presets: Record<AdminRole, RolePermissionMap> = {
    super_admin: ROLE_PERMISSIONS.super_admin,
    admin: ROLE_PERMISSIONS.admin,
    manager: ROLE_PERMISSIONS.manager,
    staff: ROLE_PERMISSIONS.staff,
    sales: ROLE_PERMISSIONS.sales,
    support: ROLE_PERMISSIONS.support,
    viewer: ROLE_PERMISSIONS.viewer,
  };

  for (const row of data || []) {
    const role = normalizeRole(row.role);
    presets[role] = lockProtectedPermissions(role, {
      ...ROLE_PERMISSIONS[role],
      ...(row.permissions || {}),
    });
  }

  return NextResponse.json({ success: true, presets, editableRoles: EDITABLE_ROLES });
}

export async function PUT(request: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json(
      { success: false, error: "Only super admins can change role permissions" },
      { status: 403 }
    );
  }

  const { role, permissions } = await request.json();
  const normalizedRole = normalizeRole(role);

  if (!EDITABLE_ROLES.includes(normalizedRole)) {
    return NextResponse.json(
      { success: false, error: "This role cannot be edited" },
      { status: 400 }
    );
  }

  const safePermissions = lockProtectedPermissions(normalizedRole, {
    ...ROLE_PERMISSIONS[normalizedRole],
    ...(permissions || {}),
  });

  const supabase = createAdminClient();
  const { error: presetError } = await supabase
    .from("role_presets")
    .upsert(
      {
        role: normalizedRole,
        display_name: normalizedRole.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: "Configured from Settings",
        permissions: safePermissions,
      },
      { onConflict: "role" }
    );

  if (presetError) {
    return NextResponse.json({ success: false, error: presetError.message }, { status: 500 });
  }

  const { error: usersError } = await supabase
    .from("admin_users")
    .update({ permissions: safePermissions })
    .eq("role", normalizedRole);

  if (usersError) {
    return NextResponse.json({ success: false, error: usersError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    role: normalizedRole,
    permissions: safePermissions,
  });
}
