import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTemplateByType } from "@/lib/business-templates";
import { getProfileId } from "@/lib/profile";
import { requireTenantContext } from "@/lib/tenant";

// GET - Retrieve the active profile's business config
export async function GET(request: NextRequest) {
  try {
    const guard = await requireTenantContext(request, {
      requireProfile: false,
      allowSuperAdminWithoutProfile: true,
    });
    if (!guard.ok) return guard.response;

    const supabase = await createClient();
    const profileId = guard.context.profileId ?? getProfileId(request);

    // CRITICAL: Only load a profile if we have a valid profileId cookie
    // Never load random profiles from the database for unauthenticated/new users
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

    if (error && error.code !== "PGRST116") throw error;

    // Merge store_name and logo_url from the settings table — scoped to this profile
    // to prevent data from one tenant bleeding into another tenant's config response.
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("store_name, logo_url")
      .eq("profile_id", data?.id ?? profileId ?? "")
      .limit(1)
      .maybeSingle();

    // Fallback: if settings still has no profile_id (pre-migration rows), fetch unscoped
    const { data: settingsFallback } = !settingsRow && profileId
      ? await supabase.from("settings").select("store_name, logo_url").is("profile_id", null).limit(1).maybeSingle()
      : { data: null };
    const effectiveSettings = settingsRow ?? settingsFallback;

    if (!data) {
      const template = getTemplateByType("mobile_phones");
      return NextResponse.json({
        success: true,
        config: {
          ...template,
          store_name: effectiveSettings?.store_name ?? (template as unknown as Record<string,unknown>).store_name,
          logo_url:   effectiveSettings?.logo_url   ?? "/logo.png",
          setup_completed: true, // Default to true to prevent redirect loops
        },
        is_default: true,
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        ...data,
        store_name: effectiveSettings?.store_name ?? data.store_name ?? data.display_name,
        logo_url:   effectiveSettings?.logo_url   ?? data.logo_url ?? "/logo.png",
      },
      is_default: false,
    });
  } catch (error) {
    console.error("Error fetching business config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch business config" },
      { status: 500 }
    );
  }
}

// Fields from BusinessTemplate that exist ONLY in-memory (not DB columns).
// Strip them before any INSERT / UPDATE so Supabase doesn't reject unknown columns.
const TEMPLATE_ONLY_FIELDS = ["name", "description", "icon", "color"] as const;

function sanitizeForDB(config: Record<string, unknown>) {
  const { id, created_at, updated_at, ...rest } = config as Record<string, unknown>;
  void id; // intentionally dropped — DB manages UUID
  void created_at;
  void updated_at;
  for (const field of TEMPLATE_ONLY_FIELDS) {
    delete (rest as Record<string, unknown>)[field];
  }
  return rest;
}

// POST - Save / update business config
export async function POST(request: NextRequest) {
  try {
    const guard = await requireTenantContext(request, {
      module: "settings",
      action: "write",
      requireProfile: false,
      allowSuperAdminWithoutProfile: true,
    });
    if (!guard.ok) return guard.response;

    const supabase = await createClient();
    const raw = await request.json();
    const payload = sanitizeForDB(raw);

    // Respect the active_profile_id cookie so we always update the correct tenant row.
    // Falls back to checking for any existing row only when no cookie is present
    // (e.g. first-time setup before a profile has been created).
    const profileId = guard.context.profileId ?? getProfileId(request);

    let existingId: string | null = null;

    if (profileId) {
      // Scoped: look up only the active profile
      const { data: existing } = await supabase
        .from("business_config")
        .select("id")
        .eq("id", profileId)
        .maybeSingle();
      existingId = existing?.id ?? null;
    }
    // If no profileId cookie, we'll create a new profile (no fallback to existing profiles)

    let result;
    if (existingId) {
      result = await supabase
        .from("business_config")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("business_config")
        .insert({ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, config: result.data });
  } catch (error) {
    console.error("Error saving business config:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save business config" },
      { status: 500 }
    );
  }
}
