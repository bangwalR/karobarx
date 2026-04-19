import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

// GET all custom fields
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get("table");
    const profileId = getProfileId(request);

    // SECURITY: Require profile_id cookie - no profile = no access
    if (!profileId) {
      return NextResponse.json(
        { error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    let query = supabase
      .from("custom_fields")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true });

    if (tableName) {
      query = query.eq("table_name", tableName);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching custom fields:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, fields: data || [] });
  } catch (error) {
    console.error("Error in GET /api/custom-fields:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new custom field
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { table_name, field_name, field_type, field_label, options, required } = body;

    if (!table_name || !field_name || !field_type) {
      return NextResponse.json({ error: "table_name, field_name, and field_type are required" }, { status: 400 });
    }

    // Validate table name
    const allowedTables = ["phones", "customers", "orders", "inquiries"];
    if (!allowedTables.includes(table_name)) {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
    }

    // SECURITY: Require profile_id cookie - no profile = no access
    const profileId = getProfileId(request);
    if (!profileId) {
      return NextResponse.json(
        { error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    // Create the custom field record, scoped to active profile
    const { data, error } = await supabase
      .from("custom_fields")
      .insert({
        table_name,
        field_name: field_name.toLowerCase().replace(/\s+/g, '_'),
        field_type,
        field_label: field_label || field_name,
        options: options || null,
        required: required || false,
        created_at: new Date().toISOString(),
        profile_id: profileId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating custom field:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, field: data });
  } catch (error) {
    console.error("Error in POST /api/custom-fields:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove custom field
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Field ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("custom_fields")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting custom field:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/custom-fields:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
