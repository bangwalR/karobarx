import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/webhook/whatsapp-ack
// Called by WA backend when message delivery status changes
export async function POST(req: NextRequest) {
  const { wa_message_id, status, timestamp } = await req.json();

  if (!wa_message_id || !status) {
    return NextResponse.json({ error: "wa_message_id and status required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Find the recipient with this message ID
  const { data: recipient } = await supabase
    .from("campaign_recipients")
    .select("id, campaign_id")
    .eq("wa_message_id", wa_message_id)
    .maybeSingle();

  if (recipient) {
    const updates: Record<string, string> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "delivered") updates.delivered_at = timestamp || new Date().toISOString();
    if (status === "read") updates.read_at = timestamp || new Date().toISOString();

    await supabase
      .from("campaign_recipients")
      .update(updates)
      .eq("id", recipient.id);

    // Refresh campaign stats
    try { await supabase.rpc("refresh_campaign_stats", { p_campaign_id: recipient.campaign_id }); } catch (_) {}
  }

  // Also update whatsapp_messages table if there's an entry
  try {
    await supabase
      .from("whatsapp_messages")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("message_id", wa_message_id);
  } catch (_) {}

  return NextResponse.json({ success: true });
}
