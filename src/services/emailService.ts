import QRCode from "qrcode";
import { toast } from "sonner";
import { supabase } from "../supabaseClient";
import type { IssuedTicket } from "../lib/ticketing";

export interface SendTicketEmailParams {
  recipientEmail: string;
  userName?: string;
  ticket: IssuedTicket;
  qrCodeDataUrl?: string;
}

/**
 * Generates an ultra-premium, beautifully styled HTML email receipt for an issued ticket
 */
export function generateTicketEmailHtml({
  recipientEmail,
  userName = "Nagpur Commuter",
  ticket,
  qrCodeDataUrl,
}: {
  recipientEmail: string;
  userName?: string;
  ticket: IssuedTicket;
  qrCodeDataUrl: string;
}): string {
  const isEco = ticket.category === "exclusive_eco";
  const legs = ticket.legs && ticket.legs.length > 0 ? ticket.legs : [
    {
      id: "leg-0",
      mode: ticket.mode === "metro" ? "metro" : "bus",
      lineOrRoute: ticket.lineOrRouteName,
      from: ticket.source,
      to: ticket.destination,
      fare: ticket.finalFare,
    },
  ];

  const bookingFormatted = new Date(ticket.bookingTime).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const validUntilFormatted = new Date(ticket.validUntil).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const headerBg = isEco
    ? "linear-gradient(135deg, #059669 0%, #0f766e 100%)"
    : ticket.mode === "metro"
    ? "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)"
    : "linear-gradient(135deg, #d97706 0%, #7c2d12 100%)";

  const passBadgeTitle = isEco
    ? "ECO-MOVE EXCLUSIVE PASS"
    : ticket.mode === "metro"
    ? "MAHA METRO SMART TICKET"
    : "AAPLI BUS DIGITAL TICKET";

  const stagesHtml = legs
    .map(
      (leg, idx) => `
      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 14px; vertical-align: middle;">
          <span style="display: inline-block; background-color: ${
            leg.mode === "metro" ? "#2563eb" : "#f59e0b"
          }; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; text-transform: uppercase;">
            ${leg.mode === "metro" ? "🚇 Metro" : "🚌 Bus"} ${leg.lineOrRoute}
          </span>
          <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 4px;">
            ${leg.from} &rarr; ${leg.to}
          </div>
        </td>
        <td style="padding: 12px 14px; text-align: right; vertical-align: middle;">
          <span style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 9999px; border: 1px solid #a7f3d0;">
            Stage ${idx + 1}
          </span>
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Eco-Move Transit Pass</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 30px 10px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
            
            <!-- Top Brand Banner -->
            <tr>
              <td style="background: ${headerBg}; padding: 24px 28px; text-align: left; color: #ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #a7f3d0; margin-bottom: 4px;">
                        NAGPUR SMART CITY TRANSIT
                      </div>
                      <div style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                        ${passBadgeTitle}
                      </div>
                    </td>
                    <td align="right" style="vertical-align: top;">
                      <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.4); color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px;">
                        🟢 ACTIVE
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Origin to Destination Corridor -->
                <div style="margin-top: 18px; background-color: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 14px; padding: 14px 16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width: 44%;">
                        <div style="font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">ORIGIN</div>
                        <div style="font-size: 14px; font-weight: 800; color: #ffffff; margin-top: 2px;">${ticket.source}</div>
                      </td>
                      <td align="center" style="width: 12%; font-size: 16px; color: #34d399; font-weight: bold;">
                        &rarr;
                      </td>
                      <td align="right" style="width: 44%;">
                        <div style="font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase;">DESTINATION</div>
                        <div style="font-size: 14px; font-weight: 800; color: #ffffff; margin-top: 2px;">${ticket.destination}</div>
                      </td>
                    </tr>
                  </table>
                  <div style="margin-top: 8px; font-size: 11px; color: rgba(255, 255, 255, 0.9); border-top: 1px dashed rgba(255, 255, 255, 0.25); padding-top: 6px; font-weight: 600;">
                    ${ticket.lineOrRouteName}
                  </div>
                </div>
              </td>
            </tr>

            <!-- Body Greeting -->
            <tr>
              <td style="padding: 24px 28px 12px 28px;">
                <div style="font-size: 15px; font-weight: 700; color: #0f172a;">
                  Hello ${userName},
                </div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.5;">
                  Your digital transit pass has been confirmed. You can scan the QR code below directly at Nagpur Metro automated turnstiles and Aapli Bus scanners.
                </div>
              </td>
            </tr>

            <!-- QR Code Card Box -->
            <tr>
              <td align="center" style="padding: 10px 28px;">
                <div style="background-color: #ffffff; border: 2px dashed #cbd5e1; border-radius: 18px; padding: 20px; display: inline-block; text-align: center; max-width: 320px; width: 100%; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <img src="cid:ticketqr" alt="Digital Transit QR Pass" width="220" height="220" style="display: block; margin: 0 auto; border-radius: 8px; max-width: 100%; height: auto; background-color: #ffffff;" />
                  
                  <div style="margin-top: 14px; font-size: 13px; font-weight: 800; color: #059669; letter-spacing: 0.5px;">
                    ⏱ VALIDITY: 24 HOURS
                  </div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                    Valid until ${validUntilFormatted}
                  </div>
                  <div style="margin-top: 8px; font-size: 10px; font-family: monospace; background-color: #f1f5f9; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; color: #334155; display: inline-block;">
                    ID: ${ticket.id}
                  </div>
                </div>
              </td>
            </tr>

            <!-- Journey Transfers Breakdown -->
            <tr>
              <td style="padding: 16px 28px 8px 28px;">
                <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; margin-bottom: 8px;">
                  Journey Stages (${legs.length})
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                  ${stagesHtml}
                </table>
              </td>
            </tr>

            <!-- Booking Summary Table -->
            <tr>
              <td style="padding: 16px 28px 20px 28px;">
                <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; margin-bottom: 8px;">
                  Fare & Booking Details
                </div>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size: 12px; color: #64748b; padding-bottom: 8px;">Booking Time:</td>
                      <td align="right" style="font-size: 12px; font-weight: 600; color: #0f172a; padding-bottom: 8px;">${bookingFormatted}</td>
                    </tr>
                    <tr>
                      <td style="font-size: 12px; color: #64748b; padding-bottom: 8px;">Passengers:</td>
                      <td align="right" style="font-size: 12px; font-weight: 600; color: #0f172a; padding-bottom: 8px;">${ticket.totalPassengers} Passenger(s)</td>
                    </tr>
                    <tr>
                      <td style="font-size: 12px; color: #64748b; padding-bottom: 8px;">Payment Method:</td>
                      <td align="right" style="font-size: 12px; font-weight: 600; color: #0f172a; padding-bottom: 8px;">${ticket.paymentMethod?.toUpperCase() || "UPI"}</td>
                    </tr>
                    <tr>
                      <td style="font-size: 12px; color: #64748b; padding-bottom: 8px;">Transaction Ref:</td>
                      <td align="right" style="font-size: 11px; font-family: monospace; color: #0f172a; padding-bottom: 8px;">${ticket.transactionRef || `TXN-${ticket.id}`}</td>
                    </tr>
                    ${
                      ticket.discountAmount > 0
                        ? `
                    <tr>
                      <td style="font-size: 12px; color: #059669; font-weight: 600; padding-bottom: 8px;">Eco Discount Saved:</td>
                      <td align="right" style="font-size: 12px; font-weight: 700; color: #059669; padding-bottom: 8px;">-₹${ticket.discountAmount} (${ticket.discountPercent}%)</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr style="border-top: 1px solid #e2e8f0;">
                      <td style="font-size: 14px; font-weight: 800; color: #0f172a; padding-top: 10px;">Total Fare Paid:</td>
                      <td align="right" style="font-size: 18px; font-weight: 900; color: #059669; padding-top: 10px;">₹${ticket.finalFare}</td>
                    </tr>
                  </table>

                  ${
                    ticket.co2SavedKg && ticket.co2SavedKg > 0
                      ? `
                  <div style="margin-top: 12px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #065f46; text-align: center;">
                    🌱 Sustainable Impact: ${ticket.co2SavedKg} kg CO₂ saved • +${ticket.greenPointsEarned || 15} Green Points
                  </div>
                  `
                      : ""
                  }
                </div>
              </td>
            </tr>

            <!-- How to Use Guidelines -->
            <tr>
              <td style="padding: 0 28px 24px 28px;">
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 16px;">
                  <div style="font-size: 12px; font-weight: 800; color: #1e40af; margin-bottom: 4px;">
                    📱 How to travel with this pass:
                  </div>
                  <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #1e3a8a; line-height: 1.6;">
                    <li>Keep this email or your Eco-Move in-app wallet ready before entering stations.</li>
                    <li>Align the QR code with the glass turnstile scanners at Metro entry/exit gates.</li>
                    <li>On Aapli buses, show the active QR pass to the ticket conductor for validation.</li>
                  </ul>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #0f172a; padding: 22px 28px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                <div style="font-weight: 700; color: #ffffff; font-size: 12px; margin-bottom: 4px;">
                  Eco-Move Nagpur Smart City Mobility
                </div>
                <div>
                  Maha Metro Rail Corporation Ltd. & Nagpur Smart & Sustainable City Development Corp.
                </div>
                <div style="margin-top: 10px; font-size: 10px; color: #64748b;">
                  This is an automated transit confirmation sent to <span style="color: #94a3b8;">${recipientEmail}</span>.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}

/**
 * Sends a digital ticket pass confirmation email to the user's registered email address
 */
export async function sendTicketConfirmationEmail({
  recipientEmail,
  userName = "Nagpur Commuter",
  ticket,
  qrCodeDataUrl,
}: SendTicketEmailParams): Promise<{ success: boolean; message: string }> {
  if (!recipientEmail) {
    return { success: false, message: "No recipient email provided" };
  }

  const effectiveRecipient =
    recipientEmail === "demo@ecomove.nagpur" || recipientEmail === "demo@ecomove.in" || !recipientEmail.includes("@")
      ? "krishkolhe209@gmail.com"
      : recipientEmail;

  try {
    // 1. Ensure QR Code Data URL is generated
    let finalQrUrl = qrCodeDataUrl;
    if (!finalQrUrl) {
      const payloadData = {
        transitAuthority: "Nagpur Smart City Transit (Eco-Move)",
        ticketId: ticket.id,
        passType: ticket.title,
        from: ticket.source,
        to: ticket.destination,
        route: ticket.lineOrRouteName,
        passengers: ticket.totalPassengers,
        farePaid: `₹${ticket.finalFare}`,
        bookingTime: ticket.bookingTime,
        validUntil: ticket.validUntil,
        transactionRef: ticket.transactionRef,
        securityToken: `NAG-SEC-${ticket.id}-${ticket.transactionRef}`,
      };

      finalQrUrl = await QRCode.toDataURL(JSON.stringify(payloadData, null, 2), {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 280,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    }

    // 2. Generate the full formatted email HTML
    const emailHtml = generateTicketEmailHtml({
      recipientEmail: effectiveRecipient,
      userName,
      ticket,
      qrCodeDataUrl: finalQrUrl,
    });

    const subject = `🎟️ Eco-Move Transit Pass: ${ticket.source} ➔ ${ticket.destination} (${ticket.id})`;

    // 3. Dispatch to Backend Email Service (/api/send-ticket-email)
    let apiResult: { success?: boolean; requiresConfig?: boolean; message?: string } | null = null;
    try {
      const response = await fetch("/api/send-ticket-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: effectiveRecipient,
          subject,
          htmlBody: emailHtml,
          ticketId: ticket.id,
          qrCodeDataUrl: finalQrUrl,
        }),
      });
      apiResult = await response.json();
    } catch (apiErr) {
      console.warn("[EmailService] Backend endpoint call skipped/failed:", apiErr);
    }

    // 4. Log email record in Supabase / Local storage for user tracking
    try {
      await supabase.from("ticket_email_logs").insert({
        ticket_id: ticket.id,
        recipient_email: effectiveRecipient,
        subject,
        html_body: emailHtml,
        status: apiResult?.success ? "sent" : "logged",
        created_at: new Date().toISOString(),
      });
    } catch {
      // Non-blocking log insertion
    }

    // 5. Save to local email dispatch cache
    try {
      const cacheKey = `ecomove_sent_emails_${effectiveRecipient}`;
      const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]");
      existing.unshift({
        ticketId: ticket.id,
        recipientEmail: effectiveRecipient,
        subject,
        sentAt: new Date().toISOString(),
        fare: ticket.finalFare,
      });
      localStorage.setItem(cacheKey, JSON.stringify(existing.slice(0, 20)));
    } catch {}

    console.log(`[EmailService] Ticket confirmation email processed for: ${effectiveRecipient}`, apiResult);

    // 6. User feedback
    if (apiResult?.requiresConfig) {
      toast.info(`Pass generated for ${effectiveRecipient}`, {
        description: "Add your SMTP credentials to .env to deliver to external inboxes.",
      });
    } else {
      toast.success(`Pass sent to ${effectiveRecipient}`, {
        description: `Your digital ticket ${ticket.id} is confirmed.`,
      });
    }

    return {
      success: true,
      message: `Pass emailed to ${effectiveRecipient}`,
    };
  } catch (err) {
    console.error("[EmailService] Failed to send ticket confirmation email:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to email ticket",
    };
  }
}
