import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/social/facebook/callback
// Called by Facebook after user authorises the app
export async function GET(req: NextRequest) {
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const settingsUrl = `${siteUrl}/admin/settings?tab=integrations`;

  const { searchParams } = req.nextUrl;
  const profileId = searchParams.get("state");
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      `${settingsUrl}&fb_error=${encodeURIComponent(searchParams.get("error_description") || error)}`
    );
  }

  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${settingsUrl}&fb_error=no_code`);
  if (!profileId) return NextResponse.redirect(`${settingsUrl}&fb_error=missing_account_context`);

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return NextResponse.redirect(`${settingsUrl}&fb_error=missing_env_vars`);

  const redirectUri = `${siteUrl}/api/social/facebook/callback`;

  try {
    // Step 1: Exchange code → short-lived user token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${settingsUrl}&fb_error=token_exchange_failed`);
    }
    const shortToken: string = tokenData.access_token;

    // Step 2: Exchange user token → long-lived user token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    const longUserToken: string = longData.access_token || shortToken;
    const userTokenExpiresIn: number = longData.expires_in || 5183944; // ~60 days
    const userTokenExpiresAt = new Date(Date.now() + userTokenExpiresIn * 1000).toISOString();

    // Step 3: Fetch list of managed pages to get the Page Access Token
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category&access_token=${longUserToken}`
    );
    const pagesData = await pagesRes.json();
    const pages: { id: string; name: string; access_token: string; category?: string }[] =
      pagesData.data || [];

    if (!pages.length) {
      return NextResponse.redirect(`${settingsUrl}&fb_error=no_pages_found`);
    }

    // Use the first page (typically the business page)
    const page = pages[0];
    const pageToken: string = page.access_token;
    const pageName: string = page.name;
    const pageId: string = page.id;

    // Step 4: Upsert into social_connections
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("social_connections")
      .select("id")
      .eq("profile_id", profileId)
      .eq("platform", "facebook")
      .maybeSingle();

    const row = {
      profile_id: profileId,
      platform: "facebook",
      account_id: pageId,
      account_name: pageName,
      page_id: pageId,
      access_token: pageToken,       // Page Access Token — never expires for pages
      token_expires_at: userTokenExpiresAt,
      is_connected: true,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("social_connections").update(row).eq("id", existing.id);
    } else {
      await supabase.from("social_connections").insert([row]);
    }

    return NextResponse.redirect(
      `${settingsUrl}&fb_success=1&fb_page=${encodeURIComponent(pageName)}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(`${settingsUrl}&fb_error=${encodeURIComponent(msg)}`);
  }
}
