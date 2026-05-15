import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantContext } from "@/lib/tenant";

// GET — check Facebook Messenger connection status
export async function GET(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "settings", action: "read" });
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("social_connections")
    .select("account_name, account_id, page_id, is_connected, token_expires_at, last_synced_at")
    .eq("profile_id", guard.context.profileId!)
    .eq("platform", "facebook")
    .order("created_at", { ascending: false })
    .limit(1);

  const data = rows?.[0] ?? null;
  if (!data?.is_connected) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected: true,
    pageName: data.account_name,
    pageId: data.account_id,
    expiresAt: data.token_expires_at,
    lastSynced: data.last_synced_at,
  });
}

// DELETE — disconnect Facebook
export async function DELETE(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "settings", action: "write" });
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  await supabase
    .from("social_connections")
    .update({ is_connected: false, access_token: null, updated_at: new Date().toISOString() })
    .eq("profile_id", guard.context.profileId!)
    .eq("platform", "facebook");
  return NextResponse.json({ success: true });
}
