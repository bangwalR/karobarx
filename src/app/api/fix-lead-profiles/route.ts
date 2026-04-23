import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/fix-lead-profiles — Update leads with null profile_id to use the first available profile
export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  
  // Get the profile_id from cookie (current user's profile)
  const profileId = req.cookies.get("active_profile_id")?.value;
  
  if (!profileId) {
    return NextResponse.json({ 
      error: "No active profile found. Please log in first.",
      success: false 
    }, { status: 401 });
  }
  
  try {
    // Find all leads with null profile_id
    const { data: leadsWithoutProfile, error: fetchError } = await supabase
      .from("leads")
      .select("id, name, username, source, platform_user_id")
      .is("profile_id", null);
    
    if (fetchError) {
      return NextResponse.json({ 
        error: fetchError.message,
        success: false 
      }, { status: 500 });
    }
    
    if (!leadsWithoutProfile || leadsWithoutProfile.length === 0) {
      return NextResponse.json({ 
        message: "No leads found with null profile_id",
        success: true,
        updated: 0
      });
    }
    
    // Update all leads to use the current profile_id
    const { error: updateError } = await supabase
      .from("leads")
      .update({ profile_id: profileId })
      .is("profile_id", null);
    
    if (updateError) {
      return NextResponse.json({ 
        error: updateError.message,
        success: false 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: `Successfully updated ${leadsWithoutProfile.length} leads with profile_id`,
      success: true,
      updated: leadsWithoutProfile.length,
      profileId,
      leads: leadsWithoutProfile.map(l => ({
        id: l.id,
        name: l.name || l.username,
        source: l.source,
        platform_user_id: l.platform_user_id
      }))
    });
    
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ 
      error: msg,
      success: false 
    }, { status: 500 });
  }
}
