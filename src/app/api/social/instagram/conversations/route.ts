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
  
  // Get active profile ID from cookie for security
  const profileId = req.cookies.get("active_profile_id")?.value;
  
  // Even if Instagram is not connected, we can still show leads from database
  const supabase = createAdminClient();
  
  // Fetch Instagram leads from database - last 60 days (covers current and previous month)
  const now = new Date();
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, name, platform_user_id, platform_username, source, profile_id, created_at, updated_at, last_contacted_at")
    .eq("source", "instagram")
    .not("platform_user_id", "is", null)
    .gte("updated_at", sixtyDaysAgo.toISOString())
    .order("updated_at", { ascending: false })
    .limit(100);
  
  console.log("[IG conversations] Leads query result:", {
    profileId,
    leadsCount: leads?.length || 0,
    error: leadsError?.message,
    firstLead: leads?.[0],
    dateRange: `Last 60 days (since ${sixtyDaysAgo.toISOString().split('T')[0]})`,
    currentDate: now.toISOString().split('T')[0]
  });

  // If Instagram is not connected, return only leads
  if (!conn?.access_token) {
    const leadConversations = (leads || []).map(lead => ({
      id: `lead_${lead.id}`,
      name: lead.name || lead.platform_username || "Instagram Lead",
      igUserId: lead.platform_user_id!,
      lastMessage: "New lead from Instagram",
      lastMessageTime: lead.updated_at || lead.created_at,
      lastMessageFromMe: false,
      unreadCount: 1,
      isLead: true,
    }));

    console.log("[IG conversations] No Instagram connection, returning leads only:", {
      profileId,
      leadsCount: leadConversations.length,
      leads: leadConversations.map(l => ({ id: l.id, name: l.name, igUserId: l.igUserId }))
    });

    return NextResponse.json({
      conversations: leadConversations,
      connectedAs: null,
      lastUpdated: null,
      incremental: false,
      leadsOnly: true, // Flag to indicate only leads are shown
      debug: {
        profileId,
        leadsCount: leadConversations.length,
        hasConnection: false
      }
    });
  }

  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;

  try {
    const url = new URL(`https://graph.instagram.com/v25.0/me/conversations`);
    url.searchParams.set("platform", "instagram");
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
        // If API fails, still return leads
        const leadConversations = (leads || []).map(lead => ({
          id: `lead_${lead.id}`,
          name: lead.name || lead.platform_username || "Instagram Lead",
          igUserId: lead.platform_user_id!,
          lastMessage: "New lead from Instagram",
          lastMessageTime: lead.updated_at || lead.created_at,
          lastMessageFromMe: false,
          unreadCount: 1,
          isLead: true,
        }));

        return NextResponse.json({
          conversations: leadConversations,
          connectedAs: conn.account_name,
          lastUpdated: null,
          incremental: false,
          leadsOnly: true,
          apiError: data.error?.message || "Graph API error",
        });
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

    // Add leads as conversations if they don't already exist
    const existingUserIds = new Set(conversations.map(c => c.igUserId));
    const leadConversations = (leads || [])
      .filter(lead => lead.platform_user_id && !existingUserIds.has(lead.platform_user_id))
      .map(lead => ({
        id: `lead_${lead.id}`,
        name: lead.name || lead.platform_username || "Instagram Lead",
        igUserId: lead.platform_user_id!,
        lastMessage: "New lead from Instagram",
        lastMessageTime: lead.updated_at || lead.created_at,
        lastMessageFromMe: false,
        unreadCount: 1,
        isLead: true,
      }));

    // Merge conversations and leads, sort by time
    const allConversations = [...conversations, ...leadConversations].sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({
      conversations: allConversations,
      connectedAs: conn.account_name,
      lastUpdated,
      incremental: !!sinceDate,
      leadsOnly: false,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[IG conversations] Error:", msg);
    
    // Even on error, return leads
    const leadConversations = (leads || []).map(lead => ({
      id: `lead_${lead.id}`,
      name: lead.name || lead.platform_username || "Instagram Lead",
      igUserId: lead.platform_user_id!,
      lastMessage: "New lead from Instagram",
      lastMessageTime: lead.updated_at || lead.created_at,
      lastMessageFromMe: false,
      unreadCount: 1,
      isLead: true,
    }));

    return NextResponse.json({
      conversations: leadConversations,
      connectedAs: conn.account_name,
      lastUpdated: null,
      incremental: false,
      leadsOnly: true,
      error: msg,
    });
  }
}

