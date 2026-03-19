import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { Notifications } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  
  const source = searchParams.get("source");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (source) {
    query = query.eq("source", source);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,platform_username.ilike.%${search}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get stats
  const { data: statsData } = await supabase
    .from("leads")
    .select("status, source");

  const stats = {
    total: count || 0,
    new: statsData?.filter(l => l.status === "new").length || 0,
    contacted: statsData?.filter(l => l.status === "contacted").length || 0,
    interested: statsData?.filter(l => l.status === "interested").length || 0,
    converted: statsData?.filter(l => l.status === "converted").length || 0,
    bySource: {
      instagram: statsData?.filter(l => l.source === "instagram").length || 0,
      facebook: statsData?.filter(l => l.source === "facebook").length || 0,
      whatsapp: statsData?.filter(l => l.source === "whatsapp").length || 0,
      website: statsData?.filter(l => l.source === "website").length || 0,
    }
  };

  return NextResponse.json({ leads: data, stats, total: count });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  const {
    name,
    phone,
    email,
    source,
    source_campaign,
    source_post_id,
    platform_user_id,
    platform_username,
    profile_picture_url,
    status,
    tags,
    notes,
    metadata,
  } = body;

  if (!source) {
    return NextResponse.json({ error: "Source is required" }, { status: 400 });
  }

  // Check for duplicate by platform_user_id or phone
  if (platform_user_id) {
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("platform_user_id", platform_user_id)
      .single();

    if (existing) {
      // Update existing lead
      const { data, error } = await supabase
        .from("leads")
        .update({
          name,
          phone,
          email,
          platform_username,
          profile_picture_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ lead: data, updated: true });
    }
  }

  const leadData = {
    name,
    phone,
    email,
    source,
    source_campaign,
    source_post_id,
    platform_user_id,
    platform_username,
    profile_picture_url,
    status: status || "new",
    tags: tags || [],
    notes,
    metadata: metadata || {},
  };

  const { data, error } = await supabase
    .from("leads")
    .insert([leadData])
    .select()
    .single();

  if (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire push notification (non-blocking)
  Notifications.newLead(name || "Unknown", source);

  return NextResponse.json({ lead: data });
}

export async function PUT(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
