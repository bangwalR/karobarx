import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getConnection() {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("social_connections")
    .select("access_token, account_id, account_name")
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .order("created_at", { ascending: false })
    .limit(1);
  return rows?.[0] ?? null;
}

// Fetch pages from a Graph API URL — stops early when `stopBefore` date is reached
async function fetchPages(
  initialUrl: string,
  maxPages: number,
  stopBefore?: Date
): Promise<Record<string, unknown>[]> {
  const allData: Record<string, unknown>[] = [];
  let nextUrl: string | null = initialUrl;
  let page = 0;

  while (nextUrl && page < maxPages) {
    const res: Response = await fetch(nextUrl, { cache: "no-store" });
    const json: { data?: Record<string, unknown>[]; paging?: { next?: string }; error?: unknown } = await res.json();
    if (!res.ok || json.error) break;
    const batch = json.data || [];
    if (!batch.length) break;
    allData.push(...batch);
    // Early stop: if the oldest item in this page is before stopBefore, no need to continue
    if (stopBefore) {
      const oldestInPage = batch[batch.length - 1] as { updated_time?: string };
      if (oldestInPage?.updated_time && new Date(oldestInPage.updated_time) <= stopBefore) break;
    }
    nextUrl = json.paging?.next || null;
    page++;
  }
  return allData;
}

// GET /api/social/instagram/conversations?since=ISO_TIMESTAMP
// `since` enables incremental sync — only returns conversations updated after that time
export async function GET(req: NextRequest) {
  const conn = await getConnection();
  if (!conn?.access_token) {
    return NextResponse.json(
      { error: "Instagram not connected", conversations: [] },
      { status: 503 }
    );
  }

  const since = req.nextUrl.searchParams.get("since"); // ISO timestamp from client
  const sinceDate = since ? new Date(since) : null;

  try {
    const url = new URL(`https://graph.instagram.com/v25.0/me/conversations`);
    url.searchParams.set("platform", "instagram");
    url.searchParams.set(
      "fields",
      "id,participants,updated_time,messages.limit(1){id,message,created_time,from}"
    );
    url.searchParams.set("limit", "25"); // 25 per page
    url.searchParams.set("access_token", conn.access_token);

    // Incremental: pass Unix timestamp so IG only returns recently updated convs
    if (sinceDate) {
      url.searchParams.set("since", Math.floor(sinceDate.getTime() / 1000).toString());
    }

    // Max 3 pages (75 convs) on full load; 2 pages on incremental (recently updated only)
    const maxPages = sinceDate ? 2 : 3;
    const allConvs = await fetchPages(url.toString(), maxPages, sinceDate ?? undefined);

    // On first load with no results, surface any API errors
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

    // Filter by since date client-side (in case IG returns a few extras)
    const filtered = sinceDate
      ? allConvs.filter((c) => {
          const t = c.updated_time as string | undefined;
          return t ? new Date(t) > sinceDate : false;
        })
      : allConvs;

    // Track the newest updated_time to return to client for next incremental call
    let lastUpdated: string | null = null;
    const conversations = filtered.map((conv) => {
      const participants = conv.participants as { data: { id: string; name?: string; username?: string }[] } | undefined;
      const messages = conv.messages as { data: { id: string; message?: string; created_time?: string; from?: { id: string } }[] } | undefined;
      const lastMsg = messages?.data?.[0];
      const other = participants?.data?.find((p) => p.id !== conn.account_id)
        || participants?.data?.[0];
      const updatedTime = (conv.updated_time as string) || null;
      if (updatedTime && (!lastUpdated || updatedTime > lastUpdated)) lastUpdated = updatedTime;
      return {
        id: conv.id as string,
        name: other?.name || other?.username || "Instagram User",
        igUserId: other?.id || "",
        lastMessage: lastMsg?.message || "",
        lastMessageTime: lastMsg?.created_time || updatedTime,
        lastMessageFromMe: lastMsg?.from?.id === conn.account_id,
        unreadCount: 0,
      };
    });

    return NextResponse.json({
      conversations,
      connectedAs: conn.account_name,
      lastUpdated,          // client stores this and passes as `since` on next refresh
      incremental: !!sinceDate,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[IG conversations] Error:", msg);
    return NextResponse.json({ error: msg, conversations: [] }, { status: 500 });
  }
}
