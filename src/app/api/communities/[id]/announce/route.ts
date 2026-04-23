import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// POST /api/communities/[id]/announce — send announcement to community
export async function POST(
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
    const { message, media_url, media_type, target_type, target_group_ids } = body;

    if (!message && !media_url) {
      return NextResponse.json(
        { error: "message or media_url required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get community
    const { data: community, error: communityError } = await supabase
      .from("whatsapp_communities")
      .select("*")
      .eq("id", id)
      .eq("profile_id", profileId)
      .single();

    if (communityError) throw communityError;

    // Create announcement record
    const { data: announcement, error: announcementError } = await supabase
      .from("whatsapp_community_announcements")
      .insert({
        community_id: id,
        profile_id: profileId,
        message: message || "",
        media_url: media_url || null,
        media_type: media_type || "none",
        target_type: target_type || "all",
        target_group_ids: target_group_ids || null,
        status: "sent",
        total_recipients: community.member_count || 0,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (announcementError) throw announcementError;

    // Send via WhatsApp backend
    const waRes = await fetch(
      `${WA_BACKEND}/communities/${encodeURIComponent(community.community_id)}/announce`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          mediaUrl: media_url,
        }),
      }
    );

    const waData = await waRes.json();

    if (!waRes.ok) {
      // Update announcement status to failed
      await supabase
        .from("whatsapp_community_announcements")
        .update({ status: "failed" })
        .eq("id", announcement.id);

      return NextResponse.json(
        { error: waData.error || "Failed to send announcement" },
        { status: waRes.status }
      );
    }

    // Update announcement with message ID
    await supabase
      .from("whatsapp_community_announcements")
      .update({
        sent_count: community.member_count || 0,
      })
      .eq("id", announcement.id);

    return NextResponse.json({
      success: true,
      announcement,
      messageId: waData.messageId,
    });
  } catch (error: any) {
    console.error("[POST /api/communities/[id]/announce] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send announcement" },
      { status: 500 }
    );
  }
}
