import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantContext } from "@/lib/tenant";

type RawMsg = {
  id: string;
  message?: string;
  created_time: string;
  from?: { id: string; name?: string; username?: string };
  attachments?: { data: { image_data?: { url?: string } }[] };
};

const PAGE_SIZE = 25;

// GET /api/social/instagram/messages/[conversationId]?cursor=CURSOR
// cursor: optional — when present, fetches the NEXT (older) page of messages
// Returns: { messages, nextCursor, hasMore }
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const guard = await requireTenantContext(req, { module: "conversations", action: "read" });
  if (!guard.ok) return guard.response;

  const { conversationId } = await params;
  const cursor = req.nextUrl.searchParams.get("cursor") || null;
  const profileId = guard.context.profileId!;

  const supabase = createAdminClient();
  
  // Check if this is a lead conversation (starts with "lead_")
  if (conversationId.startsWith("lead_")) {
    const leadId = conversationId.replace("lead_", "");
    
    // Fetch lead details
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("profile_id", profileId)
      .single();
    
    if (!lead) {
      return NextResponse.json({ error: "Lead not found", messages: [] }, { status: 404 });
    }
    
    // Clean up the notes field - remove "Last message:" prefix and quotes
    let cleanMessage = lead.notes || "No conversation history available for this lead yet.";
    
    // Remove "Last message:" prefix (case insensitive)
    cleanMessage = cleanMessage.replace(/^Last message:\s*/i, '');
    
    // Remove surrounding quotes if present
    cleanMessage = cleanMessage.replace(/^["'](.*)["']$/, '$1');
    
    // For leads, show a message from YOUR side (the business)
    const messages = [
      {
        id: "lead-msg-1",
        body: cleanMessage,
        fromMe: true, // Changed to true - this is YOUR message to the lead
        fromName: "You",
        type: "chat",
        hasMedia: false,
        mediaUrl: null,
        timestamp: lead.last_contacted_at || lead.created_at,
        ack: 3,
      }
    ];
    
    return NextResponse.json({
      messages,
      nextCursor: null,
      hasMore: false,
      page: "latest",
      isLead: true,
      leadInfo: {
        name: lead.name,
        username: lead.platform_username,
        status: lead.status,
        source: lead.source,
        tags: lead.tags,
      }
    });
  }
  
  // For real Instagram conversations, use the Graph API
  const { data: rows } = await supabase
    .from("social_connections")
    .select("access_token, account_id")
    .eq("profile_id", profileId)
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const conn = rows?.[0] ?? null;

  if (!conn?.access_token) {
    return NextResponse.json({ error: "Instagram not connected", messages: [] }, { status: 503 });
  }

  try {
    let rawMessages: RawMsg[] = [];
    let nextCursor: string | null = null;

    if (cursor) {
      // Load older messages using the cursor from the previous page
      const url = new URL(`https://graph.instagram.com/v25.0/${conversationId}/messages`);
      url.searchParams.set("after", cursor);
      url.searchParams.set("limit", PAGE_SIZE.toString());
      url.searchParams.set("fields", "id,message,created_time,from,attachments{image_data}");
      url.searchParams.set("access_token", conn.access_token);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.message || "Graph API error", messages: [] },
          { status: res.status }
        );
      }

      rawMessages = data.data || [];
      // Extract next cursor for even older pages
      nextCursor =
        data.paging?.cursors?.after ||
        (data.paging?.next ? new URL(data.paging.next).searchParams.get("after") : null);
    } else {
      // First page — fetch latest PAGE_SIZE messages via conversation field expansion
      const url = new URL(`https://graph.instagram.com/v25.0/${conversationId}`);
      url.searchParams.set(
        "fields",
        `messages.limit(${PAGE_SIZE}){id,message,created_time,from,attachments{image_data}}`
      );
      url.searchParams.set("access_token", conn.access_token);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.message || "Graph API error", messages: [] },
          { status: res.status }
        );
      }

      rawMessages = data.messages?.data || [];
      // Extract cursor for older pages
      nextCursor =
        data.messages?.paging?.cursors?.after ||
        (data.messages?.paging?.next
          ? new URL(data.messages.paging.next).searchParams.get("after")
          : null);
    }

    // Map messages and reverse so oldest is first (for chronological display)
    const messages = rawMessages
      .map((msg: RawMsg) => ({
        id: msg.id,
        body: msg.message || "",
        fromMe: msg.from?.id === conn.account_id,
        fromName: msg.from?.name || msg.from?.username || "User",
        type: msg.attachments?.data?.length ? "media" : "chat",
        hasMedia: !!(msg.attachments?.data?.length),
        mediaUrl: msg.attachments?.data?.[0]?.image_data?.url || null,
        timestamp: msg.created_time,
        ack: 3,
      }))
      .reverse(); // newest-first from API → reverse to oldest-first for display

    return NextResponse.json({
      messages,
      nextCursor,           // pass back as ?cursor= to get older messages
      hasMore: !!nextCursor,
      page: cursor ? "older" : "latest",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg, messages: [] }, { status: 500 });
  }
}
