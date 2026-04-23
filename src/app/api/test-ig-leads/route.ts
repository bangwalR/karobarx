import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/test-ig-leads — test endpoint to check Instagram leads
export async function GET() {
  const supabase = createAdminClient();
  
  // Check all leads
  const { data: allLeads, error: allError } = await supabase
    .from("leads")
    .select("*")
    .limit(10);
  
  // Check Instagram leads specifically
  const { data: igLeads, error: igError } = await supabase
    .from("leads")
    .select("*")
    .eq("source", "instagram")
    .limit(10);
  
  // Check Instagram leads with platform_user_id
  const { data: igLeadsWithId, error: igIdError } = await supabase
    .from("leads")
    .select("*")
    .eq("source", "instagram")
    .not("platform_user_id", "is", null)
    .limit(10);
  
  return NextResponse.json({
    allLeads: {
      count: allLeads?.length || 0,
      data: allLeads,
      error: allError?.message,
    },
    igLeads: {
      count: igLeads?.length || 0,
      data: igLeads,
      error: igError?.message,
    },
    igLeadsWithId: {
      count: igLeadsWithId?.length || 0,
      data: igLeadsWithId,
      error: igIdError?.message,
    },
  });
}
