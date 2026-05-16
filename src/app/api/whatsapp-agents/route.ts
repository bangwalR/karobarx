import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const profileId = getProfileId(request);

  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("whatsapp_agents")
    .select("id, name, description, purpose, system_message, model, temperature, max_tokens, top_p, thinking_mode, context_window, meta_phone_number_id, meta_verify_token, meta_api_version, is_active, auto_reply, message_count, created_at, updated_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ agents: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const profileId = getProfileId(request);

  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("whatsapp_agents")
    .insert({
      profile_id: profileId,
      name: body.name,
      description: body.description ?? null,
      purpose: body.purpose ?? "general",
      system_message: body.system_message ?? "You are a helpful WhatsApp assistant.",
      model: body.model ?? "moonshotai/kimi-k2.6",
      temperature: body.temperature ?? 1.0,
      max_tokens: body.max_tokens ?? 1024,
      top_p: body.top_p ?? 1.0,
      thinking_mode: body.thinking_mode ?? true,
      context_window: body.context_window ?? 10,
      meta_access_token: body.meta_access_token ?? null,
      meta_phone_number_id: body.meta_phone_number_id ?? null,
      meta_verify_token: body.meta_verify_token ?? null,
      meta_api_version: body.meta_api_version ?? "v25.0",
      is_active: body.is_active ?? false,
      auto_reply: body.auto_reply ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ agent: data }, { status: 201 });
}
