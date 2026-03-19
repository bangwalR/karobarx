import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTemplateByType } from "@/lib/business-templates";
import { getProfileId } from "@/lib/profile";

// GET - Retrieve the active profile's business config
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const profileId = getProfileId(request);

    let query = supabase.from("business_config").select("*");
    if (profileId) {
      query = query.eq("id", profileId);
    }

    const { data, error } = await query.limit(1).maybeSingle();

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
    const { data: settingsFallback } = !settingsRow
      ? await supabase.from("settings").select("store_name, logo_url").limit(1).maybeSingle()
      : { data: null };
    const effectiveSettings = settingsRow ?? settingsFallback;

    if (!data) {
      const template = getTemplateByType("mobile_phones");
      return NextResponse.json({
        success: true,
        config: {
          ...template,
          store_name: effectiveSettings?.store_name ?? (template as unknown as Record<string,unknown>).store_name,
          logo_url:   effectiveSettings?.logo_url   ?? "",
        },
        is_default: true,
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        ...data,
        store_name: effectiveSettings?.store_name ?? data.store_name ?? data.display_name,
        logo_url:   effectiveSettings?.logo_url   ?? data.logo_url ?? "",
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const supabase = await createClient();
    const raw = await request.json();
    const payload = sanitizeForDB(raw);

    // Respect the active_profile_id cookie so we always update the correct tenant row.
    // Falls back to checking for any existing row only when no cookie is present
    // (e.g. first-time setup before a profile has been created).
    const profileId = getProfileId(request);

    let existingId: string | null = null;

    if (profileId) {
      // Scoped: look up only the active profile
      const { data: existing } = await supabase
        .from("business_config")
        .select("id")
        .eq("id", profileId)
        .maybeSingle();
      existingId = existing?.id ?? null;
    } else {
      // No cookie yet (brand-new install) — check if ANY row exists
      const { data: existing } = await supabase
        .from("business_config")
        .select("id")
        .limit(1)
        .maybeSingle();
      existingId = existing?.id ?? null;
    }

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
