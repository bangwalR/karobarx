import { NextRequest, NextResponse } from "next/server";

const WA_BACKEND = process.env.NEXT_PUBLIC_WA_BACKEND_URL || "http://localhost:3001";

// GET /api/conversations/live-messages/[chatId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const limit = req.nextUrl.searchParams.get("limit") || "50";

  try {
    const encodedId = encodeURIComponent(chatId);
    const res = await fetch(`${WA_BACKEND}/messages/${encodedId}?limit=${limit}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "WA backend error" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[live-messages] Error:', err.message);
    return NextResponse.json({ error: "WhatsApp backend is not running" }, { status: 503 });
  }
}
