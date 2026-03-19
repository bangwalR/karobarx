import { NextRequest, NextResponse } from "next/server";
import { getProfileId } from "@/lib/profile";
import { notify } from "@/lib/notify";

export async function POST(request: NextRequest) {
  const profileId = getProfileId(request);
  const body = await request.json();
  const { title = "🔔 Test Notification", body: msgBody = "Notifications are working! ✅" } = body;

  await notify({
    title,
    body: msgBody,
    tag: "test",
    urgency: "high",
    url: "/admin",
    profileId,
  });

  return NextResponse.json({ success: true });
}
