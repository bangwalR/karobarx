import { NextRequest } from "next/server";

/**
 * Reads the active profile ID from the request.
 *
 * The account context must come from the httpOnly cookie set by the server.
 * Do not accept profile/account IDs from query params or headers for normal
 * app APIs; those are caller-controlled and can bypass tenant isolation.
 *
 * Returns null when no profile is scoped.
 */
export function getProfileId(request: NextRequest): string | null {
  return request.cookies.get("active_profile_id")?.value ?? null;
}
