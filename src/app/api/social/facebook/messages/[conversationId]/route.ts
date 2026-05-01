import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantContext } from "@/lib/tenant";

type RawMsg = {
  id: string;
  message?: string;
  created_time: string;
  from?: { id: string; name?: string; email?: string };
  attachments?: { data: { image_data?: { url?: string }; file_url?: string; type?: string }[] };
};

const PAGE_SIZE = 25;

// GET /api/social/facebook/messages/[conversationId]?cursor=CURSOR
// cursor: optional — fetches older messages when provided
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const guard = await requireTenantContext(req, { module: "conversations", action: "read" });
  if (!guard.ok) return guard.response;

  const { conversationId } = await params;
  const cursor = req.nextUrl.searchParams.get("cursor") || null;

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("social_connections")
    .select("access_token, account_id, page_id")
    .eq("profile_id", guard.context.profileId!)
    .eq("platform", "facebook")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const conn = rows?.[0] ?? null;

  if (!conn?.access_token)
    return NextResponse.json({ error: "Facebook not connected", messages: [] }, { status: 503 });

  const pageId = conn.page_id || conn.account_id;

  try {
    let rawMessages: RawMsg[] = [];
    let nextCursor: string | null = null;

    if (cursor) {
      // Load older messages using the cursor
      const url = new URL(`https://graph.facebook.com/v21.0/${conversationId}/messages`);
      url.searchParams.set("after", cursor);
      url.searchParams.set("limit", PAGE_SIZE.toString());
      url.searchParams.set("fields", "id,message,created_time,from,attachments");
      url.searchParams.set("access_token", conn.access_token);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok)
        return NextResponse.json(
          { error: data.error?.message || "Graph API error", messages: [] },
          { status: res.status }
        );

      rawMessages = data.data || [];
      nextCursor =
        data.paging?.cursors?.after ||
        (data.paging?.next ? new URL(data.paging.next).searchParams.get("after") : null);
    } else {
      // First page — latest PAGE_SIZE messages via conversation field expansion
      const url = new URL(`https://graph.facebook.com/v21.0/${conversationId}`);
      url.searchParams.set(
        "fields",
        `messages.limit(${PAGE_SIZE}){id,message,created_time,from,attachments}`
      );
      url.searchParams.set("access_token", conn.access_token);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok)
        return NextResponse.json(
          { error: data.error?.message || "Graph API error", messages: [] },
          { status: res.status }
        );

      rawMessages = data.messages?.data || [];
      nextCursor =
        data.messages?.paging?.cursors?.after ||
        (data.messages?.paging?.next
          ? new URL(data.messages.paging.next).searchParams.get("after")
          : null);
    }

    const messages = rawMessages
      .map((msg: RawMsg) => ({
        id: msg.id,
        body: msg.message || "",
        fromMe: msg.from?.id === pageId,
        fromName: msg.from?.name || msg.from?.email || "User",
        type: msg.attachments?.data?.length ? "media" : "chat",
        hasMedia: !!(msg.attachments?.data?.length),
        mediaUrl:
          msg.attachments?.data?.[0]?.image_data?.url ||
          msg.attachments?.data?.[0]?.file_url ||
          null,
        timestamp: msg.created_time,
        ack: 3,
      }))
      .reverse(); // oldest first for display

    return NextResponse.json({
      messages,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg, messages: [] }, { status: 500 });
  }
}
