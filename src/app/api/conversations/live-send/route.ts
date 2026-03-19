import { NextRequest, NextResponse } from "next/server";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// POST /api/conversations/live-send
export async function POST(req: NextRequest) {
  const { phone, chatId, message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Support both phone number or full chatId
  const target = phone || chatId;
  if (!target) {
    return NextResponse.json({ error: "phone or chatId required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${WA_BACKEND}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: target, message }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error || "Send failed" }, { status: res.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "WhatsApp backend is not running" }, { status: 503 });
  }
}
