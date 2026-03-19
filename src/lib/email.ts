import { Resend } from "resend";

// Initialize Resend only if API key is present to avoid build errors
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

interface SendInvoiceEmailParams {
  to: string;
  customerName: string;
  orderNumber: string;
  amount: string;
  pdfBuffer: Uint8Array;
}

export async function sendInvoiceEmail({
  to,
  customerName,
  orderNumber,
  amount,
  pdfBuffer,
}: SendInvoiceEmailParams) {
  if (!resend) {
    console.warn("RESEND_API_KEY is missing. Email sending skipped.");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "MobileHub Delhi <invoices@hiringround.online>",
    to: [to],
    subject: `Your Invoice ${orderNumber} - MobileHub Delhi`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">MobileHub Delhi</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px;">Premium Second-Hand Mobiles</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 25px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">
                Hi <strong>${customerName}</strong>,
              </p>
              
              <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 25px;">
                Thank you for your purchase! Please find your invoice attached to this email.
              </p>
              
              <!-- Order Summary Box -->
              <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #9a3412; margin: 0 0 15px; font-size: 16px;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #6b7280; padding: 5px 0; font-size: 14px;">Order Number:</td>
                    <td style="color: #1f2937; font-weight: bold; text-align: right; font-size: 14px;">${orderNumber}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 5px 0; font-size: 14px;">Amount Paid:</td>
                    <td style="color: #16a34a; font-weight: bold; text-align: right; font-size: 16px;">${amount}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Warranty Info -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 25px;">
                <p style="color: #15803d; margin: 0; font-size: 14px;">
                  ✅ Your purchase comes with a <strong>7-day replacement warranty</strong>
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                If you have any questions about your order, feel free to reach out to us on WhatsApp at 
                <a href="https://wa.me/919910724940" style="color: #f97316; text-decoration: none; font-weight: bold;">+91 99107 24940</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #1f2937; padding: 25px 20px; text-align: center;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0 0 10px;">
                Thank you for choosing MobileHub Delhi!
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Laxmi Nagar, Delhi 110092 | +91 99107 24940
              </p>
            </div>
            
          </div>
        </body>
      </html>
    `,
    attachments: [
      {
        filename: `Invoice-${orderNumber}.pdf`,
        content: Buffer.from(pdfBuffer),
      },
    ],
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: "Failed to send email" };
  }
}
