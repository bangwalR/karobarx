import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// POST /api/marketing/campaigns/[id]/resume
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: campaign } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Fetch still-pending/sending recipients
  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("*")
    .eq("campaign_id", id)
    .in("status", ["pending", "sending"]);

  if (recipients?.length) {
    const recipientPayload = recipients.map((r) => {
      const finalMessage = (campaign.message_template as string)
        .replace(/\{\{name\}\}/gi, r.name || "there")
        .replace(/\{\{phone\}\}/gi, r.phone);
      return {
        phone: r.phone,
        message: finalMessage,
        mediaUrl: campaign.media_url || undefined,
        caption: campaign.media_caption || undefined,
      };
    });

    // Try resume first, fall back to restart
    const resumeRes = await fetch(`${WA_BACKEND}/campaign/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: id }),
    }).catch(() => null);

    if (!resumeRes || !resumeRes.ok) {
      await fetch(`${WA_BACKEND}/campaign/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id, recipients: recipientPayload, delaySeconds: campaign.delay_seconds || 20 }),
      }).catch(() => {});
    }
  }

  await supabase
    .from("marketing_campaigns")
    .update({ status: "running" })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
