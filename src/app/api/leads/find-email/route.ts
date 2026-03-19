import { NextRequest, NextResponse } from "next/server";

// Hunter.io email finder — finds professional email by name + company domain
// API Key: stored in HUNTER_API_KEY env var
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const firstName = searchParams.get("first_name");
  const lastName = searchParams.get("last_name");
  const domain = searchParams.get("domain");
  const company = searchParams.get("company");

  if (!firstName || (!domain && !company)) {
    return NextResponse.json(
      { error: "first_name and (domain or company) are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Hunter.io API key not configured" },
      { status: 503 }
    );
  }

  try {
    let resolvedDomain = domain;

    // If company name given but no domain, try to find domain via Hunter domain search
    if (!resolvedDomain && company) {
      const domainSearch = await fetch(
        `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(company)}&api_key=${apiKey}&limit=1`,
        { next: { revalidate: 300 } }
      );
      const domainData = await domainSearch.json();
      resolvedDomain = domainData?.data?.domain;
    }

    if (!resolvedDomain) {
      return NextResponse.json({ error: "Could not determine company domain" }, { status: 404 });
    }

    // Find email
    const params = new URLSearchParams({
      domain: resolvedDomain,
      first_name: firstName,
      ...(lastName ? { last_name: lastName } : {}),
      api_key: apiKey,
    });

    const res = await fetch(`https://api.hunter.io/v2/email-finder?${params}`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0]?.details || "Hunter.io error" }, { status: 400 });
    }

    const email = data?.data?.email;
    const score = data?.data?.score;
    const position = data?.data?.position;

    return NextResponse.json({
      found: !!email,
      email,
      score,
      position,
      domain: resolvedDomain,
      sources: data?.data?.sources?.slice(0, 3) || [],
    });
  } catch (error) {
    console.error("Hunter.io error:", error);
    return NextResponse.json({ error: "Failed to find email" }, { status: 500 });
  }
}

// Verify an existing email address
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Hunter.io API key not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`
    );
    const data = await res.json();

    return NextResponse.json({
      email,
      status: data?.data?.status, // "valid", "invalid", "accept_all", "webmail", "disposable", "unknown"
      score: data?.data?.score,
      disposable: data?.data?.disposable,
      webmail: data?.data?.webmail,
      mx_records: data?.data?.mx_records,
    });
  } catch (error) {
    console.error("Hunter.io verify error:", error);
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
  }
}
