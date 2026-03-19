import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileId } from "@/lib/profile";

// Send a Telegram message
async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.description || "Telegram API error");
  }
  return res.json();
}

// GET: fetch config + message log
export async function GET(request: NextRequest) {
  const profileId = getProfileId(request);
  const supabase = createAdminClient();

  const [configRes, messagesRes] = await Promise.all([
    supabase
      .from("telegram_config")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabase
      .from("telegram_messages")
      .select("*")
      .eq("profile_id", profileId)
      .order("sent_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    config: configRes.data || null,
    messages: messagesRes.data || [],
  });
}

// POST: send manual message or update config
export async function POST(request: NextRequest) {
  const profileId = getProfileId(request);
  const body = await request.json();
  const { action } = body;

  const supabase = createAdminClient();

  if (action === "save_config") {
    const {
      bot_token,
      chat_id,
      notify_new_lead,
      notify_new_order,
      notify_low_stock,
      notify_daily_summary,
      notify_new_inquiry,
      notify_payment_received,
      is_active,
    } = body;

    const { data, error } = await supabase
      .from("telegram_config")
      .upsert(
        {
          profile_id: profileId,
          bot_token,
          chat_id,
          notify_new_lead: notify_new_lead ?? true,
          notify_new_order: notify_new_order ?? true,
          notify_low_stock: notify_low_stock ?? false,
          notify_daily_summary: notify_daily_summary ?? false,
          notify_new_inquiry: notify_new_inquiry ?? true,
          notify_payment_received: notify_payment_received ?? true,
          is_active: is_active ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, config: data });
  }

  if (action === "test") {
    const { bot_token, chat_id } = body;
    if (!bot_token || !chat_id) {
      return NextResponse.json({ error: "bot_token and chat_id required" }, { status: 400 });
    }

    try {
      await sendTelegramMessage(
        bot_token,
        chat_id,
        `✅ <b>MobileHub CRM Connected!</b>\n\nYour Telegram bot is working correctly.\n\n📱 You'll now receive real-time alerts here.`
      );
      return NextResponse.json({ success: true, message: "Test message sent!" });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to send test message" },
        { status: 400 }
      );
    }
  }

  if (action === "send") {
    const { message } = body;
    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

    // Fetch config
    const { data: config } = await supabase
      .from("telegram_config")
      .select("bot_token, chat_id, is_active")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!config?.bot_token || !config?.chat_id) {
      return NextResponse.json({ error: "Telegram not configured" }, { status: 503 });
    }

    if (!config.is_active) {
      return NextResponse.json({ error: "Telegram notifications are disabled" }, { status: 503 });
    }

    try {
      await sendTelegramMessage(config.bot_token, config.chat_id, message);

      await supabase.from("telegram_messages").insert({
        profile_id: profileId,
        message,
        message_type: "manual",
        status: "sent",
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      await supabase.from("telegram_messages").insert({
        profile_id: profileId,
        message,
        message_type: "manual",
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
      });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to send" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
