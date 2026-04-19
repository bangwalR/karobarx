import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

/**
 * Debug endpoint to see exactly what config is being loaded
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const profileId = getProfileId(request as any);

    // Get the config that would be returned
    let data = null;
    let error = null;

    if (profileId) {
      const result = await supabase
        .from("business_config")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();
      
      data = result.data;
      error = result.error;
    }
    // Don't load random profiles if no cookie is set

    return NextResponse.json({
      success: true,
      profileId,
      config: data,
      error: error?.message,
      cookies: {
        active_profile_id: request.headers.get("cookie")?.includes("active_profile_id") ? "present" : "missing"
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
