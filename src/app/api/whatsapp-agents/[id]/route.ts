import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

type Params = { params: Promise<{ id: string }> };

// Shared helper: verify agent belongs to caller's profile
async function resolveAgent(request: NextRequest, agentId: string) {
  const supabase = await createClient();
  const profileId = getProfileId(request);
  if (!profileId) return { error: "Unauthorized", status: 401, supabase, profileId: null };

  const { data: agent, error } = await supabase
    .from("whatsapp_agents")
    .select("*")
    .eq("id", agentId)
    .eq("profile_id", profileId)
    .single();

  if (error || !agent) return { error: "Agent not found", status: 404, supabase, profileId };

  return { agent, supabase, profileId, error: null, status: 200 };
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const result = await resolveAgent(request, id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  // Mask meta_access_token in response — only send whether it's set
  const agent = { ...result.agent };
  if (agent.meta_access_token) agent.meta_access_token = "••••••••";

  return NextResponse.json({ agent });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const result = await resolveAgent(request, id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await request.json();

  // Never allow overwriting profile_id via body
  const allowed = [
    "name", "description", "purpose", "system_message", "model",
    "temperature", "max_tokens", "top_p", "thinking_mode", "context_window",
    "meta_access_token", "meta_phone_number_id", "meta_verify_token",
    "meta_api_version", "is_active", "auto_reply",
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      // Don't overwrite stored token with masked value
      if (key === "meta_access_token" && body[key] === "••••••••") continue;
      patch[key] = body[key];
    }
  }

  const { data, error } = await result.supabase
    .from("whatsapp_agents")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const masked = { ...data };
  if (masked.meta_access_token) masked.meta_access_token = "••••••••";

  return NextResponse.json({ agent: masked });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const result = await resolveAgent(request, id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

  const { error } = await result.supabase
    .from("whatsapp_agents")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
