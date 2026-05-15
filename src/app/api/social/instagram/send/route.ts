import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantContext } from "@/lib/tenant";

// POST /api/social/instagram/send
export async function POST(req: NextRequest) {
  const guard = await requireTenantContext(req, { module: "conversations", action: "write" });
  if (!guard.ok) return guard.response;

  const { recipientId, message } = await req.json();

  if (!recipientId || !message?.trim()) {
    return NextResponse.json(
      { error: "recipientId and message are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("social_connections")
    .select("access_token, account_id")
    .eq("profile_id", guard.context.profileId!)
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const conn = rows?.[0] ?? null;

  if (!conn?.access_token) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 503 });
  }

  try {
    const url = new URL(`https://graph.instagram.com/v25.0/${conn.account_id}/messages`);
    url.searchParams.set("access_token", conn.access_token);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message.trim() },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Send failed" },
        { status: res.status }
      );
    }
    return NextResponse.json({ success: true, messageId: data.message_id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
