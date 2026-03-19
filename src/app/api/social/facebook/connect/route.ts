import { NextResponse } from "next/server";

// GET /api/social/facebook/connect
// Redirects to Facebook Login OAuth — requests pages_messaging + page_read_engagement
export async function GET() {
  const appId = process.env.META_APP_ID;
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!appId) {
    return NextResponse.redirect(
      `${siteUrl}/admin/settings?tab=integrations&fb_error=missing_META_APP_ID`
    );
  }

  const redirectUri = `${siteUrl}/api/social/facebook/callback`;
  const scopes = [
    "pages_messaging",
    "pages_read_engagement",
    "pages_manage_metadata",
    "pages_show_list",
  ].join(",");

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);

  return NextResponse.redirect(authUrl.toString());
}
