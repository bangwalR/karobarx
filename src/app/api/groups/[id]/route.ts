import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// GET /api/groups/[id] — get group details
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

    const waRes = await fetch(`${WA_BACKEND}/groups/${encodeURIComponent(id)}`);
    const waData = await waRes.json();

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waData.error || "Failed to fetch group" },
        { status: waRes.status }
      );
    }

    return NextResponse.json(waData);
  } catch (error: any) {
    console.error("[GET /api/groups/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch group" },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[id] — update group details
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
    const { name, description } = body;

    const waRes = await fetch(`${WA_BACKEND}/groups/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    const waData = await waRes.json();

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waData.error || "Failed to update group" },
        { status: waRes.status }
      );
    }

    return NextResponse.json(waData);
  } catch (error: any) {
    console.error("[PUT /api/groups/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update group" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] — leave group
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

    const waRes = await fetch(`${WA_BACKEND}/groups/${encodeURIComponent(id)}/leave`, {
      method: "DELETE",
    });

    const waData = await waRes.json();

    if (!waRes.ok) {
      return NextResponse.json(
        { error: waData.error || "Failed to leave group" },
        { status: waRes.status }
      );
    }

    return NextResponse.json(waData);
  } catch (error: any) {
    console.error("[DELETE /api/groups/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to leave group" },
      { status: 500 }
    );
  }
}
