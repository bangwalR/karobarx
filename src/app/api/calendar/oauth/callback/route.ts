import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/calendar/oauth/callback`
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // profile_id
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/admin/calendar?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/admin/calendar?error=no_code`);
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${baseUrl}/admin/calendar?error=no_refresh_token&hint=revoke_access`
      );
    }

    // Get user email from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    const profileId = state || "default";
    const supabase = createAdminClient();

    // Upsert token row
    const { error: upsertError } = await supabase.from("google_calendar_tokens").upsert(
      {
        profile_id: profileId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        google_email: userInfo.email,
        is_connected: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );

    if (upsertError) {
      console.error("Google Calendar token upsert error:", upsertError);
      return NextResponse.redirect(
        `${baseUrl}/admin/calendar?error=${encodeURIComponent("db_error: " + upsertError.message)}`
      );
    }

    return NextResponse.redirect(`${baseUrl}/admin/calendar?connected=1`);
  } catch (err) {
    console.error("Google Calendar OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/admin/calendar?error=exchange_failed`);
  }
}
