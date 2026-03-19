/**
 * Unified notification helper
 *
 * Sends via TWO channels simultaneously:
 * 1. ntfy.sh  — free, open-source push service. Works on Android/iOS/Web.
 *               No API key required. Users subscribe at ntfy.sh/<topic>
 *               or via the free ntfy mobile app.
 * 2. Web Push  — VAPID browser push to all subscribed devices.
 *               Subscriptions stored in `push_subscriptions` DB table.
 */

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Configure VAPID for web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.SENDGRID_FROM_EMAIL || "admin@hiringround.online"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface NotifyPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;         // Where to navigate on click
  tag?: string;         // Groups/replaces similar notifications
  urgency?: "min" | "low" | "default" | "high";
  profileId?: string | null;
  ntfyTopic?: string;   // Override ntfy topic (uses NTFY_TOPIC env if not set)
}

// ── ntfy.sh ──────────────────────────────────────────────────────────────────
async function sendNtfy(payload: NotifyPayload) {
  const topic =
    payload.ntfyTopic ||
    process.env.NTFY_TOPIC ||
    `mobilehub-${(payload.profileId || "default").slice(0, 8)}`;

  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(payload.urgency ? { Priority: payload.urgency === "high" ? "urgent" : payload.urgency } : {}),
        ...(payload.url ? { Click: payload.url } : {}),
        Tags: payload.tag || "bell",
      },
      body: JSON.stringify({
        topic,
        title: payload.title,
        message: payload.body,
        priority: payload.urgency === "high" ? 5 : payload.urgency === "low" ? 2 : 3,
        click: payload.url,
        icon: payload.icon || "https://ntfy.sh/static/img/ntfy.png",
      }),
    });
  } catch (e) {
    console.error("ntfy.sh push failed:", e);
  }
}

// ── Web Push (VAPID) ─────────────────────────────────────────────────────────
async function sendWebPush(payload: NotifyPayload) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const supabase = createAdminClient();
  let query = supabase.from("push_subscriptions").select("*");
  if (payload.profileId) query = query.eq("profile_id", payload.profileId);

  const { data: subscriptions } = await query;
  if (!subscriptions || subscriptions.length === 0) return;

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    url: payload.url || "/admin",
    tag: payload.tag,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        );
      } catch (err: unknown) {
        // 410 Gone = subscription expired, remove it
        if ((err as { statusCode?: number }).statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        throw err;
      }
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) console.warn(`Web push: ${failed}/${subscriptions.length} failed`);
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function notify(payload: NotifyPayload) {
  // Fire both channels concurrently, don't await (non-blocking)
  Promise.all([sendNtfy(payload), sendWebPush(payload)]).catch(console.error);
}

// ── Typed shortcuts for each event type ─────────────────────────────────────
export const Notifications = {
  newLead: (name: string, source: string, profileId?: string | null) =>
    notify({
      title: "🆕 New Lead",
      body: `${name} came in via ${source}`,
      tag: "new-lead",
      urgency: "high",
      url: "/admin/leads",
      profileId,
    }),

  newOrder: (orderNum: string, customer: string, amount: string, profileId?: string | null) =>
    notify({
      title: "💰 New Order",
      body: `${orderNum} · ${customer} · ₹${amount}`,
      tag: "new-order",
      urgency: "high",
      url: "/admin/orders",
      profileId,
    }),

  newInquiry: (customer: string, source: string, profileId?: string | null) =>
    notify({
      title: "📩 New Inquiry",
      body: `${customer} via ${source}`,
      tag: "new-inquiry",
      urgency: "default",
      url: "/admin/inquiries",
      profileId,
    }),

  calendarEvent: (title: string, minutesBefore: number, profileId?: string | null) =>
    notify({
      title: "📅 Upcoming Meeting",
      body: `"${title}" starts in ${minutesBefore} minutes`,
      tag: "calendar-reminder",
      urgency: "high",
      url: "/admin/calendar",
      profileId,
    }),

  newConversation: (customer: string, message: string, profileId?: string | null) =>
    notify({
      title: "💬 New WhatsApp Message",
      body: `${customer}: ${message.slice(0, 80)}`,
      tag: "new-message",
      urgency: "default",
      url: "/admin/conversations",
      profileId,
    }),
};
