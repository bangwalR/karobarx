import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || "",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// POST /api/ai/chat - AI Assistant endpoint
export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json({
        error: "NVIDIA API key not configured. Please add NVIDIA_API_KEY to .env file.",
      }, { status: 500 });
    }

    const systemPrompt = `You are an AI business assistant for a mobile phone CRM system. Answer questions based on the live business data provided below.

LIVE BUSINESS DATA:
${context?.stats ? `
Revenue this month: ${context.stats?.revenue?.thisMonthFormatted} (${context.stats?.revenue?.growth > 0 ? "+" : ""}${context.stats?.revenue?.growth}% vs last month)
Total revenue: ${context.stats?.revenue?.formatted}
Total profit: ${context.stats?.profit?.formatted}

Inventory: ${context.stats?.inventory?.available} phones available, ${context.stats?.inventory?.sold} sold, ${context.stats?.inventory?.reserved} reserved
Inventory value: ${context.stats?.inventory?.valueFormatted}

Orders: ${context.stats?.orders?.thisMonth} this month, ${context.stats?.orders?.pending} pending, ${context.stats?.orders?.completed} completed

Customers: ${context.stats?.customers?.total} total, ${context.stats?.customers?.vip} VIP, ${context.stats?.customers?.newThisMonth} new this month

Inquiries: ${context.stats?.inquiries?.new} new, ${context.stats?.inquiries?.today} today, ${context.stats?.inquiries?.whatsapp} from WhatsApp, ${context.stats?.inquiries?.conversionRate}% conversion rate
` : "No dashboard stats available."}

SOCIAL MEDIA LEADS (${context?.leads?.period || "last 30 days"}):
${context?.leads ? `
Instagram leads: ${context.leads.instagram?.total} total — ${context.leads.instagram?.new} new, ${context.leads.instagram?.interested} interested, ${context.leads.instagram?.converted} converted
Recent Instagram leads: ${context.leads.instagram?.recent?.map((l: {name: string; status: string}) => `${l.name} (${l.status})`).join(", ") || "none"}

Facebook leads: ${context.leads.facebook?.total} total — ${context.leads.facebook?.new} new, ${context.leads.facebook?.interested} interested, ${context.leads.facebook?.converted} converted
Recent Facebook leads: ${context.leads.facebook?.recent?.map((l: {name: string; status: string}) => `${l.name} (${l.status})`).join(", ") || "none"}

WhatsApp leads: ${context.leads.whatsapp?.total} total — ${context.leads.whatsapp?.new} new, ${context.leads.whatsapp?.interested} interested, ${context.leads.whatsapp?.converted} converted
Recent WhatsApp leads: ${context.leads.whatsapp?.recent?.map((l: {name: string; status: string}) => `${l.name} (${l.status})`).join(", ") || "none"}

Total leads across all platforms: ${context.leads.total}
` : "No leads data available."}

Be concise and use the actual numbers from the data above when answering. If asked about something not in the data, say so clearly.`;

    console.log("[AI Chat] Sending request to NVIDIA API...");
    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: "google/gemma-2-2b-it",
      messages: [
        // Gemma doesn't support system role — prepend context to user message
        { role: "user", content: `${systemPrompt}\n\nUser question: ${message}` },
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      stream: false,
    });

    const duration = Date.now() - startTime;
    console.log(`[AI Chat] Response received in ${duration}ms`);

    const response = completion.choices[0]?.message?.content || "No response";

    return NextResponse.json({ success: true, response, usage: completion.usage });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number; code?: string };
    console.error("[AI Chat] Error:", error);

    let errorMessage = "AI service is temporarily unavailable. Please try again.";
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      errorMessage = "Request timed out.";
    } else if (error.status === 401) {
      errorMessage = "Invalid API key.";
    } else if (error.status === 429) {
      errorMessage = "Rate limit exceeded. Please wait and try again.";
    } else if (error.status === 404) {
      errorMessage = "Model not found.";
    }

    return NextResponse.json({
      error: errorMessage,
      details: error.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST method." }, { status: 501 });
}
