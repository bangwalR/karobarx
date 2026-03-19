import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  // siteUrl = ngrok/public URL — used only as the redirect_uri for OAuth
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // adminUrl = where the user's browser session actually lives (localhost in dev)
  const adminUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const settingsUrl = `${adminUrl}/admin/settings?tab=integrations`;
  const { searchParams } = req.nextUrl;

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

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${settingsUrl}&ig_error=missing_env_vars`);
  }

  const redirectUri = `${siteUrl}/api/social/instagram/callback`;

  try {
    // ── Step 1: Exchange code → short-lived token ──────────────────────────
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenRes.json();

    // Instagram returns an array when data wrapper is present
    const tokenEntry = Array.isArray(tokenData) ? tokenData[0] : tokenData;
    const shortToken: string = tokenEntry?.access_token;
    const igUserId: string = String(tokenEntry?.user_id || "");

    if (!shortToken) {
      console.error("[IG callback] Short-lived token error:", tokenData);
      return NextResponse.redirect(`${settingsUrl}&ig_error=token_exchange_failed`);
    }

    // ── Step 2: Exchange → long-lived token (60 days) ──────────────────────
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${encodeURIComponent(shortToken)}`
    );
    const longData = await longRes.json();
    const accessToken: string = longData.access_token || shortToken;
    const expiresIn: number = longData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // ── Step 3: Get username from /me ──────────────────────────────────────
    const meRes = await fetch(
      `https://graph.instagram.com/v25.0/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`
    );
    const meData = await meRes.json();
    const username: string = meData.username || "instagram_user";
    const userId: string = meData.user_id || igUserId;

    // ── Step 4: Upsert social_connections ─────────────────────────────────
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("social_connections")
      .select("id")
      .eq("platform", "instagram")
      .maybeSingle();

    const row = {
      platform: "instagram",
      account_id: userId,
      account_name: username,
      access_token: accessToken,
      token_expires_at: expiresAt,
      instagram_business_id: userId,
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
      `${settingsUrl}&ig_success=1&ig_user=${encodeURIComponent(username)}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[IG callback] Error:", msg);
    return NextResponse.redirect(`${settingsUrl}&ig_error=${encodeURIComponent(msg)}`);
  }
}
