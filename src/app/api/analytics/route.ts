import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

/**
 * Google Analytics 4 Data API route
 *
 * Setup required (all free):
 * 1. Create a Google Cloud project → enable "Google Analytics Data API"
 * 2. Create a Service Account → download JSON key
 * 3. In GA4: Admin → Property Access Management → Add service account email with "Viewer" role
 * 4. Add to .env.local:
 *    GA4_PROPERTY_ID=properties/XXXXXXXXX    (found in GA4 Admin → Property Settings)
 *    GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=<base64 of the full JSON key file>
 *
 * To base64 encode your key:
 *    base64 -i service-account-key.json | pbcopy   (Mac)
 *    base64 service-account-key.json | clip         (Windows)
 */

function getAnalyticsClient() {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!keyBase64) return null;

  try {
    const keyJson = Buffer.from(keyBase64, "base64").toString("utf-8");
    const credentials = JSON.parse(keyJson);
    return new BetaAnalyticsDataClient({ credentials });
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const client = getAnalyticsClient();

  if (!client || !propertyId) {
    return NextResponse.json({
      configured: false,
      message: "Google Analytics not configured. Add GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 to .env.local",
      setup_steps: [
        "1. Create a Google Cloud project at console.cloud.google.com",
        "2. Enable 'Google Analytics Data API'",
        "3. Create a Service Account (IAM & Admin → Service Accounts) and download JSON key",
        "4. In GA4 Admin → Property Access Management, add the service account email as Viewer",
        "5. Copy your GA4 Property ID from GA4 Admin → Property Settings (format: properties/XXXXXXXXX)",
        "6. Run: base64 -i service-account-key.json | pbcopy (Mac) or base64 service-account-key.json (Linux)",
        "7. Add to .env.local: GA4_PROPERTY_ID=properties/XXXXXXXXX",
        "8. Add to .env.local: GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=<paste base64 output>",
      ],
    });
  }

  const { searchParams } = new URL(request.url);
  const report = searchParams.get("report") || "overview";

  try {
    if (report === "overview") {
      // 30-day daily sessions + users
      const [response] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });

      const rows = (response.rows || []).map((row) => ({
        date: row.dimensionValues?.[0]?.value || "",
        sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        users: parseInt(row.metricValues?.[1]?.value || "0"),
        pageviews: parseInt(row.metricValues?.[2]?.value || "0"),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || "0").toFixed(1),
      }));

      // Totals
      const totals = {
        sessions: rows.reduce((s, r) => s + r.sessions, 0),
        users: rows.reduce((s, r) => s + r.users, 0),
        pageviews: rows.reduce((s, r) => s + r.pageviews, 0),
        avgBounceRate:
          rows.length > 0
            ? (rows.reduce((s, r) => s + parseFloat(r.bounceRate), 0) / rows.length).toFixed(1)
            : "0",
      };

      return NextResponse.json({ configured: true, report: "overview", rows, totals });
    }

    if (report === "pages") {
      const [response] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "activeUsers" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      });

      const rows = (response.rows || []).map((row) => ({
        path: row.dimensionValues?.[0]?.value || "",
        title: row.dimensionValues?.[1]?.value || "",
        views: parseInt(row.metricValues?.[0]?.value || "0"),
        users: parseInt(row.metricValues?.[1]?.value || "0"),
        avgDuration: Math.round(parseFloat(row.metricValues?.[2]?.value || "0")),
      }));

      return NextResponse.json({ configured: true, report: "pages", rows });
    }

    if (report === "devices") {
      const [response] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      });

      const rows = (response.rows || []).map((row) => ({
        device: row.dimensionValues?.[0]?.value || "",
        sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        users: parseInt(row.metricValues?.[1]?.value || "0"),
      }));

      return NextResponse.json({ configured: true, report: "devices", rows });
    }

    if (report === "sources") {
      const [response] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      });

      const rows = (response.rows || []).map((row) => ({
        source: row.dimensionValues?.[0]?.value || "",
        medium: row.dimensionValues?.[1]?.value || "",
        sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        users: parseInt(row.metricValues?.[1]?.value || "0"),
        conversions: parseInt(row.metricValues?.[2]?.value || "0"),
      }));

      return NextResponse.json({ configured: true, report: "sources", rows });
    }

    if (report === "realtime") {
      const [response] = await client.runRealtimeReport({
        property: propertyId,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
      });

      const totalActive = parseInt(
        response.totals?.[0]?.metricValues?.[0]?.value || "0"
      );

      const byCountry = (response.rows || []).map((row) => ({
        country: row.dimensionValues?.[0]?.value || "",
        users: parseInt(row.metricValues?.[0]?.value || "0"),
      }));

      return NextResponse.json({ configured: true, report: "realtime", totalActive, byCountry });
    }

    return NextResponse.json({ error: "Unknown report type. Use: overview, pages, devices, sources, realtime" }, { status: 400 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("GA4 API error:", errMsg);
    return NextResponse.json(
      { configured: true, error: "GA4 API error", details: errMsg },
      { status: 500 }
    );
  }
}
