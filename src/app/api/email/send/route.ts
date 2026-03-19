import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { getProfileId } from "@/lib/profile";

export async function POST(request: NextRequest) {
  const profileId = getProfileId(request);

  if (!process.env.SENDGRID_API_KEY) {
    return NextResponse.json(
      { error: "SendGrid API key not configured. Add SENDGRID_API_KEY to your .env.local file." },
      { status: 503 }
    );
  }

  try {
    const { to, subject, body, from_name, from_email } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 }
      );
    }

    const recipients = Array.isArray(to) ? to : [to];
    const validEmails = recipients.filter((e: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    );

    if (validEmails.length === 0) {
      return NextResponse.json({ error: "No valid email addresses provided" }, { status: 400 });
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const senderEmail = from_email || process.env.SENDGRID_FROM_EMAIL || "noreply@hiringround.online";
    const senderName = from_name || process.env.NEXT_PUBLIC_STORE_NAME || "MobileHub Delhi";

    const htmlBody = body.includes("<") ? body : `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <div style="background: linear-gradient(135deg, #f97316, #dc2626); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">${senderName}</h1>
          </div>
          <div style="padding: 32px;">
            ${body.split("\n").map((line: string) => `<p style="color: #374151; margin: 0 0 16px; line-height: 1.6;">${line}</p>`).join("")}
          </div>
          <div style="background: #f3f4f6; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Sent by ${senderName} • ${process.env.NEXT_PUBLIC_STORE_ADDRESS || "New Delhi"}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const messages = validEmails.map((email: string) => ({
      to: email,
      from: { email: senderEmail, name: senderName },
      subject,
      html: htmlBody,
      text: body.replace(/<[^>]*>/g, ""),
    }));

    // Send individually to personalise + track opens
    const results = await Promise.allSettled(
      messages.map((msg) => sgMail.send(msg))
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: validEmails.length,
      message: `Email sent to ${sent} recipient${sent !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`,
    });
  } catch (error) {
    console.error("SendGrid error:", error);
    const errMsg = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
