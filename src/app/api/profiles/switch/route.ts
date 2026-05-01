import { createClient } from "@/lib/supabase/server";
import { canAccessProfile, requireTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

// POST - switch/set the active account context.
export async function POST(request: NextRequest) {
  try {
    const guard = await requireTenantContext(request, {
      requireProfile: false,
      allowSuperAdminWithoutProfile: true,
    });
    if (!guard.ok) return guard.response;

    const { profile_id } = await request.json();

    if (!profile_id) {
      return NextResponse.json({ error: "profile_id required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("business_config")
      .select("id")
      .eq("id", profile_id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!(await canAccessProfile(profile_id, guard.context.user))) {
      return NextResponse.json(
        { error: "You do not have access to this account" },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true, profile_id });

    response.cookies.set("active_profile_id", profile_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error("Error switching profile:", err);
    return NextResponse.json(
      { error: "Failed to switch profile" },
      { status: 500 }
    );
  }
}

// DELETE - only platform super admins can clear the active account context.
export async function DELETE(request: NextRequest) {
  const guard = await requireTenantContext(request, {
    requireProfile: false,
    allowSuperAdminWithoutProfile: true,
  });
  if (!guard.ok) return guard.response;
  if (!guard.context.isSuperAdmin) {
    return NextResponse.json({ error: "Only super admins can clear account context" }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("active_profile_id");
  return response;
}
