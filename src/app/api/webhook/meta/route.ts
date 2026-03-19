import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Meta (Facebook/Instagram) webhook for receiving leads from ads
export async function GET(request: NextRequest) {
  // Verification endpoint for Meta webhook setup
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "mobilehub_verify_token";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Meta webhook verified");
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    console.log("Meta webhook received:", JSON.stringify(body, null, 2));

    // Handle different webhook types
    const { object, entry } = body;

    if (object === "page" || object === "instagram") {
      for (const pageEntry of entry || []) {
        const pageId: string | undefined = pageEntry.id;

        // Handle messaging — Facebook Messenger (object="page") or Instagram DMs (object="instagram")
        if (pageEntry.messaging) {
          for (const messagingEvent of pageEntry.messaging) {
            await handleMessagingWebhook(supabase, messagingEvent, object, pageId);
          }
        }

        if (pageEntry.changes) {
          for (const change of pageEntry.changes) {
            // Lead Ads
            if (change.field === "leadgen") {
              await handleLeadgenWebhook(supabase, change.value, object);
            }
            // Feed (comments, mentions)
            if (change.field === "feed" || change.field === "mentions") {
              await handleFeedWebhook(supabase, change.value, object);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Meta webhook:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function handleLeadgenWebhook(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: {
    leadgen_id: string;
    page_id: string;
    form_id: string;
    ad_id?: string;
    created_time: number;
  },
  platform: string
) {
  // In production, you would fetch lead details from Meta API using leadgen_id
  // For now, we store the lead reference
  const leadData = {
    source: platform === "instagram" ? "instagram" : "facebook",
    source_campaign: `Lead Ad ${data.form_id}`,
    source_post_id: data.ad_id || data.form_id,
    platform_user_id: data.leadgen_id,
    status: "new",
    metadata: {
      leadgen_id: data.leadgen_id,
      page_id: data.page_id,
      form_id: data.form_id,
      ad_id: data.ad_id,
      created_time: data.created_time,
    },
  };

  const { error } = await supabase.from("leads").insert([leadData]);

  if (error) {
    console.error("Error saving lead from webhook:", error);
  }
}

async function handleMessagingWebhook(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: {
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: { mid: string; text: string };
    postback?: { payload: string };
  },
  platform: string,
  pageId?: string
) {
  const senderId = event.sender.id;
  const recipientId = event.recipient.id;
  const messageText = event.message?.text;

  // Determine which side is the page (our side)
  const isFromUser = pageId ? senderId !== pageId : true;

  if (!isFromUser) {
    // Message sent by us — nothing to do
    return;
  }

  if (platform === "page") {
    // Facebook Messenger — bump last_synced_at to null so next poll re-fetches
    await supabase
      .from("social_connections")
      .update({ last_synced_at: null })
      .eq("platform", "facebook")
      .eq("is_connected", true);
  }

  if (platform === "instagram") {
    // Instagram DM — bump last_synced_at to null so next poll re-fetches
    await supabase
      .from("social_connections")
      .update({ last_synced_at: null })
      .eq("platform", "instagram")
      .eq("is_connected", true);
  }

  if (!messageText) return;

  // Upsert lead for new contacts
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("platform_user_id", senderId)
    .maybeSingle();

  if (!existingLead) {
    const source = platform === "instagram" ? "instagram" : "facebook";
    await supabase.from("leads").insert([{
      source,
      platform_user_id: senderId,
      status: "new",
      notes: `First message: ${messageText}`,
      metadata: {
        first_message: messageText,
        timestamp: event.timestamp,
        recipient_id: recipientId,
      },
    }]);
  }
}

async function handleFeedWebhook(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: {
    from: { id: string; name?: string };
    post_id?: string;
    comment_id?: string;
    message?: string;
    item?: string;
    verb?: string;
  },
  platform: string
) {
  // Handle comments and mentions as potential leads
  if (data.verb === "add" && (data.item === "comment" || data.item === "mention")) {
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("platform_user_id", data.from.id)
      .single();

    if (!existingLead) {
      const leadData = {
        name: data.from.name,
        source: platform === "instagram" ? "instagram" : "facebook",
        platform_user_id: data.from.id,
        source_post_id: data.post_id,
        status: "new",
        notes: `${data.item}: ${data.message || ""}`,
        metadata: {
          type: data.item,
          post_id: data.post_id,
          comment_id: data.comment_id,
          message: data.message,
        },
      };

      await supabase.from("leads").insert([leadData]);
    }
  }
}
