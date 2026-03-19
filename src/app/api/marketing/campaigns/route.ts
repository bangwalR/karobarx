import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/marketing/campaigns  — list all campaigns
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}

// POST /api/marketing/campaigns  — create a new campaign
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();

  const {
    name,
    description,
    message_template,
    media_url,
    media_type,
    media_caption,
    target_type,
    target_filter,
    delay_seconds,
    daily_limit,
    scheduled_at,
    recipient_ids, // array of customer IDs
  } = body;

  if (!name || !message_template) {
    return NextResponse.json({ error: "name and message_template required" }, { status: 400 });
  }

  // 1. Create campaign
  const { data: campaign, error: campErr } = await supabase
    .from("marketing_campaigns")
    .insert({
      name,
      description,
      message_template,
      media_url: media_url || null,
      media_type: media_type || "none",
      media_caption: media_caption || null,
      target_type: target_type || "selected",
      target_filter: target_filter || {},
      delay_seconds: delay_seconds || 20,
      daily_limit: daily_limit || 100,
      scheduled_at: scheduled_at || null,
      status: "draft",
    })
    .select()
    .single();

  if (campErr) return NextResponse.json({ error: campErr.message }, { status: 500 });

  // 2. Resolve recipients
  let customers: { id: string; phone: string; name: string }[] = [];

  if (target_type === "all") {
    const { data } = await supabase
      .from("customers")
      .select("id, phone, name")
      .not("phone", "is", null);
    customers = data || [];
  } else if (recipient_ids?.length) {
    const { data } = await supabase
      .from("customers")
      .select("id, phone, name")
      .in("id", recipient_ids);
    customers = data || [];
  }

  // 3. Insert recipients
  if (customers.length > 0) {
    const recipientRows = customers.map((c) => ({
      campaign_id: campaign.id,
      customer_id: c.id,
      phone: c.phone,
      name: c.name,
      status: "pending",
    }));

    await supabase.from("campaign_recipients").insert(recipientRows);

    await supabase
      .from("marketing_campaigns")
      .update({ total_recipients: customers.length })
      .eq("id", campaign.id);
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
