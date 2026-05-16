import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileId } from "@/lib/profile";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const profileId = getProfileId(request);
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch agent — must belong to caller's profile
  const { data: agent, error: agentError } = await supabase
    .from("whatsapp_agents")
    .select("system_message, model, temperature, max_tokens, top_p, thinking_mode")
    .eq("id", id)
    .eq("profile_id", profileId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await request.json();
  // body.messages: { role: "user"|"assistant", content: string }[]
  const userMessages: { role: string; content: string }[] = body.messages ?? [];
  if (userMessages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) {
    return NextResponse.json({ error: "NVIDIA API key not configured" }, { status: 500 });
  }

  const messages = [
    { role: "system", content: agent.system_message },
    ...userMessages,
  ];

  const nvidiaPayload = {
    model: agent.model,
    messages,
    max_tokens: agent.max_tokens,
    temperature: agent.temperature,
    top_p: agent.top_p,
    stream: true,
    ...(agent.thinking_mode ? { chat_template_kwargs: { thinking: true } } : {}),
  };

  const nvidiaResp = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${nvidiaKey}`,
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    },
    body: JSON.stringify(nvidiaPayload),
  });

  if (!nvidiaResp.ok || !nvidiaResp.body) {
    const errText = await nvidiaResp.text();
    return NextResponse.json({ error: `NVIDIA API error: ${errText}` }, { status: nvidiaResp.status });
  }

  // Stream NVIDIA SSE back to client
  const stream = new ReadableStream({
    async start(controller) {
      const reader = nvidiaResp.body!.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
