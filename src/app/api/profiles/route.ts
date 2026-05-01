import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizeRole } from "@/lib/permissions";

// GET — list business profiles accessible to the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: "Unauthenticated" 
      }, { status: 401 });
    }

    const supabase = await createClient();
    const role = normalizeRole(session.user.role);

    let query = supabase
      .from("business_config")
      .select(
        "id, business_type, display_name, product_name_singular, product_name_plural, order_prefix, setup_completed, created_at"
      );

    if (role === "super_admin") {
      // Platform super admins can switch across all accounts.
    } else if (session.user.profile_id) {
      query = query.eq("id", session.user.profile_id);
    } else {
      query = query.eq("owner_id", session.user.id);
    }

    query = query.order("created_at", { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, profiles: data ?? [] });
  } catch (err) {
    console.error("Error fetching profiles:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

// POST — create a new business profile
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const role = normalizeRole(session.user.role);
    if (role !== "super_admin" && session.user.profile_id) {
      return NextResponse.json(
        { success: false, error: "Only super admins can create additional accounts" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    // Strip template-only fields that aren't DB columns
    const { id, name, description, icon, color, created_at, updated_at, ...payload } = body;
    void id; void name; void description; void icon; void color; void created_at; void updated_at;

    const { data, error } = await supabase
      .from("business_config")
      .insert({
        ...payload,
        owner_id: role === "super_admin" ? payload.owner_id || session.user.id : session.user.id,
        setup_completed: payload.setup_completed ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data });
  } catch (err) {
    console.error("Error creating profile:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create profile" },
      { status: 500 }
    );
  }
}
