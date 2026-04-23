import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Simplest possible test - just get Instagram leads
export async function GET() {
  const supabase = createAdminClient();
  
  try {
    // Get ALL Instagram leads without any filtering
    const { data: allLeads, error } = await supabase
      .from("leads")
      .select("*")
      .eq("source", "instagram")
      .limit(20);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }
    
    // Format as conversations
    const conversations = (allLeads || [])
      .filter(lead => lead.platform_user_id)
      .map(lead => ({
        id: `lead_${lead.id}`,
        name: lead.name || lead.username || "Instagram Lead",
        igUserId: lead.platform_user_id,
        lastMessage: "New lead from Instagram",
        lastMessageTime: lead.updated_at || lead.created_at,
        lastMessageFromMe: false,
        unreadCount: 1,
        isLead: true,
      }));
    
    return NextResponse.json({
      success: true,
      totalLeads: allLeads?.length || 0,
      leadsWithUserId: conversations.length,
      conversations,
      rawLeads: allLeads,
    });
    
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      success: false,
      error: msg,
    });
  }
}
