import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { Resend } from "resend";
import { requireTenantContext } from "@/lib/tenant";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    const response = record.response as { body?: unknown } | undefined;
    if (response?.body) return JSON.stringify(response.body);
  }
  return "Failed to send email";
}

export async function POST(request: NextRequest) {
  const guard = await requireTenantContext(request, { module: "customers", action: "read" });
  if (!guard.ok) return guard.response;

  const resendApiKey = process.env.RESEND_API_KEY;
  const sendGridApiKey = process.env.SENDGRID_API_KEY;

  if (!resendApiKey && !sendGridApiKey) {
    return NextResponse.json(
      { error: "Email service not configured. Add RESEND_API_KEY or SENDGRID_API_KEY to your .env file." },
      { status: 503 }
    );
  }

  if (!resendApiKey && sendGridApiKey && !sendGridApiKey.startsWith("SG.")) {
    return NextResponse.json(
      { error: "SendGrid API key is invalid. It should start with SG. Update SENDGRID_API_KEY or use RESEND_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { to, subject, body, from_name, from_email } = payload;

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 }
      );
    }

    const recipients = Array.isArray(to) ? to : [to];
    const emailRecipients = recipients.map((email: unknown) => String(email).trim()).filter(Boolean);
    const invalidEmails = emailRecipients.filter((email) => !emailPattern.test(email));

    if (emailRecipients.length === 0) {
      return NextResponse.json({ error: "No email addresses provided" }, { status: 400 });
    }

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email address${invalidEmails.length > 1 ? "es" : ""}: ${invalidEmails.join(", ")}` },
        { status: 400 }
      );
    }

    const senderEmail = from_email || process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "invoices@hiringround.online";
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

    const textBody = body.replace(/<[^>]*>/g, "");
    const results = await Promise.allSettled(
      emailRecipients.map(async (email) => {
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          const { error } = await resend.emails.send({
            to: [email],
            from: `${senderName} <${senderEmail}>`,
            subject,
            html: htmlBody,
            text: textBody,
          });

          if (error) throw new Error(error.message);
          return;
        }

        sgMail.setApiKey(sendGridApiKey!);
        await sgMail.send({
          to: email,
          from: { email: senderEmail, name: senderName },
          subject,
          html: htmlBody,
          text: textBody,
        });
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => getErrorMessage(r.reason));

    if (sent === 0) {
      return NextResponse.json(
        { error: errors[0] || "Email failed to send", sent, failed, total: emailRecipients.length },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: emailRecipients.length,
      message: `Email sent to ${sent} recipient${sent !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`,
      errors,
    });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
