import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantContext } from "@/lib/tenant";

// GET /api/social/instagram/status — check connection
export async function GET(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "settings", action: "read" });
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("social_connections")
    .select("account_name, account_id, is_connected, token_expires_at, last_synced_at")
    .eq("profile_id", guard.context.profileId!)
    .eq("platform", "instagram")
    .order("created_at", { ascending: false })
    .limit(1);
  const data = rows?.[0] ?? null;

  if (!data?.is_connected) {
    return NextResponse.json({ connected: false });
  }

  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;

  return NextResponse.json({
    connected: !isExpired,
    expired: isExpired,
    username: data.account_name,
    accountId: data.account_id,
    expiresAt: data.token_expires_at,
    lastSynced: data.last_synced_at,
  });
}

// DELETE /api/social/instagram/status — disconnect
export async function DELETE(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "settings", action: "write" });
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  await supabase
    .from("social_connections")
    .update({
      is_connected: false,
      access_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", guard.context.profileId!)
    .eq("platform", "instagram");

  return NextResponse.json({ success: true });
}
