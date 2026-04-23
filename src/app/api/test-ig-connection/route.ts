import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/test-ig-connection - Test Instagram Graph API connection
export async function GET() {
  const supabase = createAdminClient();

  // Get Instagram connection
  const { data: rows } = await supabase
    .from("social_connections")
    .select("*")
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const conn = rows?.[0];
  
  if (!conn) {
    return NextResponse.json({ error: "No Instagram connection found" }, { status: 404 });
  }

  // Test the access token by calling Graph API
  try {
    const url = new URL(`https://graph.instagram.com/v25.0/me/conversations`);
    url.searchParams.set("platform", "instagram");
    url.searchParams.set("fields", "id,participants,updated_time");
    url.searchParams.set("limit", "5");
    url.searchParams.set("access_token", conn.access_token);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();

    return NextResponse.json({
      connectionInfo: {
        account_id: conn.account_id,
        account_name: conn.account_name,
        is_connected: conn.is_connected,
        created_at: conn.created_at,
        last_synced_at: conn.last_synced_at,
      },
      apiTest: {
        status: res.status,
        ok: res.ok,
        hasError: !!data.error,
        error: data.error,
        conversationsCount: data.data?.length || 0,
        conversations: data.data || [],
        paging: data.paging,
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
