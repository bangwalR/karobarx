import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// GET /api/communities — list all communities
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const profileId = cookieStore.get("active_profile_id")?.value;

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch communities from database
    const { data: communities, error } = await supabase
      .from("whatsapp_communities")
      .select(`
        *,
        whatsapp_community_groups(count)
      `)
      .eq("profile_id", profileId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ communities: communities || [] });
  } catch (error: any) {
    console.error("[GET /api/communities] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch communities" },
      { status: 500 }
    );
  }
}

// POST /api/communities — create/sync community
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const profileId = cookieStore.get("active_profile_id")?.value;

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 401 });
    }

    const body = await req.json();
    const { community_id, name, description, icon_url, member_count, group_count } = body;

    if (!community_id || !name) {
      return NextResponse.json(
        { error: "community_id and name are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Upsert community
    const { data: community, error } = await supabase
      .from("whatsapp_communities")
      .upsert(
        {
          profile_id: profileId,
          community_id,
          name,
          description: description || null,
          icon_url: icon_url || null,
          member_count: member_count || 0,
          group_count: group_count || 0,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,community_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ community });
  } catch (error: any) {
    console.error("[POST /api/communities] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create community" },
      { status: 500 }
    );
  }
}
