import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Diagnostic endpoint to check and fix setup_completed status
 * This helps when accounts are created but setup_completed is still false
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check all business_config records
    const { data: configs, error: fetchError } = await supabase
      .from("business_config")
      .select("id, display_name, business_type, setup_completed, created_at, owner_id");

    if (fetchError) throw fetchError;

    // Check admin_users to see if any accounts exist
    const { data: users, error: usersError } = await supabase
      .from("admin_users")
      .select("id, username, full_name, created_at, profile_id");

    if (usersError) throw usersError;

    return NextResponse.json({
      success: true,
      configs: configs || [],
      users: users || [],
      message: "Use POST to fix setup_completed status for existing accounts"
    });
  } catch (error) {
    console.error("Error checking setup status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}

/**
 * Fix setup_completed status for accounts that are already created
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Check if there are any admin users (accounts created)
    const { data: users, error: usersError } = await supabase
      .from("admin_users")
      .select("id, username, created_at");

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No admin users found. Please complete the setup wizard first."
      });
    }

    // Update all business_config records to mark setup as completed
    const { data: updated, error: updateError } = await supabase
      .from("business_config")
      .update({
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      })
      .eq("setup_completed", false)
      .select();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `Fixed setup status for ${updated?.length || 0} business config(s)`,
      updated: updated || [],
      users_found: users.length
    });
  } catch (error) {
    console.error("Error fixing setup status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fix setup status" },
      { status: 500 }
    );
  }
}
