import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";

/**
 * PATCH /api/auth/link-profile
 *
 * Called once after setup completes for a brand-new signup.
 * - Writes admin_users.profile_id  → so every future login resolves the right tenant
 * - Writes business_config.owner_id → establishes reverse ownership for /api/profiles/init lookup
 *
 * Uses the service-role key so it can bypass RLS on both tables.
 */

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { profile_id } = await req.json();
    if (!profile_id) {
      return NextResponse.json({ error: "profile_id is required" }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    // 1. Link the admin user to their profile
    const { error: userErr } = await supabase
      .from("admin_users")
      .update({ profile_id })
      .eq("id", session.user.id);

    if (userErr) throw userErr;

    // 2. Mark ownership on the business_config row
    const { error: configErr } = await supabase
      .from("business_config")
      .update({ owner_id: session.user.id })
      .eq("id", profile_id);

    if (configErr) throw configErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("link-profile error:", err);
    return NextResponse.json({ error: "Failed to link profile" }, { status: 500 });
  }
}
