import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/marketing/campaigns/[id]/recipient-sent
// Called by WA backend after each message is sent or failed
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { phone, wa_message_id, status, error: errMsg } = await req.json();

  if (!phone || !status) {
    return NextResponse.json({ error: "phone and status required" }, { status: 400 });
  }

  const supabase = getSupabase();

  await supabase
    .from("campaign_recipients")
    .update({
      status,
      wa_message_id: wa_message_id || null,
      error_message: errMsg || null,
      sent_at: status === "sent" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("campaign_id", id)
    .eq("phone", phone);

  // Refresh campaign stats
  try { await supabase.rpc("refresh_campaign_stats", { p_campaign_id: id }); } catch (_) {}

  return NextResponse.json({ success: true });
}
