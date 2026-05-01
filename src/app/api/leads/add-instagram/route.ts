import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantContext } from "@/lib/tenant";

// POST /api/leads/add-instagram
// Add Instagram leads manually via API
// Body: { leads: [{ name, username, message, platform_user_id }] }
export async function POST(req: NextRequest) {
  const guard = await requireTenantContext(req, { module: "leads", action: "write" });
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const profileId = guard.context.profileId!;
  
  try {
    const body = await req.json();
    const leads = body.leads || [];
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ 
        error: "Invalid request. Provide 'leads' array with lead data." 
      }, { status: 400 });
    }
    
    const results = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    for (const lead of leads) {
      const { name, username, message, platform_user_id } = lead;
      
      if (!platform_user_id) {
        results.errors.push(`Missing platform_user_id for ${name || username}`);
        continue;
      }
      
      // Check if lead exists
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("profile_id", profileId)
        .eq("platform_user_id", platform_user_id)
        .eq("source", "instagram")
        .maybeSingle();
      
      if (existing) {
        // Update existing lead
        const { error } = await supabase
          .from("leads")
          .update({
            name: name || username || "Instagram User",
            platform_username: username,
            notes: message || null,
            updated_at: new Date().toISOString(),
            last_contacted_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .eq("profile_id", profileId);
        
        if (error) {
          results.errors.push(`Error updating ${name}: ${error.message}`);
        } else {
          results.updated++;
        }
      } else {
        // Insert new lead
        const { error } = await supabase
          .from("leads")
          .insert({
            name: name || username || "Instagram User",
            platform_user_id,
            platform_username: username,
            source: "instagram",
            status: "new",
            tags: ["instagram-dm"],
            notes: message || null,
            profile_id: profileId,
            last_contacted_at: new Date().toISOString(),
            metadata: { added_via: "api" },
          });
        
        if (error) {
          results.errors.push(`Error adding ${name}: ${error.message}`);
        } else {
          results.added++;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      ...results,
      message: `Added ${results.added} new leads, updated ${results.updated}, skipped ${results.skipped}`,
    });
    
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/leads/add-instagram - Show usage instructions
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/leads/add-instagram",
    method: "POST",
    description: "Add Instagram leads manually",
    example: {
      leads: [
        {
          name: "John Doe",
          username: "johndoe123",
          platform_user_id: "1234567890",
          message: "Hi, I'm interested in your product"
        },
        {
          name: "Jane Smith", 
          username: "janesmith456",
          platform_user_id: "0987654321",
          message: "Can you send me more details?"
        }
      ]
    },
    usage: "Send POST request with JSON body containing 'leads' array"
  });
}
