import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// POST /api/marketing/campaigns/[id]/send — launch the campaign
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: campaign, error: campErr } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (campErr || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status === "running") return NextResponse.json({ error: "Already running" }, { status: 409 });

  // Fetch pending recipients
  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("*")
    .eq("campaign_id", id)
    .eq("status", "pending");

  if (!recipients?.length) {
    return NextResponse.json({ error: "No pending recipients" }, { status: 400 });
  }

  // Build recipient payload with personalised messages
  const recipientPayload = recipients.map((r) => {
    const finalMessage = (campaign.message_template as string)
      .replace(/\{\{name\}\}/gi, r.name || "there")
      .replace(/\{\{phone\}\}/gi, r.phone);

    return {
      phone: r.phone,
      message: finalMessage,
      mediaUrl: campaign.media_url || undefined,
      caption: campaign.media_caption
        ? (campaign.media_caption as string)
            .replace(/\{\{name\}\}/gi, r.name || "there")
            .replace(/\{\{phone\}\}/gi, r.phone)
        : undefined,
    };
  });

  // Update recipients to "sending" and campaign to "running"
  await supabase
    .from("campaign_recipients")
    .update({ status: "sending" })
    .eq("campaign_id", id)
    .eq("status", "pending");

  await supabase
    .from("marketing_campaigns")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", id);

  // Fire off to WA backend
  const waRes = await fetch(`${WA_BACKEND}/campaign/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignId: id,
      recipients: recipientPayload,
      delaySeconds: campaign.delay_seconds || 20,
    }),
  }).catch((err) => ({ ok: false, json: async () => ({ error: err.message }) }));

  if (!waRes.ok) {
    // Revert status
    await supabase
      .from("marketing_campaigns")
      .update({ status: "paused" })
      .eq("id", id);
    await supabase
      .from("campaign_recipients")
      .update({ status: "pending" })
      .eq("campaign_id", id)
      .eq("status", "sending");

    const err = await (waRes as Response).json();
    return NextResponse.json({ error: err.error || "WA backend error" }, { status: 502 });
  }

  return NextResponse.json({ success: true, sent_to: recipientPayload.length });
}
