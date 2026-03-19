import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — check Facebook Messenger connection status
export async function GET() {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("social_connections")
    .select("account_name, account_id, page_id, is_connected, token_expires_at, last_synced_at")
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
export async function DELETE() {
  const supabase = createAdminClient();
  await supabase
    .from("social_connections")
    .update({ is_connected: false, access_token: null, updated_at: new Date().toISOString() })
    .eq("platform", "facebook");
  return NextResponse.json({ success: true });
}
