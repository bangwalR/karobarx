import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hasPermission,
  normalizeRole,
  type AdminRole,
  type PermissionAction,
  type RolePermissionMap,
} from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

type Session = NonNullable<Awaited<ReturnType<typeof auth>>>;
type SessionUser = Session["user"];

export interface TenantContext {
  user: SessionUser;
  role: AdminRole;
  permissions?: RolePermissionMap;
  profileId: string | null;
  assignedProfileId: string | null;
  isSuperAdmin: boolean;
}

interface TenantGuardOptions {
  module?: string;
  action?: PermissionAction;
  requireProfile?: boolean;
  allowSuperAdminWithoutProfile?: boolean;
}

type TenantGuardResult =
  | { ok: true; context: TenantContext }
  | { ok: false; response: NextResponse };

export function getActiveProfileId(request: NextRequest): string | null {
  return request.cookies.get("active_profile_id")?.value ?? null;
}

function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

function unauthenticated() {
  return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
}

function missingProfile() {
  return NextResponse.json(
    { error: "No active account. Please log out and log back in." },
    { status: 401 }
  );
}

export async function requireTenantContext(
  request: NextRequest,
  options: TenantGuardOptions = {}
): Promise<TenantGuardResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, response: unauthenticated() };

  const role = normalizeRole(session.user.role);
  const permissions = session.user.permissions as RolePermissionMap | undefined;
  const isSuperAdmin = role === "super_admin";

  if (
    options.module &&
    !hasPermission(role, options.module, options.action ?? "read", permissions)
  ) {
    return { ok: false, response: forbidden() };
  }

  const assignedProfileId = session.user.profile_id ?? null;
  const activeProfileId = getActiveProfileId(request);
  let profileId = activeProfileId ?? assignedProfileId;

  if (!isSuperAdmin) {
    if (!assignedProfileId) {
      return { ok: false, response: missingProfile() };
    }

    if (activeProfileId && activeProfileId !== assignedProfileId) {
      return {
        ok: false,
        response: forbidden("Active account does not match your assigned account"),
      };
    }

    profileId = assignedProfileId;
  }

  const requireProfile = options.requireProfile ?? true;
  const allowSuperAdminWithoutProfile = options.allowSuperAdminWithoutProfile ?? false;

  if (requireProfile && !profileId && !(isSuperAdmin && allowSuperAdminWithoutProfile)) {
    return { ok: false, response: missingProfile() };
  }

  return {
    ok: true,
    context: {
      user: session.user,
      role,
      permissions,
      profileId,
      assignedProfileId,
      isSuperAdmin,
    },
  };
}

export async function canAccessProfile(profileId: string, user: SessionUser) {
  const role = normalizeRole(user.role);
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("business_config")
    .select("id, owner_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return false;
  if (role === "super_admin") return true;
  if (user.profile_id === profileId) return true;
  return profile.owner_id === user.id && !user.profile_id;
}

export function canManageTargetRole(actorRole: AdminRole, targetRole: AdminRole) {
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin") return targetRole !== "super_admin";
  if (actorRole === "manager") return targetRole === "staff";
  return false;
}

export function canEditTargetUser(
  actor: TenantContext,
  target: { id: string; role: string | null; profile_id: string | null }
) {
  const targetRole = normalizeRole(target.role);

  if (actor.isSuperAdmin) return true;
  if (!actor.profileId || target.profile_id !== actor.profileId) return false;
  if (targetRole === "super_admin") return false;
  if (actor.role === "admin") return true;
  return actor.role === "manager" && targetRole === "staff";
}
