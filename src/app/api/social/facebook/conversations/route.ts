import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getConnection() {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("social_connections")
    .select("access_token, account_id, page_id, account_name")
    .eq("platform", "facebook")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);
  return rows?.[0] ?? null;
}

async function fetchPages(
  initialUrl: string,
  maxPages: number,
  stopBefore?: Date
): Promise<Record<string, unknown>[]> {
  const allData: Record<string, unknown>[] = [];
  let nextUrl: string | null = initialUrl;
  let page = 0;
  while (nextUrl && page < maxPages) {
    const res = await fetch(nextUrl, { cache: "no-store" });
    const json: { data?: Record<string, unknown>[]; paging?: { next?: string }; error?: unknown } =
      await res.json();
    if (!res.ok || json.error) break;
    const batch = json.data || [];
    if (!batch.length) break;
    allData.push(...batch);
    if (stopBefore) {
      const oldest = batch[batch.length - 1] as { updated_time?: string };
      if (oldest?.updated_time && new Date(oldest.updated_time) <= stopBefore) break;
    }
    nextUrl = json.paging?.next || null;
    page++;
  }
  return allData;
}

// GET /api/social/facebook/conversations?since=ISO_TIMESTAMP
// Incremental sync — only returns conversations updated after `since`
export async function GET(req: NextRequest) {
  const conn = await getConnection();
  if (!conn?.access_token) {
    return NextResponse.json({ error: "Facebook not connected", conversations: [] }, { status: 503 });
  }

  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;
  const pageId = conn.page_id || conn.account_id;

  try {
    const url = new URL(`https://graph.facebook.com/v21.0/${pageId}/conversations`);
    url.searchParams.set("platform", "messenger");
    url.searchParams.set(
      "fields",
      "id,participants,updated_time,messages.limit(1){id,message,created_time,from}"
    );
    url.searchParams.set("limit", "25");
    url.searchParams.set("access_token", conn.access_token);

    if (sinceDate) {
      url.searchParams.set("since", Math.floor(sinceDate.getTime() / 1000).toString());
    }

    const maxPages = sinceDate ? 2 : 3;
    const allConvs = await fetchPages(url.toString(), maxPages, sinceDate ?? undefined);

    if (!allConvs.length && !sinceDate) {
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.message || "Graph API error", conversations: [] },
          { status: res.status }
        );
      }
    }

    const filtered = sinceDate
      ? allConvs.filter((c) => {
          const t = c.updated_time as string | undefined;
          return t ? new Date(t) > sinceDate : false;
        })
      : allConvs;

    let lastUpdated: string | null = null;
    const conversations = filtered.map((conv) => {
      const participants = conv.participants as {
        data: { id: string; name?: string; email?: string }[];
      } | undefined;
      const messages = conv.messages as {
        data: { id: string; message?: string; created_time?: string; from?: { id: string } }[];
      } | undefined;
      const lastMsg = messages?.data?.[0];
      // The "other" participant is not the page
      const other =
        participants?.data?.find((p) => p.id !== pageId) || participants?.data?.[0];
      const updatedTime = (conv.updated_time as string) || null;
      if (updatedTime && (!lastUpdated || updatedTime > lastUpdated)) lastUpdated = updatedTime;
      return {
        id: conv.id as string,
        name: other?.name || other?.email || "Messenger User",
        fbUserId: other?.id || "",
        lastMessage: lastMsg?.message || "",
        lastMessageTime: lastMsg?.created_time || updatedTime,
        lastMessageFromMe: lastMsg?.from?.id === pageId,
        unreadCount: 0,
      };
    });

    return NextResponse.json({
      conversations,
      connectedAs: conn.account_name,
      lastUpdated,
      incremental: !!sinceDate,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[FB conversations] Error:", msg);
    return NextResponse.json({ error: msg, conversations: [] }, { status: 500 });
  }
}
