import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

type Params = { params: Promise<{ id: string }> };

// GET — Meta Cloud API webhook challenge verification
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Look up the agent's verify token (no auth cookie needed — Meta calls this)
  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("whatsapp_agents")
    .select("meta_verify_token, is_active")
    .eq("id", id)
    .single();

  if (!agent || !agent.is_active || agent.meta_verify_token !== token) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

// POST — Receive Meta WhatsApp messages, call NVIDIA LLM, reply
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Acknowledge immediately (Meta requires 200 fast)
  const body = await request.json().catch(() => null);
  if (!body) return new NextResponse("OK", { status: 200 });

  // Process async
  processWebhook(id, body).catch((err) =>
    console.error(`[WA Agent ${id}] webhook error:`, err)
  );

  return new NextResponse("OK", { status: 200 });
}

const processedMessageIds = new Set<string>();

async function processWebhook(agentId: string, payload: unknown) {
  const supabase = await createClient();

  // Fetch agent config
  const { data: agent } = await supabase
    .from("whatsapp_agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (!agent || !agent.is_active || !agent.auto_reply) return;
  if (!agent.meta_access_token || !agent.meta_phone_number_id) return;

  const messages = extractMessages(payload);

  for (const msg of messages) {
    if (!msg.id || processedMessageIds.has(msg.id)) continue;
    processedMessageIds.add(msg.id);
    if (processedMessageIds.size > 5000) {
      const first = processedMessageIds.values().next().value;
      if (first) processedMessageIds.delete(first);
    }

    if (msg.type !== "text") {
      await sendMetaMessage(
        agent.meta_access_token,
        agent.meta_phone_number_id,
        agent.meta_api_version,
        msg.from,
        "I can currently only process text messages. Please send your question as text."
      );
      continue;
    }

    try {
      await markRead(agent.meta_access_token, agent.meta_phone_number_id, agent.meta_api_version, msg.id);

      // Load conversation history
      const { data: history } = await supabase
        .from("whatsapp_agent_conversations")
        .select("role, content")
        .eq("agent_id", agentId)
        .eq("customer_phone", msg.from)
        .order("created_at", { ascending: false })
        .limit(agent.context_window);

      const historyMessages = (history ?? []).reverse().map((h: { role: string; content: string }) => ({
        role: h.role,
        content: h.content,
      }));

      const nvidiaKey = process.env.NVIDIA_API_KEY;
      if (!nvidiaKey) throw new Error("NVIDIA_API_KEY not set");

      const chatMessages = [
        { role: "system", content: agent.system_message },
        ...historyMessages,
        { role: "user", content: msg.text.body },
      ];

      const nvidiaResp = await fetch(NVIDIA_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${nvidiaKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          model: agent.model,
          messages: chatMessages,
          max_tokens: agent.max_tokens,
          temperature: agent.temperature,
          top_p: agent.top_p,
          stream: false,
          ...(agent.thinking_mode ? { chat_template_kwargs: { thinking: true } } : {}),
        }),
      });

      if (!nvidiaResp.ok) {
        const errText = await nvidiaResp.text();
        throw new Error(`NVIDIA API ${nvidiaResp.status}: ${errText}`);
      }

      const nvidiaData = await nvidiaResp.json();
      const reply =
        nvidiaData.choices?.[0]?.message?.content?.trim() ??
        "Sorry, I could not generate a response right now.";

      // Send reply via Meta
      await sendMetaMessage(
        agent.meta_access_token,
        agent.meta_phone_number_id,
        agent.meta_api_version,
        msg.from,
        reply
      );

      // Store conversation history
      await supabase.from("whatsapp_agent_conversations").insert([
        { agent_id: agentId, customer_phone: msg.from, role: "user", content: msg.text.body },
        { agent_id: agentId, customer_phone: msg.from, role: "assistant", content: reply },
      ]);

      // Increment message count
      await supabase.rpc("increment_wa_agent_count", { agent_id: agentId }).catch(() => {
        // Fallback if RPC not defined yet
        supabase
          .from("whatsapp_agents")
          .update({ message_count: (agent.message_count ?? 0) + 1 })
          .eq("id", agentId);
      });
    } catch (err) {
      console.error(`[WA Agent ${agentId}] Failed to process msg:`, err);
    }
  }
}

function extractMessages(payload: unknown): Array<{
  id: string;
  from: string;
  type: string;
  text: { body: string };
}> {
  const p = payload as Record<string, unknown>;
  const entries = (p?.entry as unknown[]) ?? [];
  return entries.flatMap((entry) => {
    const e = entry as Record<string, unknown>;
    const changes = (e?.changes as unknown[]) ?? [];
    return changes.flatMap((change) => {
      const c = change as Record<string, unknown>;
      const value = c?.value as Record<string, unknown> | undefined;
      return (value?.messages as unknown[]) ?? [];
    });
  }) as Array<{ id: string; from: string; type: string; text: { body: string } }>;
}

async function sendMetaMessage(
  accessToken: string,
  phoneNumberId: string,
  apiVersion: string,
  to: string,
  text: string
) {
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Meta send API ${resp.status}: ${errText}`);
  }
}

async function markRead(
  accessToken: string,
  phoneNumberId: string,
  apiVersion: string,
  messageId: string
) {
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch(() => {});
}
