import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET  /api/marketing/instagram/campaigns  — list IG campaigns
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("channel", "instagram")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data || [] });
}

// POST /api/marketing/instagram/campaigns  — create IG campaign
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { name, description, message_template, delay_seconds, recipient_ids } = body;

  if (!name || !message_template)
    return NextResponse.json({ error: "name and message_template required" }, { status: 400 });
  if (!recipient_ids?.length)
    return NextResponse.json({ error: "Select at least one recipient" }, { status: 400 });

  // 1. Create campaign row
  const { data: campaign, error: campErr } = await supabase
    .from("marketing_campaigns")
    .insert({
      name,
      description,
      message_template,
      channel: "instagram",
      media_type: "none",
      delay_seconds: delay_seconds || 5,
      status: "draft",
      total_recipients: recipient_ids.length,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      failed_count: 0,
    })
    .select()
    .single();

  if (campErr || !campaign)
    return NextResponse.json({ error: campErr?.message || "Failed to create campaign" }, { status: 500 });

  // 2. Fetch lead info for selected recipient IDs
  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, platform_user_id, platform_username")
    .in("id", recipient_ids)
    .eq("source", "instagram")
    .not("platform_user_id", "is", null);

  if (!leads?.length) {
    await supabase.from("marketing_campaigns").delete().eq("id", campaign.id);
    return NextResponse.json({ error: "No valid Instagram leads found in selection" }, { status: 400 });
  }

  // 3. Insert campaign_recipients rows
  const recipientRows = leads.map((lead) => ({
    campaign_id: campaign.id,
    phone: lead.platform_username || lead.platform_user_id,
    name: lead.name,
    ig_user_id: lead.platform_user_id,
    status: "pending",
  }));

  await supabase.from("campaign_recipients").insert(recipientRows);

  // Update actual count (some leads may not have platform_user_id)
  await supabase
    .from("marketing_campaigns")
    .update({ total_recipients: leads.length })
    .eq("id", campaign.id);

  return NextResponse.json({ campaign: { ...campaign, total_recipients: leads.length } }, { status: 201 });
}
