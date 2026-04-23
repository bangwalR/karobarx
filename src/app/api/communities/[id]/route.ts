import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// GET /api/communities/[id] — get community details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const profileId = cookieStore.get("active_profile_id")?.value;

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch community with groups and members
    const { data: community, error: communityError } = await supabase
      .from("whatsapp_communities")
      .select(`
        *,
        whatsapp_community_groups(*),
        whatsapp_community_members(*)
      `)
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

    if (communityError) throw communityError;

    return NextResponse.json({ community });
  } catch (error: any) {
    console.error("[GET /api/communities/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch community" },
      { status: 500 }
    );
  }
}

// PUT /api/communities/[id] — update community
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const profileId = cookieStore.get("active_profile_id")?.value;

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, icon_url, member_count, group_count, is_active } = body;

    const supabase = await createClient();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon_url !== undefined) updateData.icon_url = icon_url;
    if (member_count !== undefined) updateData.member_count = member_count;
    if (group_count !== undefined) updateData.group_count = group_count;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: community, error } = await supabase
      .from("whatsapp_communities")
      .update(updateData)
      .eq("id", id)
      .eq("profile_id", profileId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ community });
  } catch (error: any) {
    console.error("[PUT /api/communities/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update community" },
      { status: 500 }
    );
  }
}

// DELETE /api/communities/[id] — delete community
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const profileId = cookieStore.get("active_profile_id")?.value;

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 401 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("whatsapp_communities")
      .delete()
      .eq("id", id)
      .eq("profile_id", profileId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/communities/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete community" },
      { status: 500 }
    );
  }
}
