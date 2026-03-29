/**
 * Trust Your Food — Farmer Notification Service
 * Sends email (nodemailer/Gmail) and SMS (Twilio) to every farmer whose
 * products appear in a new order.
 *
 * Demo / dev mode fallbacks:
 *   • If GMAIL_USER is not set → logs formatted email box to console
 *   • If TWILIO_ACCOUNT_SID is not set → logs formatted SMS to console
 */

import twilio from 'twilio';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, '../../.env'), override: true });

// ─── Startup config check (called from server.js) ─────────────────────────────

export function logNotificationConfig() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;

  const gmailOk = gmailUser && gmailUser !== 'your_gmail_here';
  const twilioOk = twilioSid && twilioSid !== 'your_sid';

  console.log('[notify] Gmail configured:', gmailOk ? `yes (${gmailUser})` : 'NO — will use demo console fallback');
  console.log('[notify] Gmail password:  ', gmailPass ? `set (${gmailPass.length} chars)` : 'MISSING');
  console.log('[notify] Twilio configured:', twilioOk ? 'yes' : 'NO — will use demo console fallback');
}

// ─── HTML email builder ───────────────────────────────────────────────────────

function buildEmailHTML(farmer, od) {
  const isDirect = od.deliveryType === 'direct';

  // Delivery badge
  const badge = isDirect
    ? `<div style="background:#fff5eb;border:1.5px solid #ed8936;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
         <span style="color:#c05621;font-size:15px;font-weight:700;">⚡ Direct Delivery — pickup today by ${od.deliveryWindow.startTime}</span>
       </div>`
    : `<div style="background:#f0faf3;border:1.5px solid #48bb78;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
         <span style="color:#276749;font-size:15px;font-weight:700;">🌿 Group Delivery — pickup ${od.deliveryWindow.label}</span>
       </div>`;

  // Item rows
  const itemRows = od.farmerItems
    .map(
      (item) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:12px 14px;color:#2d3748;font-size:15px;">${item.productName}</td>
        <td style="text-align:center;padding:12px 14px;color:#2d3748;font-size:15px;">${item.quantity}</td>
        <td style="text-align:right;padding:12px 14px;color:#718096;font-size:15px;">$${Number(item.price).toFixed(2)}</td>
        <td style="text-align:right;padding:12px 14px;color:#2d3748;font-size:15px;font-weight:600;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const farmerTotal = od.farmerItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/routes`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New Order — Trust Your Food</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;
                 overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

          <!-- ── Green header bar ── -->
          <tr>
            <td style="background:#2d6a4f;padding:26px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                🌿 Trust Your Food
              </h1>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:32px;">

              <h2 style="margin:0 0 6px;color:#1a3a2a;font-size:22px;font-weight:700;">
                Hi ${farmer.name},
              </h2>
              <p style="margin:0 0 26px;color:#555555;font-size:16px;line-height:1.55;">
                You have a new order! Here are the details.
              </p>

              ${badge}

              <!-- Items table -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;
                       overflow:hidden;margin:0 0 24px;">
                <tr style="background:#f8faf9;">
                  <th style="text-align:left;padding:10px 14px;font-size:11px;color:#718096;
                              text-transform:uppercase;letter-spacing:0.06em;font-weight:700;
                              border-bottom:1px solid #e2e8f0;">Product</th>
                  <th style="text-align:center;padding:10px 14px;font-size:11px;color:#718096;
                              text-transform:uppercase;letter-spacing:0.06em;font-weight:700;
                              border-bottom:1px solid #e2e8f0;">Qty</th>
                  <th style="text-align:right;padding:10px 14px;font-size:11px;color:#718096;
                              text-transform:uppercase;letter-spacing:0.06em;font-weight:700;
                              border-bottom:1px solid #e2e8f0;">Unit Price</th>
                  <th style="text-align:right;padding:10px 14px;font-size:11px;color:#718096;
                              text-transform:uppercase;letter-spacing:0.06em;font-weight:700;
                              border-bottom:1px solid #e2e8f0;">Total</th>
                </tr>
                ${itemRows}
                <tr style="background:#f8faf9;">
                  <td colspan="3"
                    style="text-align:right;padding:12px 14px;font-weight:700;
                           color:#1a3a2a;font-size:15px;border-top:2px solid #c6e8d3;">
                    Your payout:
                  </td>
                  <td style="text-align:right;padding:12px 14px;font-weight:700;
                             color:#2d6a4f;font-size:18px;border-top:2px solid #c6e8d3;">
                    $${farmerTotal.toFixed(2)}
                  </td>
                </tr>
              </table>

              <!-- Delivery address -->
              <div style="background:#f8faf9;border:1px solid #e2e8f0;border-radius:8px;
                          padding:16px 18px;margin:0 0 28px;">
                <p style="margin:0 0 5px;font-size:11px;color:#718096;
                           text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">
                  Customer Delivery Address
                </p>
                <p style="margin:0;color:#2d3748;font-size:15px;font-weight:600;">
                  ${od.deliveryAddress || 'Not provided'}
                </p>
                <p style="margin:5px 0 0;font-size:13px;color:#718096;">
                  Ordered by: ${od.customerName}
                  ${od.customerEmail ? `&nbsp;·&nbsp; ${od.customerEmail}` : ''}
                </p>
              </div>

              <!-- CTA button -->
              <div style="text-align:center;margin:0 0 8px;">
                <a href="${dashboardUrl}"
                  style="display:inline-block;background:#2d6a4f;color:#ffffff;
                         text-decoration:none;padding:15px 40px;border-radius:8px;
                         font-size:16px;font-weight:700;letter-spacing:-0.2px;">
                  View Order Dashboard →
                </a>
              </div>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f8faf9;padding:18px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#a0aec0;font-size:13px;text-align:center;line-height:1.6;">
                Reply to this email with any questions.
                &nbsp;·&nbsp;
                Trust Your Food, New Haven CT
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Text summary for demo console output ────────────────────────────────────

function buildTextSummary(farmer, od) {
  const isDirect = od.deliveryType === 'direct';
  const lines = [
    `  Hi ${farmer.name} (${farmer.farmName}),`,
    `  New order from: ${od.customerName}${od.customerEmail ? ` <${od.customerEmail}>` : ''}`,
    `  Delivery: ${isDirect ? '⚡ Direct' : '🌿 Group'} — ${od.deliveryWindow.label}`,
    ``,
    `  Items:`,
    ...od.farmerItems.map(
      (i) =>
        `    • ${i.productName}  ×${i.quantity}  @  $${Number(i.price).toFixed(2)}  =  $${(i.price * i.quantity).toFixed(2)}`
    ),
    ``,
    `  Your payout: $${od.farmerItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}`,
    `  Deliver to:  ${od.deliveryAddress || 'address not provided'}`,
    `  Dashboard:   ${process.env.FRONTEND_URL || 'http://localhost:5173'}/routes`,
  ];
  return lines.join('\n');
}

// ─── sendFarmerNotification (email) ──────────────────────────────────────────

export async function sendFarmerNotification(farmer, od) {
  const subject = '🌿 New Order — Trust Your Food';
  const html = buildEmailHTML(farmer, od);
  const to = farmer.email;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const demoMode = !gmailUser || gmailUser === 'your_gmail_here';

  console.log(`[notify] Attempting to send farmer notification to: ${to || '[no email]'} (${farmer.name})`);
  console.log(`[notify] Gmail mode: ${demoMode ? 'DEMO (console fallback)' : `LIVE → ${gmailUser}`}`);

  if (!to && !demoMode) {
    console.warn(`[notify] Skipping email for ${farmer.name} — no email address on record`);
    return;
  }

  if (demoMode) {
    // ── Demo mode: print clearly formatted email to terminal ──────────────
    const divider = '='.repeat(62);
    const thin    = '-'.repeat(62);
    console.log('\n' + divider);
    console.log('  EMAIL NOTIFICATION  (DEMO -- no Gmail credentials set)');
    console.log(divider);
    console.log(`  TO:      ${to || '[no email on farmer record]'}`);
    console.log(`  SUBJECT: ${subject}`);
    console.log(thin);
    console.log(buildTextSummary(farmer, od));
    console.log(divider + '\n');
    return;
  }

  // ── Live mode: send via Gmail ─────────────────────────────────────────────
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    });

    // Verify connection before sending
    await transporter.verify();
    console.log(`[notify] Gmail transporter verified OK`);

    const info = await transporter.sendMail({
      from: `"Trust Your Food" <${gmailUser}>`,
      to,
      subject,
      html,
    });

    console.log(`[notify] Farmer notification sent to: ${to}  (${farmer.name}) — messageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[notify] EMAIL FAILED for ${farmer.name} <${to}>`);
    console.error(`[notify]   Error code:    ${err.code}`);
    console.error(`[notify]   Error message: ${err.message}`);
    console.error(`[notify]   Response:      ${err.response || 'none'}`);
    // Rethrow so the .catch() in orders.js also logs it
    throw err;
  }
}

