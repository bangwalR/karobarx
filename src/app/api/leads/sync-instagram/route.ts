import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/leads/sync-instagram
// Fetches all Instagram DM conversations and upserts participants as leads
export async function POST() {
  const supabase = createAdminClient();

  // 1. Get Instagram connection
  const { data: rows } = await supabase
    .from("social_connections")
    .select("access_token, account_id, account_name")
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const conn = rows?.[0];
  if (!conn?.access_token) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 503 });
  }

  // 2. Fetch conversations from Graph API
  const url = new URL(`https://graph.instagram.com/v25.0/me/conversations`);
  url.searchParams.set("platform", "instagram");
  url.searchParams.set("fields", "id,participants,updated_time,messages.limit(1){id,message,created_time,from}");
  url.searchParams.set("limit", "100"); // fetch up to 100 conversations per page
  url.searchParams.set("access_token", conn.access_token);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();

  if (!res.ok || data.error) {
    return NextResponse.json({ error: data.error?.message || "Graph API error" }, { status: 502 });
  }

  // Paginate through ALL conversations
  const conversations = [...(data.data || [])];
  let nextUrl: string | null = data.paging?.next || null;
  let page = 0;
  while (nextUrl && page < 10) {
    const pageRes = await fetch(nextUrl, { cache: "no-store" });
    const pageData = await pageRes.json();
    if (!pageRes.ok || pageData.error) break;
    conversations.push(...(pageData.data || []));
    nextUrl = pageData.paging?.next || null;
    page++;
  }
  let synced = 0;
  let skipped = 0;

  for (const conv of conversations) {
    const participants = conv.participants?.data || [];
    // The "other" participant (not our own account)
    const other = participants.find(
      (p: { id: string; name?: string; username?: string }) =>
        p.id !== conn.account_id && String(p.id) !== String(conn.account_id)
    ) || participants[0];

    if (!other) continue;

    const lastMsg = conv.messages?.data?.[0];

    // Check if lead already exists
    const { data: existing } = await supabase
      .from("leads")
      .select("id, last_contacted_at")
      .eq("platform_user_id", other.id)
      .eq("source", "instagram")
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing lead with latest message and timestamp
      const updateData: {
        last_contacted_at: string;
        updated_at: string;
        notes?: string;
      } = {
        last_contacted_at: conv.updated_time || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Update notes with latest message if available
      if (lastMsg?.message) {
        updateData.notes = `Last message: "${lastMsg.message.slice(0, 200)}"`;
      }
      
      await supabase
        .from("leads")
        .update(updateData)
        .eq("id", existing[0].id);
      skipped++;
    } else {
      // Insert new lead
      const { error: insertError } = await supabase.from("leads").insert([{
        name: other.name || other.username || `Instagram User`,
        source: "instagram",
        platform_user_id: other.id,
        platform_username: other.username || null,
        status: "new",
        tags: ["instagram-dm"],
        notes: lastMsg?.message ? `Last message: "${lastMsg.message.slice(0, 200)}"` : null,
        last_contacted_at: conv.updated_time || new Date().toISOString(),
        metadata: { conversation_id: conv.id, ig_account: conn.account_name },
      }]);

      if (!insertError) synced++;
    }
  }

  return NextResponse.json({
    success: true,
    total: conversations.length,
    synced,
    skipped,
    message: `${synced} new leads added, ${skipped} already existed`,
  });
}
