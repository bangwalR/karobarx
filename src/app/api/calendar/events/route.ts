import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileId } from "@/lib/profile";
import { google } from "googleapis";
import { Resend } from "resend";
import { Notifications } from "@/lib/notify";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ── Helper: build OAuth2 client from DB tokens ────────────────────────────────
async function getGoogleClient(profileId: string | null) {
  if (!profileId || !process.env.GOOGLE_CALENDAR_CLIENT_ID) return null;
  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("profile_id", profileId)
    .eq("is_connected", true)
    .maybeSingle();
  if (!tokenRow?.refresh_token) return null;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.token_expiry ? new Date(tokenRow.token_expiry).getTime() : undefined,
  });
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await supabase
        .from("google_calendar_tokens")
        .update({
          access_token: tokens.access_token,
          token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        })
        .eq("profile_id", profileId);
    }
  });
  return oauth2Client;
}

// ── Helper: send meeting invite email ────────────────────────────────────────
async function sendMeetingInvite(params: {
  attendeeEmails: string[];
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  location?: string;
  meetLink?: string;
}) {
  if (!resend || params.attendeeEmails.length === 0) return;
  const { attendeeEmails, title, description, start_at, end_at, location, meetLink } = params;
  const bizName = process.env.NEXT_PUBLIC_STORE_NAME || "MobileHub Delhi";
  const bizPhone = process.env.NEXT_PUBLIC_STORE_PHONE || "+91 99107 24940";
  const bizAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS || "Nehru Place, New Delhi";

  const startDate = new Date(start_at);
  const endDate = new Date(end_at);

  const fmtDate = startDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const fmtStartTime = startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const fmtEndTime = endDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const fmtShort = startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Invite: ${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:50%;width:56px;height:56px;line-height:56px;font-size:26px;margin-bottom:16px;">📅</div>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">${bizName}</h1>
            <p style="margin:0;color:rgba(196,181,253,0.9);font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:500;">You&rsquo;re Invited to a Meeting</p>
          </td>
        </tr>

        <!-- Title strip -->
        <tr>
          <td style="background:#6d28d9;padding:18px 40px;text-align:center;">
            <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${title}</h2>
          </td>
        </tr>

        <!-- Body card -->
        <tr>
          <td style="background:#1e1b2e;padding:36px 40px;">

            <!-- Date / Time block -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#2d1b69,#1e1b4b);border:1px solid #4c1d95;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 6px;color:#a78bfa;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">📅&nbsp; Date &amp; Time</p>
                  <p style="margin:0 0 4px;color:#ffffff;font-size:18px;font-weight:700;">${fmtDate}</p>
                  <p style="margin:0;color:#c4b5fd;font-size:15px;">${fmtStartTime} – ${fmtEndTime} IST</p>
                </td>
              </tr>
            </table>

            ${meetLink ? `
            <!-- Google Meet CTA — prominent hero block -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#064e3b,#065f46);border:1px solid #059669;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:28px;text-align:center;">
                  <div style="font-size:32px;margin-bottom:10px;">📹</div>
                  <p style="margin:0 0 6px;color:#6ee7b7;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Video Call Link</p>
                  <p style="margin:0 0 20px;color:#d1fae5;font-size:14px;">Click below to join the Google Meet call</p>
                  <a href="${meetLink}"
                     style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:700;letter-spacing:0.02em;box-shadow:0 4px 15px rgba(16,185,129,0.4);">
                    🎥&nbsp; Join Google Meet
                  </a>
                  <p style="margin:16px 0 0;font-size:11px;color:#6ee7b7;word-break:break-all;">
                    <a href="${meetLink}" style="color:#6ee7b7;text-decoration:underline;">${meetLink}</a>
                  </p>
                </td>
              </tr>
            </table>` : ""}

            ${location ? `
            <!-- Location -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#161224;border:1px solid #2d2640;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 6px;color:#a78bfa;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">📍&nbsp; Location</p>
                  <p style="margin:0;color:#e9d5ff;font-size:15px;font-weight:500;">${location}</p>
                </td>
              </tr>
            </table>` : ""}

            ${description ? `
            <!-- Agenda -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#161224;border:1px solid #2d2640;border-left:3px solid #7c3aed;border-radius:0 12px 12px 0;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 8px;color:#a78bfa;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">📝&nbsp; Agenda</p>
                  <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7;">${description.replace(/\n/g, "<br/>")}</p>
                </td>
              </tr>
            </table>` : ""}

            <!-- Tip box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border:1px solid #2d2640;border-radius:10px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                    💡 <strong style="color:#e5e7eb;">Tip:</strong> Add this event to your calendar and test your audio/video setup a few minutes before the meeting.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f0f1a;border-top:1px solid #1f1f35;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#6b7280;font-size:13px;">This invite was sent by <strong style="color:#a78bfa;">${bizName}</strong></p>
            <p style="margin:0;color:#4b5563;font-size:12px;">${bizAddress} &nbsp;·&nbsp; ${bizPhone}</p>
            <div style="margin-top:16px;height:1px;background:linear-gradient(to right,transparent,#374151,transparent);"></div>
            <p style="margin:14px 0 0;color:#374151;font-size:11px;">Powered by MobileHub CRM</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: `${bizName} <meetings@hiringround.online>`,
      to: attendeeEmails,
      subject: `📅 Meeting Invite: ${title} — ${fmtShort} · ${fmtStartTime} IST`,
      html,
    });
  } catch (e) {
    console.error("Meeting invite email error:", e);
  }
}

