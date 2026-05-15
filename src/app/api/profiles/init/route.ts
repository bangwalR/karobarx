import { createAdminClient } from "@/lib/supabase/admin";
import { auth } from "@/auth";
import { normalizeRole } from "@/lib/permissions";
import { NextResponse } from "next/server";

/**
 * Called immediately after login to initialise the active_profile_id cookie.
 *
 * Resolution order:
 *  1. session.user.profile_id  (set when the user was linked to a tenant)
 *  2. owner_id match on business_config  (owner who just completed setup)
 *  3. needs_setup: true        (brand-new user — redirect to setup wizard)
 *
 * We NO LONGER silently fall back to the first row in the database, which
 * would hand a new registrant a completely different tenant's data.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    let profileId: string | null = session.user.profile_id ?? null;
    const role = normalizeRole(session.user.role);
    const supabase = createAdminClient();

    if (!profileId && role === "super_admin") {
      const { data: firstProfile } = await supabase
        .from("business_config")
        .select("id, setup_completed")
        .order("setup_completed", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      profileId = firstProfile?.id ?? null;
    }

    if (!profileId) {
      // Try to find a business_config owned by this admin user
      // Prioritize completed profiles over incomplete ones
      const { data: owned } = await supabase
        .from("business_config")
        .select("id, setup_completed")
        .eq("owner_id", session.user.id)
        .order("setup_completed", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (owned?.id) {
        profileId = owned.id;

        if (role !== "super_admin") {
          // Persist the link so future logins skip this lookup
          await supabase
            .from("admin_users")
            .update({ profile_id: profileId })
            .eq("id", session.user.id);
        }
      }
    }

    // No profile found at all → this is a brand-new owner who hasn't finished setup
    if (!profileId) {
      return NextResponse.json({ success: true, needs_setup: true });
    }

    const response = NextResponse.json({ success: true, profile_id: profileId });
    response.cookies.set("active_profile_id", profileId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    });
    return response;
  } catch (err) {
    console.error("Profile init error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
