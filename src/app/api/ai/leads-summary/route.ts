import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/ai/leads-summary — returns lead counts + recent leads per platform (all time)
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all leads — no date filter
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, platform_username, source, status, created_at, last_contacted_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const all = leads || [];

    const summarize = (src: string) => {
      const items = all.filter((l) => l.source === src);
      return {
        total: items.length,
        new: items.filter((l) => l.status === "new").length,
        contacted: items.filter((l) => l.status === "contacted").length,
        interested: items.filter((l) => l.status === "interested").length,
        converted: items.filter((l) => l.status === "converted").length,
        recent: items.slice(0, 5).map((l) => ({
          name: l.name || l.platform_username || "Unknown",
          status: l.status,
          created_at: l.created_at,
        })),
      };
    };

    return NextResponse.json({
      success: true,
      period: "all time",
      instagram: summarize("instagram"),
      facebook: summarize("facebook"),
      whatsapp: summarize("whatsapp"),
      total: all.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
