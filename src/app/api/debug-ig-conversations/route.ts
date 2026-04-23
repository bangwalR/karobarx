import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/debug-ig-conversations — Debug endpoint to check what the API returns
export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  
  // Get active profile ID from cookie
  const profileId = req.cookies.get("active_profile_id")?.value;
  
  // Check all leads without filter
  const { data: allLeads } = await supabase
    .from("leads")
    .select("id, name, username, platform_user_id, source, profile_id, created_at, updated_at")
    .eq("source", "instagram")
    .not("platform_user_id", "is", null)
    .limit(20);
  
  // Check leads with profile filter
  const { data: filteredLeads } = await supabase
    .from("leads")
    .select("id, name, username, platform_user_id, source, profile_id, created_at, updated_at")
    .eq("source", "instagram")
    .eq("profile_id", profileId || "")
    .not("platform_user_id", "is", null)
    .limit(20);
  
  // Check social connections
  const { data: connections } = await supabase
    .from("social_connections")
    .select("*")
    .eq("platform", "instagram");
  
  return NextResponse.json({
    profileId,
    hasCookie: !!profileId,
    allLeads: {
      count: allLeads?.length || 0,
      data: allLeads
    },
    filteredLeads: {
      count: filteredLeads?.length || 0,
      data: filteredLeads
    },
    connections: {
      count: connections?.length || 0,
      data: connections
    }
  });
}
