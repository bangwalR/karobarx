import { NextResponse } from "next/server";

// GET /api/social/instagram/connect
// Redirects the user to Instagram OAuth authorization
export async function GET() {
  const appId = process.env.META_APP_ID;
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!appId) {
    return NextResponse.redirect(
      `${siteUrl}/admin/settings?tab=integrations&ig_error=missing_META_APP_ID`
    );
  }

  const redirectUri = `${siteUrl}/api/social/instagram/callback`;
  const scopes = [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
  ].join(",");

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);

  return NextResponse.redirect(authUrl.toString());
}
