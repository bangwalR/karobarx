import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// POST /api/groups/[id]/members — add members to group
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
    const { participants } = body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "participants array required" },
        { status: 400 }
      );
    }

    const waRes = await fetch(
      `${WA_BACKEND}/groups/${encodeURIComponent(id)}/add-participants`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants }),
      }
    );

    const waData = await waRes.json();

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waData.error || "Failed to add members" },
        { status: waRes.status }
      );
    }

    return NextResponse.json(waData);
  } catch (error: any) {
    console.error("[POST /api/groups/[id]/members] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add members" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/members — remove member from group
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

    const body = await req.json();
    const { participant } = body;

    if (!participant) {
      return NextResponse.json(
        { error: "participant phone required" },
        { status: 400 }
      );
    }

    const waRes = await fetch(
      `${WA_BACKEND}/groups/${encodeURIComponent(id)}/remove-participant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant }),
      }
    );

    const waData = await waRes.json();

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waData.error || "Failed to remove member" },
        { status: waRes.status }
      );
    }

    return NextResponse.json(waData);
  } catch (error: any) {
    console.error("[DELETE /api/groups/[id]/members] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove member" },
      { status: 500 }
    );
  }
}
