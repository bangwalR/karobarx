import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

// DELETE - Remove all phones for current profile
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const profileId = getProfileId(request);
    
    // SECURITY: Require profileId
    if (!profileId) {
      return NextResponse.json({ 
        error: "No active profile. Please log in again." 
      }, { status: 401 });
    }

    // Get count before deletion
    const { count: beforeCount } = await supabase
      .from("phones")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);

    // Delete all phones for this profile
    const { error } = await supabase
      .from("phones")
      .delete()
      .eq("profile_id", profileId);

    if (error) {
      console.error("Error deleting phones:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully deleted ${beforeCount || 0} items from inventory`,
      deleted_count: beforeCount || 0
    });
  } catch (error) {
    console.error("Error in DELETE /api/phones/cleanup:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}