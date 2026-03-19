import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/social/facebook/send
// Send a Messenger message to a recipient via the Page Access Token
export async function POST(req: NextRequest) {
  const { recipientId, message } = await req.json();
  if (!recipientId || !message?.trim())
    return NextResponse.json({ error: "recipientId and message are required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("social_connections")
    .select("access_token, account_id, page_id")
    .eq("platform", "facebook")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const conn = rows?.[0] ?? null;
  if (!conn?.access_token)
    return NextResponse.json({ error: "Facebook not connected" }, { status: 503 });

  const pageId = conn.page_id || conn.account_id;

  try {
    const url = `https://graph.facebook.com/v21.0/${pageId}/messages?access_token=${encodeURIComponent(conn.access_token)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message.trim() },
        messaging_type: "RESPONSE",
      }),
    });
    const data = await res.json();
    if (!res.ok)
      return NextResponse.json({ error: data.error?.message || "Send failed" }, { status: res.status });
    return NextResponse.json({ success: true, messageId: data.message_id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
