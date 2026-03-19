import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN =
  process.env.META_WEBHOOK_VERIFY_TOKEN || "mobilehub_verify_token";

// GET — Instagram webhook verification handshake
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[IG Webhook] Verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }
  console.warn("[IG Webhook] Verification failed — bad token");
  return new NextResponse("Forbidden", { status: 403 });
}

// POST — receive real-time Instagram DM / comment events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[IG Webhook] Received:", JSON.stringify(body).slice(0, 300));

    for (const entry of body.entry || []) {
      // Direct messages
      for (const msg of entry.messaging || []) {
        if (msg.message && !msg.message.is_echo) {
          console.log(
            `[IG Webhook] DM from ${msg.sender?.id}: "${msg.message?.text}"`
          );
          // TODO: persist to instagram_messages table or push to UI via SSE
        }
        // Read receipts
        if (msg.read) {
          console.log(`[IG Webhook] Read receipt from ${msg.sender?.id}`);
        }
        // Delivery receipt
        if (msg.delivery) {
          console.log(`[IG Webhook] Delivery from ${msg.sender?.id}`);
        }
      }

      // Comments / mentions
      for (const change of entry.changes || []) {
        if (change.field === "comments" || change.field === "mentions") {
          console.log("[IG Webhook] Comment/mention:", change.value);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[IG Webhook] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
