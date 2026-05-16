import { requireTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function requireInternalRouteAccess(request: NextRequest) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const providedSecret = request.headers.get("x-internal-secret");

  if (internalSecret && providedSecret === internalSecret) {
    return { ok: true as const };
  }

  const guard = await requireTenantContext(request, {
    requireProfile: false,
    allowSuperAdminWithoutProfile: true,
  });

  if (!guard.ok) return guard;

  if (!guard.context.isSuperAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, context: guard.context };
}
