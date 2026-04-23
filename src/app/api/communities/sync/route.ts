import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// POST /api/communities/sync — sync communities from WhatsApp
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const profileId = cookieStore.get("active_profile_id")?.value;

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 401 });
    }

    // Fetch communities from WhatsApp backend
    const waRes = await fetch(`${WA_BACKEND}/communities`);
    const waData = await waRes.json();

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waData.error || "Failed to fetch from WhatsApp" },
        { status: waRes.status }
      );
    }

    const communities = waData.communities || [];
    const supabase = await createClient();

    // Sync each community to database
    const synced = [];
    for (const comm of communities) {
      const { data, error } = await supabase
        .from("whatsapp_communities")
        .upsert(
          {
            profile_id: profileId,
            community_id: comm.id,
            name: comm.name,
            description: comm.description || null,
            member_count: comm.memberCount || 0,
            group_count: comm.groupCount || 0,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "profile_id,community_id" }
        )
        .select()
        .single();

      if (!error && data) {
        synced.push(data);
      }
    }

    return NextResponse.json({
      success: true,
      synced: synced.length,
      communities: synced,
    });
  } catch (error: any) {
    console.error("[POST /api/communities/sync] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync communities" },
      { status: 500 }
    );
  }
}
