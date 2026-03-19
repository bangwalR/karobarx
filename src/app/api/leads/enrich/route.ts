import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileId } from "@/lib/profile";

/**
 * Clearbit FREE public API — no API key required.
 * Endpoint: https://autocomplete.clearbit.com/v1/companies/suggest
 *
 * GET /api/leads/enrich?company=<name_or_domain>
 *   → Returns up to 6 company suggestions (name, domain, logo)
 *
 * POST /api/leads/enrich
 *   Body: { email?, domain?, name?, lead_id? }
 *   → Finds company info via autocomplete, optionally saves to lead
 */

// GET — search companies by name/domain (free autocomplete)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("company") || searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "company or q query param required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json({ companies: [] });
    }

    const companies: Array<{ name: string; domain: string; logo: string }> = await res.json();

    return NextResponse.json({
      companies: companies.slice(0, 6).map((c) => ({
        name: c.name,
        domain: c.domain,
        logo: c.logo,
      })),
      source: "clearbit_free",
    });
  } catch (error) {
    console.error("Clearbit autocomplete error:", error);
    return NextResponse.json({ companies: [] });
  }
}

// POST — enrich lead using free Clearbit autocomplete + Hunter.io domain search
export async function POST(request: NextRequest) {
  const profileId = getProfileId(request);
  const body = await request.json();
  const { lead_id, email, domain, name } = body as {
    lead_id?: string;
    email?: string;
    domain?: string;
    name?: string;
  };

  if (!email && !domain && !name) {
    return NextResponse.json(
      { error: "Provide at least one of: email, domain, or name" },
      { status: 400 }
    );
  }

  // Derive query: prefer domain, extract from email, or use company name
  let query = domain || name || "";
  if (!query && email) {
    const parts = email.split("@");
    if (parts.length === 2) query = parts[1];
  }

  let enrichmentData: Record<string, unknown> = {};

  // 1. Clearbit free autocomplete (no key needed)
  if (query) {
    try {
      const res = await fetch(
        `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`,
        { next: { revalidate: 300 } }
      );

      if (res.ok) {
        const companies: Array<{ name: string; domain: string; logo: string }> = await res.json();

        const match =
          companies.find(
            (c) =>
              c.domain === query ||
              c.domain === query.replace(/^www\./, "") ||
              c.name.toLowerCase() === (name || "").toLowerCase()
          ) || companies[0];

        if (match) {
          enrichmentData = {
            source: "clearbit_free",
            company: { name: match.name, domain: match.domain, logo: match.logo },
            enriched_at: new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.error("Clearbit free autocomplete error:", e);
    }
  }

  // 2. Hunter.io domain search — employee count, email pattern, industry
  const hunterKey = process.env.HUNTER_API_KEY;
  const lookupDomain =
    domain ||
    ((enrichmentData.company as Record<string, unknown>)?.domain as string) ||
    query;

  if (hunterKey && lookupDomain && !lookupDomain.includes(" ")) {
    try {
      const hunterRes = await fetch(
        `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(lookupDomain)}&api_key=${hunterKey}&limit=3`,
        { next: { revalidate: 3600 } }
      );

      if (hunterRes.ok) {
        const hunterData = await hunterRes.json();
        const hd = hunterData.data;

        if (hd) {
          const existingCompany = (enrichmentData.company as Record<string, unknown>) || {};
          enrichmentData = {
            ...enrichmentData,
            source: enrichmentData.source ? `${enrichmentData.source}+hunter` : "hunter",
            company: {
              ...existingCompany,
              name: existingCompany.name || hd.organization,
              domain: existingCompany.domain || hd.domain,
              industry: hd.industry,
              employee_count: hd.company_size ? `${hd.company_size} employees` : undefined,
              country: hd.country,
              linkedin: hd.linkedin,
              twitter: hd.twitter,
              description: hd.description,
            },
            sample_emails: (hd.emails || []).slice(0, 3).map(
              (e: { value: string; type: string; confidence: number }) => ({
                email: e.value,
                type: e.type,
                confidence: e.confidence,
              })
            ),
            email_pattern: hd.pattern,
            enriched_at: new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.error("Hunter domain search error:", e);
    }
  }

  // 3. Save enrichment to lead if lead_id provided
  if (lead_id && Object.keys(enrichmentData).length > 0) {
    try {
      const supabase = createAdminClient();
      const updateData: Record<string, unknown> = { enrichment_data: enrichmentData };
      const company = enrichmentData.company as Record<string, unknown>;
      if (company?.name) updateData.company = company.name as string;
      await supabase.from("leads").update(updateData).eq("id", lead_id).eq("profile_id", profileId);
    } catch (e) {
      console.error("Failed to save enrichment to lead:", e);
    }
  }

  return NextResponse.json({
    success: Object.keys(enrichmentData).length > 0,
    data: enrichmentData,
    free: true,
  });
}
