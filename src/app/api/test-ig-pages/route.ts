import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/test-ig-pages - Fetch multiple pages from Instagram API
export async function GET() {
  const supabase = createAdminClient();

  const { data: rows } = await supabase
    .from("social_connections")
    .select("access_token, account_id")
    .eq("platform", "instagram")
    .eq("is_connected", true)
    .limit(1);

  const conn = rows?.[0];
  if (!conn) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  try {
    const url = new URL(`https://graph.instagram.com/v25.0/me/conversations`);
    url.searchParams.set("platform", "instagram");
    url.searchParams.set("fields", "id,participants,updated_time,messages.limit(1){message,created_time}");
    url.searchParams.set("limit", "25");
    url.searchParams.set("access_token", conn.access_token);

    const allConversations = [];
    let nextUrl: string | null = url.toString();
    let page = 0;

    while (nextUrl && page < 5) {
      const res = await fetch(nextUrl, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data.error) {
        return NextResponse.json({
          error: data.error?.message || "API error",
          page,
          allConversations,
        });
      }

      const batch = data.data || [];
      allConversations.push(...batch);
      
      nextUrl = data.paging?.next || null;
      page++;

      if (batch.length === 0) break;
    }

    return NextResponse.json({
      success: true,
      totalPages: page,
      totalConversations: allConversations.length,
      conversations: allConversations.slice(0, 10), // Show first 10
      sample: allConversations[0],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
