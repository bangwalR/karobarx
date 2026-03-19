import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/marketing/instagram/campaigns/[id]/send
// Sends DMs to all pending recipients one by one with a delay
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // 1. Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("id", id)
    .eq("channel", "instagram")
    .single();

  if (campErr || !campaign)
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  if (campaign.status === "running")
    return NextResponse.json({ error: "Campaign already running" }, { status: 409 });

  // 2. Get Instagram connection
  const { data: connRows } = await supabase
    .from("social_connections")
    .select("access_token, account_id")
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const conn = connRows?.[0];
  if (!conn?.access_token)
    return NextResponse.json({ error: "Instagram not connected" }, { status: 503 });

  // 3. Get pending recipients
  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("id, name, ig_user_id, phone")
    .eq("campaign_id", id)
    .in("status", ["pending", "failed"])
    .order("id");

  if (!recipients?.length)
    return NextResponse.json({ error: "No pending recipients" }, { status: 400 });

  // 4. Mark campaign as running
  await supabase
    .from("marketing_campaigns")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", id);

  const delayMs = (campaign.delay_seconds || 5) * 1000;
  let sentCount = campaign.sent_count || 0;
  let failedCount = campaign.failed_count || 0;

  // 5. Send messages with delay — run in background (don't await full loop)
  (async () => {
    for (const recipient of recipients) {
      const igUserId = recipient.ig_user_id || recipient.phone;
      if (!igUserId) {
        await supabase.from("campaign_recipients").update({
          status: "skipped", error_message: "No Instagram user ID"
        }).eq("id", recipient.id);
        failedCount++;
        continue;
      }

      // Personalise template — {{username}} uses the stored platform_username (in phone field)
      const username = recipient.phone?.startsWith("@") ? recipient.phone.slice(1) : (recipient.phone || "");
      const message = campaign.message_template
        .replace(/\{\{name\}\}/gi, recipient.name || "there")
        .replace(/\{\{username\}\}/gi, username);

      try {
        const url = `https://graph.instagram.com/v25.0/${conn.account_id}/messages?access_token=${encodeURIComponent(conn.access_token)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: igUserId },
            message: { text: message },
            messaging_type: "RESPONSE",
          }),
        });
        const data = await res.json();

        if (res.ok && data.message_id) {
          sentCount++;
          await supabase.from("campaign_recipients").update({
            status: "sent",
            sent_at: new Date().toISOString(),
          }).eq("id", recipient.id);
        } else {
          failedCount++;
          // Translate common Instagram API errors into plain English
          let errMsg = data.error?.message || "Unknown error";
          const subcode = data.error?.error_subcode;
          if (subcode === 2018109 || errMsg.toLowerCase().includes("window") || errMsg.includes("समयावधि")) {
            errMsg = "Outside 24-hour window — user must message you first within 24h";
          } else if (subcode === 2018047) {
            errMsg = "User cannot receive messages (they may have restricted DMs)";
          } else if (data.error?.code === 190) {
            errMsg = "Access token expired — reconnect Instagram in Settings";
          }
          await supabase.from("campaign_recipients").update({
            status: "failed",
            error_message: errMsg,
          }).eq("id", recipient.id);
        }
      } catch (e: unknown) {
        failedCount++;
        await supabase.from("campaign_recipients").update({
          status: "failed",
          error_message: String(e),
        }).eq("id", recipient.id);
      }

      // Update stats after each message
      await supabase.from("marketing_campaigns").update({
        sent_count: sentCount,
        failed_count: failedCount,
      }).eq("id", id);

      // Delay before next message (skip after last)
      if (recipient !== recipients[recipients.length - 1]) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    // Mark complete
    await supabase.from("marketing_campaigns").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
    }).eq("id", id);
  })();

  // Return immediately — sending continues in background
  return NextResponse.json({
    success: true,
    campaignId: id,
    totalRecipients: recipients.length,
    delaySeconds: campaign.delay_seconds || 5,
    message: `Campaign started — sending ${recipients.length} DMs with ${campaign.delay_seconds || 5}s delay`,
  });
}
