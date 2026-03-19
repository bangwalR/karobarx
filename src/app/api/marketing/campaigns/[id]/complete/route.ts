import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/marketing/campaigns/[id]/complete
// Called by WA backend when campaign loop finishes
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  try { await supabase.rpc("refresh_campaign_stats", { p_campaign_id: id }); } catch (_) {}

  await supabase
    .from("marketing_campaigns")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
