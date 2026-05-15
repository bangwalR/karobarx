import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/tenant";

// GET /api/social/instagram/connect
// Redirects the user to Facebook OAuth for Instagram Business Account
export async function GET(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "settings", action: "write" });
  if (!guard.ok) return guard.response;

  const appId = process.env.META_APP_ID;
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!appId) {
    return NextResponse.redirect(
      `${siteUrl}/admin/settings?tab=integrations&ig_error=missing_META_APP_ID`
    );
  }

  const redirectUri = `${siteUrl}/api/social/instagram/callback`;
  
  // For Instagram Business API, use Facebook Login with Instagram permissions
  const scopes = [
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",");

  // Use Facebook OAuth (not Instagram OAuth) for Instagram Business API
  const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", guard.context.profileId!);

  return NextResponse.redirect(authUrl.toString());
}
