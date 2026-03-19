import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileId } from "@/lib/profile";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/calendar/oauth/callback`
  );
}

// GET — return connect URL + current connection status
export async function GET(request: NextRequest) {
  const profileId = getProfileId(request);

  if (!process.env.GOOGLE_CALENDAR_CLIENT_ID) {
    return NextResponse.json({
      connected: false,
      error: "Google Calendar OAuth not configured. Add GOOGLE_CALENDAR_CLIENT_ID to .env.local",
    });
  }

  const supabase = createAdminClient();

  // Check if token exists for this profile
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("google_email, token_expiry, is_connected")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (tokenRow?.is_connected) {
    return NextResponse.json({
      connected: true,
      email: tokenRow.google_email,
      expires: tokenRow.token_expiry,
    });
  }

  // Generate OAuth URL
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
    state: profileId || "default",
  });

  return NextResponse.json({ connected: false, authUrl });
}

// DELETE — disconnect / revoke token
export async function DELETE(request: NextRequest) {
  const profileId = getProfileId(request);
  const supabase = createAdminClient();

  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("access_token")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (tokenRow?.access_token) {
    try {
      const oauth2Client = getOAuth2Client();
      await oauth2Client.revokeToken(tokenRow.access_token);
    } catch {
      // Ignore revocation errors — still remove from DB
    }
  }

  await supabase
    .from("google_calendar_tokens")
    .update({ is_connected: false, access_token: null, refresh_token: null })
    .eq("profile_id", profileId);

  return NextResponse.json({ success: true });
}