// ─── sendFarmerSMS (Twilio — falls back to console in demo mode) ─────────────

export async function sendFarmerSMS(farmer, od) {
  const isDirect = od.deliveryType === 'direct';

  const itemSummary =
    od.farmerItems.length === 1
      ? `${od.farmerItems[0].productName} x${od.farmerItems[0].quantity}`
      : `${od.farmerItems[0].productName} +${od.farmerItems.length - 1} more`;

  const pickupStr = isDirect
    ? `today by ${od.deliveryWindow.startTime}`
    : od.deliveryWindow.label;

  const body =
    `Trust Your Food: New order from ${od.customerName} for ${itemSummary}. ` +
    `${isDirect ? 'Direct' : 'Group'} pickup ${pickupStr}. ` +
    `View orders: trustyourfood.com/routes`;

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_PHONE_NUMBER;
  const to    = farmer.phone;

  const demoMode = !sid || sid === 'your_sid';

  if (demoMode) {
    // ── Demo mode: print clearly formatted SMS to terminal ────────────────
    const divider = '─'.repeat(62);
    console.log('\n' + divider);
    console.log('  📱  SMS NOTIFICATION  (DEMO — no Twilio credentials set)');
    console.log(divider);
    console.log(`  TO:   ${to || '[no phone on farmer record]'}  (${farmer.name})`);
    console.log(`  BODY: ${body}`);
    console.log(divider + '\n');
    return;
  }

  if (!to) {
    console.warn(`[notify] SMS skipped for ${farmer.name} — no phone number on record`);
    return;
  }

  // ── Live mode: send via Twilio ────────────────────────────────────────────
  const client = twilio(sid, token);

  await client.messages.create({ body, from, to });

  console.log(`[notify] 📱 SMS sent → ${to}  (${farmer.name})`);
}
