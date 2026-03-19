import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileId } from "@/lib/profile";

export async function POST(request: NextRequest) {
  const profileId = getProfileId(request);
  const body = await request.json();
  const { endpoint, keys, userAgent } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "endpoint and keys required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Upsert by endpoint (device can re-subscribe)
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: profileId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent || null,
    },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  const supabase = createAdminClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ success: true });
}