type GCalEventRow = {
  id: string; profile_id: string | null; title: string; description: string | null;
  event_type: string; start_at: string; end_at: string; location: string | null;
  status: string; google_event_id: string | null; google_meet_link: string | null;
  reminder_minutes: number; linked_lead_id: string | null; linked_customer_id: string | null;
  leads: null; customers: null; is_google_only: boolean;
};

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const profileId = getProfileId(request);
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const supabase = createAdminClient();

  let query = supabase
    .from("calendar_events")
    .select(`*, leads(id, name, phone), customers(id, name, phone)`)
    .order("start_at", { ascending: true });
  if (profileId) query = query.eq("profile_id", profileId);

  let startRange: string, endRange: string;
  if (month) {
    startRange = `${month}-01T00:00:00.000Z`;
    const [year, mon] = month.split("-").map(Number);
    const nm = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, "0")}`;
    endRange = `${nm}-01T00:00:00.000Z`;
    query = query.gte("start_at", startRange).lt("start_at", endRange);
  } else if (from && to) {
    startRange = from; endRange = to;
    query = query.gte("start_at", from).lte("end_at", to);
  } else {
    startRange = new Date().toISOString();
    endRange = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("start_at", startRange).lte("start_at", endRange);
  }

  const { data: localEvents, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pull and merge Google Calendar events
  const googleAuth = await getGoogleClient(profileId);
  let googleEvents: GCalEventRow[] = [];
  if (googleAuth) {
    try {
      const cal = google.calendar({ version: "v3", auth: googleAuth });
      const gcalRes = await cal.events.list({
        calendarId: "primary",
        timeMin: startRange,
        timeMax: endRange,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 100,
      });
      const existingIds = new Set((localEvents || []).map((e) => e.google_event_id).filter(Boolean));
      googleEvents = (gcalRes.data.items || [])
        .filter((ge) => ge.id && !existingIds.has(ge.id) && ge.status !== "cancelled")
        .map((ge) => ({
          id: `gcal_${ge.id}`,
          profile_id: profileId,
          title: ge.summary || "(No title)",
          description: ge.description || null,
          event_type: "other",
          start_at: ge.start?.dateTime || ge.start?.date || "",
          end_at: ge.end?.dateTime || ge.end?.date || "",
          location: ge.location || null,
          status: "scheduled",
          google_event_id: ge.id || null,
          google_meet_link: ge.hangoutLink || null,
          reminder_minutes: 30,
          linked_lead_id: null,
          linked_customer_id: null,
          leads: null,
          customers: null,
          is_google_only: true,
        }));
    } catch (e) {
      console.error("Google Calendar fetch error:", e);
    }
  }

  const allEvents = [...(localEvents || []), ...googleEvents].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  return NextResponse.json({ events: allEvents, google_connected: !!googleAuth });
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const profileId = getProfileId(request);
  const body = await request.json();
  const {
    title, description, event_type = "meeting", start_at, end_at,
    location, linked_lead_id, linked_customer_id, reminder_minutes = 30,
    attendee_emails = [],
  } = body;

  if (!title || !start_at || !end_at)
    return NextResponse.json({ error: "title, start_at, and end_at are required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("calendar_events")
    .insert({
      profile_id: profileId, title, description, event_type,
      start_at, end_at, location,
      linked_lead_id: linked_lead_id || null,
      linked_customer_id: linked_customer_id || null,
      reminder_minutes, status: "scheduled",
    })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const googleAuth = await getGoogleClient(profileId);
  let meetLink: string | null = null;

  if (googleAuth) {
    try {
      const cal = google.calendar({ version: "v3", auth: googleAuth });
      const attendees = (attendee_emails as string[]).filter(Boolean).map((e: string) => ({ email: e }));
      const gcalEvent = await cal.events.insert({
        calendarId: "primary",
        sendUpdates: attendees.length > 0 ? "all" : "none",
        conferenceDataVersion: event_type === "meeting" ? 1 : 0,
        requestBody: {
          summary: title,
          description: description || "",
          location: location || "",
          start: { dateTime: new Date(start_at).toISOString(), timeZone: "Asia/Kolkata" },
          end: { dateTime: new Date(end_at).toISOString(), timeZone: "Asia/Kolkata" },
          attendees,
          reminders: { useDefault: false, overrides: [{ method: "popup", minutes: reminder_minutes }, { method: "email", minutes: reminder_minutes }] },
          ...(event_type === "meeting" ? { conferenceData: { createRequest: { requestId: event.id, conferenceSolutionKey: { type: "hangoutsMeet" } } } } : {}),
        },
      });
      meetLink = gcalEvent.data.hangoutLink || null;
      await supabase.from("calendar_events").update({ google_event_id: gcalEvent.data.id, google_meet_link: meetLink }).eq("id", event.id);
      event.google_event_id = gcalEvent.data.id || null;
      event.google_meet_link = meetLink;
    } catch (e) {
      console.error("Google Calendar sync error:", e);
    }
  }

  if ((attendee_emails as string[]).length > 0) {
    await sendMeetingInvite({ attendeeEmails: attendee_emails, title, description, start_at, end_at, location, meetLink: meetLink || undefined });
  }

  // Push notification (non-blocking)
  Notifications.newConversation(
    "New Meeting Scheduled",
    `"${title}" on ${new Date(start_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
    profileId
  );

  return NextResponse.json({ event, google_synced: !!event.google_event_id }, { status: 201 });
}

// ── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const profileId = getProfileId(request);
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("google_event_id, title, description, start_at, end_at, location, reminder_minutes")
    .eq("id", id).maybeSingle();

  const { data: event, error } = await supabase
    .from("calendar_events")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.google_event_id) {
    const googleAuth = await getGoogleClient(profileId);
    if (googleAuth) {
      try {
        const cal = google.calendar({ version: "v3", auth: googleAuth });
        const merged = { ...existing, ...updates };
        await cal.events.patch({
          calendarId: "primary",
          eventId: existing.google_event_id,
          requestBody: {
            summary: merged.title,
            description: merged.description || "",
            location: merged.location || "",
            start: { dateTime: new Date(merged.start_at).toISOString(), timeZone: "Asia/Kolkata" },
            end: { dateTime: new Date(merged.end_at).toISOString(), timeZone: "Asia/Kolkata" },
            ...(merged.status === "cancelled" ? { status: "cancelled" } : {}),
          },
        });
      } catch (e) { console.error("Google Calendar update error:", e); }
    }
  }

  return NextResponse.json({ event });
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const profileId = getProfileId(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("calendar_events").select("google_event_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.google_event_id) {
    const googleAuth = await getGoogleClient(profileId);
    if (googleAuth) {
      try {
        const cal = google.calendar({ version: "v3", auth: googleAuth });
        await cal.events.delete({ calendarId: "primary", eventId: existing.google_event_id, sendUpdates: "all" });
      } catch (e) { console.error("Google Calendar delete error:", e); }
    }
  }

  return NextResponse.json({ success: true });
}
