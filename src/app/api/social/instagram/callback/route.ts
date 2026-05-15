import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  // siteUrl = ngrok/public URL — used only as the redirect_uri for OAuth
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // adminUrl = where the user's browser session actually lives (localhost in dev)
  const adminUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const settingsUrl = `${adminUrl}/admin/settings?tab=integrations`;
  const { searchParams } = req.nextUrl;
  const profileId = searchParams.get("state");

  // Handle user-denied or error from Instagram
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${settingsUrl}&ig_error=${encodeURIComponent(error)}`);
  }

  // Strip trailing #_ that Instagram appends
  const code = searchParams.get("code")?.replace(/#_$/, "");
  if (!code) {
    return NextResponse.redirect(`${settingsUrl}&ig_error=no_code`);
  }
  if (!profileId) {
    return NextResponse.redirect(`${settingsUrl}&ig_error=missing_account_context`);
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${settingsUrl}&ig_error=missing_env_vars`);
  }

  const redirectUri = `${siteUrl}/api/social/instagram/callback`;

  try {
    // ── Step 1: Exchange code → access token (Facebook) ──────────────────────────
    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("[IG callback] Token exchange error:", tokenData);
      return NextResponse.redirect(`${settingsUrl}&ig_error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    // ── Step 2: Get Facebook Pages ──────────────────────────────────────────
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${encodeURIComponent(accessToken)}`
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(`${settingsUrl}&ig_error=no_pages_found`);
    }

    // Use the first page (you can add UI to select if multiple pages)
    const page = pagesData.data[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;

    // ── Step 3: Get Instagram Business Account connected to this page ──────
    const igAccountRes = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${encodeURIComponent(pageAccessToken)}`
    );
    const igAccountData = await igAccountRes.json();

    if (!igAccountData.instagram_business_account) {
      return NextResponse.redirect(`${settingsUrl}&ig_error=no_instagram_business_account`);
    }

    const igBusinessAccountId = igAccountData.instagram_business_account.id;

    // ── Step 4: Get Instagram username ──────────────────────────────────────
    const igProfileRes = await fetch(
      `https://graph.facebook.com/v18.0/${igBusinessAccountId}?fields=username,id&access_token=${encodeURIComponent(pageAccessToken)}`
    );
    const igProfileData = await igProfileRes.json();
    const username = igProfileData.username || "instagram_user";

    // ── Step 5: Exchange for long-lived token (60 days) ────────────────────
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(pageAccessToken)}`
    );
    const longTokenData = await longTokenRes.json();
    const longLivedToken = longTokenData.access_token || pageAccessToken;
    const expiresIn = longTokenData.expires_in || 5184000; // 60 days default
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // ── Step 6: Upsert social_connections ─────────────────────────────────
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("social_connections")
      .select("id")
      .eq("profile_id", profileId)
      .eq("platform", "instagram")
      .maybeSingle();

    const row = {
      profile_id: profileId,
      platform: "instagram",
      account_id: igBusinessAccountId,
      account_name: username,
      access_token: longLivedToken,
      token_expires_at: expiresAt,
      instagram_business_id: igBusinessAccountId,
      is_connected: true,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { page_id: pageId, page_name: page.name },
    };

    if (existing) {
      await supabase.from("social_connections").update(row).eq("id", existing.id);
    } else {
      await supabase.from("social_connections").insert([row]);
    }

    return NextResponse.redirect(
      `${settingsUrl}&ig_success=1&ig_user=${encodeURIComponent(username)}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[IG callback] Error:", msg);
    return NextResponse.redirect(`${settingsUrl}&ig_error=${encodeURIComponent(msg)}`);
  }
}
