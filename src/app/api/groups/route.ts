import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// GET /api/groups — list all groups
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const profileId = cookieStore.get("active_profile_id")?.value;

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 401 });
    }

    // Fetch groups from WhatsApp backend
    const waRes = await fetch(`${WA_BACKEND}/groups`);
    const waData = await waRes.json();

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waData.error || "Failed to fetch groups" },
        { status: waRes.status }
      );
    }

    return NextResponse.json({ groups: waData.groups || [] });
  } catch (error: any) {
    console.error("[GET /api/groups] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// POST /api/groups — create a new WhatsApp group
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const profileId = cookieStore.get("active_profile_id")?.value;

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 401 });
    }

    const body = await req.json();
    const { name, participants, description } = body;

    if (!name || !participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "name and participants array required" },
        { status: 400 }
      );
    }

    // Create group via WhatsApp backend
    const waRes = await fetch(`${WA_BACKEND}/groups/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, participants }),
    });

    const waData = await waRes.json();

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waData.error || "Failed to create group" },
        { status: waRes.status }
      );
    }

    // Update description if provided
    if (description && waData.group?.id) {
      await fetch(`${WA_BACKEND}/groups/${encodeURIComponent(waData.group.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      }).catch(() => {});
    }

    // Store in database
    const supabase = await createClient();
    const { data: community, error } = await supabase
      .from("whatsapp_communities")
      .insert({
        profile_id: profileId,
        community_id: waData.group.id,
        name: name,
        description: description || null,
        member_count: participants.length,
        group_count: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to save to database:", error);
      // Still return success since group was created in WhatsApp
    }

    return NextResponse.json({
      success: true,
      group: waData.group,
      community,
    });
  } catch (error: any) {
    console.error("[POST /api/groups] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create group" },
      { status: 500 }
    );
  }
}
