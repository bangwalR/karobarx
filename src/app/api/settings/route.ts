import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";
import { requireTenantContext } from "@/lib/tenant";

// GET - Retrieve settings
export async function GET(request: NextRequest) {
  try {
    const guard = await requireTenantContext(request, { module: "settings", action: "read" });
    if (!guard.ok) return guard.response;

    const supabase = await createClient();
    const profileId = guard.context.profileId;

    // SECURITY: Require profile_id cookie - no profile = no access
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    const query = supabase.from("settings").select("*").eq("profile_id", profileId);
    const { data, error } = await query.limit(1).maybeSingle();

    // Fallback for pre-migration rows that still have no profile_id
    let finalData = data;
    if (!finalData && profileId) {
      const { data: fallback } = await supabase
        .from("settings")
        .select("*")
        .is("profile_id", null)
        .limit(1)
        .maybeSingle();
      finalData = fallback;
    }

    if (error && error.code !== "PGRST116") throw error;
    
    // Return default settings if none exist
    const defaultSettings = {
      store_name: "MobileHub Delhi",
      tagline: "Premium Second-Hand Phones in Delhi",
      description: "Delhi's most trusted destination for certified pre-owned smartphones. Quality guaranteed with warranty.",
      phone: "+91 99107 24940",
      email: "contact@mobilehubdelhi.com",
      website: "https://mobilehubdelhi.com",
      address: "123 Mobile Market, Karol Bagh, New Delhi - 110005",
      open_time: "10:00 AM",
      close_time: "9:00 PM",
      instagram: "",
      facebook: "",
      twitter: "",
      whatsapp_number: "+91 99107 24940",
      welcome_message: "🙏 Namaste! Welcome to MobileHub Delhi. How can I help you find your perfect phone today?",
      ai_auto_reply: true,
      agent_name: "MobileHub Assistant",
      response_language: "Hindi + English (Hinglish)",
      suggest_alternatives: true,
      notify_new_order: true,
      notify_inquiry: true,
      notify_low_stock: true,
      notify_daily_summary: false,
      notify_marketing: false,
      two_factor_auth: false,
      login_alerts: true,
      session_timeout: true,
    };
    
    return NextResponse.json({
      success: true,
      settings: finalData || defaultSettings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST - Save settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const settings = await request.json();

    // profile_id can come from:
    //  1. the request body (set by setup wizard for a freshly created profile)
    //  2. the active_profile_id cookie (normal admin editing Settings page)
    //  3. the session's assigned profile
    const cookieProfileId = request.cookies.get("active_profile_id")?.value ?? null;
    const profileId: string | null = settings.profile_id ?? cookieProfileId ?? null;

    // If profile_id is in the body (setup wizard flow), skip tenant guard
    // Otherwise require auth
    if (!settings.profile_id) {
      const guard = await requireTenantContext(request, {
        module: "settings",
        action: "write",
        requireProfile: false,
        allowSuperAdminWithoutProfile: true,
      });
      if (!guard.ok) return guard.response;
    }

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    // Strip profile_id from the settings payload so it isn’t written as a data field
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profile_id: _pid, ...settingsPayload } = settings;

    // Look up existing settings row for this profile
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("profile_id", profileId)
      .limit(1)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from("settings")
        .update({ ...settingsPayload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("settings")
        .insert({
          ...settingsPayload,
          profile_id: profileId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }
    
    if (result.error) {
      throw result.error;
    }
    
    return NextResponse.json({
      success: true,
      settings: result.data,
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

// PUT - Update specific settings (partial update)
export async function PUT(request: NextRequest) {
  try {
    const guard = await requireTenantContext(request, { module: "settings", action: "write" });
    if (!guard.ok) return guard.response;

    const supabase = await createClient();
    const updates = await request.json();
    const profileId = guard.context.profileId;

    // SECURITY: Require profile_id cookie - no profile = no access
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "No active profile. Please log out and log back in." },
        { status: 401 }
      );
    }

    // Get existing settings for this profile
    const { data: existing } = await supabase
      .from("settings")
      .select("*")
      .eq("profile_id", profileId)
      .limit(1)
      .maybeSingle();
    
    let result;
    if (existing) {
      // Merge updates with existing settings
      const mergedSettings = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      result = await supabase
        .from("settings")
        .update(mergedSettings)
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // Insert new settings row scoped to this profile
      result = await supabase
        .from("settings")
        .insert({
          ...updates,
          profile_id: profileId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }
    
    if (result.error) {
      throw result.error;
    }
    
    return NextResponse.json({
      success: true,
      settings: result.data,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
