import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@/auth";

/**
 * Manually set the active_profile_id cookie to a completed profile
 * This fixes the issue where the cookie is missing after login
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await createClient();

    // Find a completed profile for this user
    let profileId: string | null = null;

    // First, check if user has a profile_id set
    if (session.user.profile_id) {
      profileId = session.user.profile_id;
    } else {
      // Find by owner_id
      const { data: owned } = await supabase
        .from("business_config")
        .select("id, setup_completed, display_name")
        .eq("owner_id", session.user.id)
        .eq("setup_completed", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (owned?.id) {
        profileId = owned.id;
      }
    }

    if (!profileId) {
      return NextResponse.json({ 
        success: false, 
        error: "No profile found for this user. Please complete setup first." 
      });
    }

    const response = NextResponse.json({ 
      success: true, 
      profile_id: profileId,
      message: "Profile cookie set successfully"
    });

    response.cookies.set("active_profile_id", profileId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Error setting profile cookie:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
