import { NextRequest, NextResponse } from "next/server";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// GET /api/conversations/live-chats
export async function GET() {
  try {
    const res = await fetch(`${WA_BACKEND}/chats`, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "WA backend error", chats: [] }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[live-chats] Error:', err.message);
    return NextResponse.json({ error: "WhatsApp backend is not running", chats: [] }, { status: 503 });
  }
}
