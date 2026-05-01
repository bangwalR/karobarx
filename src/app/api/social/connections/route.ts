import { createClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

// Social connections API - Get all connections or specific platform
export async function GET(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "settings", action: "read" });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");
  const profileId = guard.context.profileId!;

  let query = supabase
    .from("social_connections")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching social connections:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remove sensitive tokens from response
  const sanitizedData = data?.map(conn => ({
    ...conn,
    access_token: conn.access_token ? "***connected***" : null,
    refresh_token: undefined,
  }));

  return NextResponse.json({ connections: sanitizedData });
}

// Save or update a social connection
export async function POST(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "settings", action: "write" });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const body = await request.json();
  const profileId = guard.context.profileId!;

  const {
    platform,
    account_id,
    account_name,
    access_token,
    refresh_token,
    token_expires_at,
    page_id,
    instagram_business_id,
    followers_count,
    metadata,
  } = body;

  if (!platform) {
    return NextResponse.json({ error: "Platform is required" }, { status: 400 });
  }

  // Check if connection already exists for this platform
  const { data: existing } = await supabase
    .from("social_connections")
    .select("id")
    .eq("profile_id", profileId)
    .eq("platform", platform)
    .maybeSingle();

  const connectionData = {
    platform,
    profile_id: profileId,
    account_id,
    account_name,
    access_token,
    refresh_token,
    token_expires_at,
    page_id,
    instagram_business_id,
    is_connected: !!access_token,
    followers_count: followers_count || 0,
    last_synced_at: new Date().toISOString(),
    metadata: metadata || {},
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    result = await supabase
      .from("social_connections")
      .update(connectionData)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("social_connections")
      .insert([connectionData])
      .select()
      .single();
  }

  if (result.error) {
    console.error("Error saving social connection:", result.error);
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    connection: {
      ...result.data,
      access_token: result.data.access_token ? "***connected***" : null,
      refresh_token: undefined,
    }
  });
}

// Disconnect a social account
export async function DELETE(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "settings", action: "write" });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const profileId = guard.context.profileId!;

  if (!platform) {
    return NextResponse.json({ error: "Platform is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("social_connections")
    .update({
      access_token: null,
      refresh_token: null,
      is_connected: false,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId)
    .eq("platform", platform);

  if (error) {
    console.error("Error disconnecting social account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
