import type { Env } from './types';
import { sendGmailSmtp, type EmailAttachment } from './smtp';
import { generateSupporterCertificatePdf } from './pdf';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/&#10003;/g, '✓')
    .replace(/&copy;/g, '©')
    .replace(/&rarr;/g, '->')
    .trim();
}

export interface SendEmailResult {
  success: boolean;
  provider: 'gmail_smtp' | 'resend' | 'none';
  from?: string;
  error?: string;
  logs?: string[];
}

export async function sendEmailDetailed(
  env: Env,
  options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
  }
): Promise<SendEmailResult> {
  const fromName = env.APP_NAME || 'TG Drive Pro';

  // 1. If Resend is configured, use Resend API first (Highest Primary Inbox Deliverability)
  if (env.RESEND_API_KEY) {
    let from = env.EMAIL_FROM;
    if (!from) {
      if (env.GMAIL_USER && !env.GMAIL_USER.endsWith('@gmail.com') && !env.GMAIL_USER.endsWith('@googlemail.com')) {
        from = `${fromName} <${env.GMAIL_USER}>`;
      } else {
        from = `${fromName} <onboarding@resend.dev>`;
      }
    }

    try {
      const attachmentsPayload = options.attachments?.map((a) => {
        let contentStr: string | undefined;
        if (a.base64) {
          contentStr = a.base64;
        } else if (a.data) {
          contentStr = uint8ArrayToBase64(a.data);
        }
        return {
          filename: a.filename,
          content: contentStr,
        };
      });

      const plainText = options.text || htmlToPlainText(options.html);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: plainText,
          attachments: attachmentsPayload,
        }),
      });

      if (res.ok) {
        return { success: true, provider: 'resend', from };
      }

      const errText = await res.text();
      console.warn('[EMAIL_FALLBACK] Resend API rejected, falling back to Gmail SMTPS. Error:', res.status, errText);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[EMAIL_FALLBACK] Resend Network exception, falling back to Gmail SMTPS:', msg);
    }
  }

  // 2. If Gmail SMTP is configured, send directly from Google's official SMTPS servers
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    try {
      const smtpRes = await sendGmailSmtp({
        user: env.GMAIL_USER,
        appPassword: env.GMAIL_APP_PASSWORD,
        fromName,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      });
      if (smtpRes.success) {
        return { success: true, provider: 'gmail_smtp', from: smtpRes.from, logs: smtpRes.logs };
      }
      console.warn('[EMAIL_ERROR] Gmail SMTP failed:', smtpRes.error);
      return { success: false, provider: 'gmail_smtp', from: smtpRes.from, error: smtpRes.error, logs: smtpRes.logs };
    } catch (smtpErr: unknown) {
      const msg = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
      console.error('[EMAIL_ERROR] Gmail SMTP exception:', msg);
      return { success: false, provider: 'gmail_smtp', from: env.GMAIL_USER, error: msg };
    }
  }

  // 3. Neither provider configured
  return {
    success: false,
    provider: 'none',
    error: 'No email service credentials (GMAIL_USER + GMAIL_APP_PASSWORD or RESEND_API_KEY) configured on worker.',
  };
}

export async function sendEmail(
  env: Env,
  options: {
    to: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
  }
): Promise<boolean> {
  const result = await sendEmailDetailed(env, options);
  return result.success;
}


// Sends automated license delivery email upon purchase with attached PDF Certificate
export async function sendPurchaseEmail(
  env: Env,
  data: {
    to: string;
    name?: string | null;
    licenseKey: string;
    planType: string;
    orderId?: string;
  }
): Promise<boolean> {
  const recipientName = data.name || 'Valued Customer';
  const planDisplay = data.planType.toUpperCase();

  // Generate crisp PDF Supporter Certificate & Invoice
  const pdfBytes = generateSupporterCertificatePdf({
    customerName: recipientName,
    email: data.to,
    licenseKey: data.licenseKey,
    planType: planDisplay,
    date: new Date().toISOString().slice(0, 10),
    orderId: data.orderId,
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TG Drive Supporter License</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080c14; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);">
          
          <!-- Header Branding Banner -->
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color: #ffffff; font-weight: 800; font-size: 20px; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; text-align: center; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);">
                TG
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Thank You for Your Order
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 15px; color: #38bdf8; font-weight: 600;">
                Your ${planDisplay} Supporter Access is Confirmed
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Dear <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Thank you for purchasing TG Drive. Your payment has been processed successfully. Below is your official license key to activate full premium privileges, unlimited high-speed transfers, and 100% ad-free cloud storage.
              </p>

              <!-- License Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #090e1a; border: 2px dashed #0284c7; border-radius: 14px; padding: 22px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #38bdf8; letter-spacing: 1.5px; margin-bottom: 10px;">
                      Your Official License Key
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 2px; word-break: break-all; padding: 4px 0;">
                      ${data.licenseKey}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 10px;">
                      (Copy and paste this key into the app to activate)
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Activation Steps -->
              <div style="background-color: #162032; border: 1px solid #1e293b; border-radius: 14px; padding: 22px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #38bdf8;">
                  Quick Activation Instructions:
                </h3>
                <ol style="margin: 0; padding-left: 22px; font-size: 14px; line-height: 1.7; color: #cbd5e1;">
                  <li>Launch <strong>TG Drive</strong> on your device (Windows, Android, Mac, or Linux).</li>
                  <li>Click on the <strong>Settings</strong> icon (or Supporter banner).</li>
                  <li>Navigate to <strong>Supporter / License</strong>.</li>
                  <li>Paste your license key in the input box and select <strong>Activate License</strong>.</li>
                </ol>
              </div>

              <!-- PDF Certificate Attachment Notice -->
              <div style="background-color: rgba(2, 132, 199, 0.1); border: 1px solid #0284c7; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center;">
                <span style="font-size: 20px; margin-right: 12px;">📄</span>
                <span style="font-size: 13px; color: #38bdf8; line-height: 1.5;">
                  <strong>Official Certificate Attached:</strong> Your signed PDF License Certificate & Invoice (<code>TG-Drive-Supporter-Certificate.pdf</code>) is attached to this email.
                </span>
              </div>

              <!-- Perks Included -->
              <div style="background-color: #0b1120; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #1e293b;">
                <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 8px;">
                  What's Included in Your Access:
                </div>
                <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                  &#10003; 100% Ad-Free Experience Across All Interfaces<br>
                  &#10003; Uncapped Upload & Download Speeds<br>
                  &#10003; Full Dual-Device Support (1 Desktop/Laptop + 1 Mobile Device simultaneously)<br>
                  &#10003; Self-Service Key Recovery & Automated Device Switching Portal
                </div>
              </div>

              <!-- Assistance Note -->
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b; text-align: center;">
                Need help or switching devices? You can recover your key and manage your authorized devices anytime using your registered email address.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; text-align: center; border-top: 1px solid #1e293b; background-color: #090e1a;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                &copy; 2026 TG Drive Cloud Inc. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                This is an automated transactional email regarding your purchase. Please keep this email for your records.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return await sendEmail(env, {
    to: data.to,
    subject: `Order Confirmation: Your TG Drive Pro Supporter License Key (${data.licenseKey})`,
    html,
    attachments: [
      {
        filename: 'TG-Drive-Supporter-Certificate.pdf',
        contentType: 'application/pdf',
        data: pdfBytes,
      },
    ],
  });
}

// Sends 6-digit confirmation OTP for key recovery
export async function sendOtpEmail(
  env: Env,
  data: {
    to: string;
    otpCode: string;
  }
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TG Drive Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080c14; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" style="max-width: 520px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%); color: #ffffff; font-weight: 800; font-size: 18px; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; text-align: center; margin-bottom: 16px;">
                TG
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Verification Code
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">
                Security verification for TG Drive Account
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 36px 28px 36px; text-align: center;">
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Use the following 6-digit verification code to access your TG Drive license key and manage your registered devices:
              </p>

              <!-- OTP Code Display -->
              <div style="display: inline-block; background-color: #090e1a; border: 2px solid #0284c7; border-radius: 14px; padding: 18px 36px; margin-bottom: 24px;">
                <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 800; color: #38bdf8; letter-spacing: 10px; padding-left: 10px;">
                  ${data.otpCode}
                </div>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #38bdf8;">
                This code is valid for 10 minutes.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                If you did not request this verification code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px 36px; text-align: center; border-top: 1px solid #1e293b; background-color: #090e1a;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                &copy; 2026 TG Drive Cloud Inc.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Automated security notification. Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return await sendEmail(env, {
    to: data.to,
    subject: `Your TG Drive verification code is ${data.otpCode}`,
    html,
  });
}

// Sends welcome email when user activates a free trial — includes key + expiry info
export async function sendTrialWelcomeEmail(
  env: Env,
  data: {
    to: string;
    name?: string | null;
    licenseKey: string;
    trialDays: number;
    expiresAt: number; // unix timestamp
  }
): Promise<boolean> {
  const recipientName = data.name || 'Explorer';
  const expiryDate = new Date(data.expiresAt * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // Generate PDF certificate for trial too
  const { generateSupporterCertificatePdf } = await import('./pdf');
  const pdfBytes = generateSupporterCertificatePdf({
    customerName: recipientName,
    email: data.to,
    licenseKey: data.licenseKey,
    planType: `${data.trialDays}-DAY FREE TRIAL`,
    date: new Date().toISOString().slice(0, 10),
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TG Drive Free Trial is Active!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080c14; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center; background: linear-gradient(180deg, #1e0a3c 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #fff; font-weight: 800; font-size: 22px; width: 52px; height: 52px; line-height: 52px; border-radius: 14px; text-align: center; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(168,85,247,0.4);">
                🎁
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Your Free Trial is Active!
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 15px; color: #a855f7; font-weight: 600;">
                ${data.trialDays}-Day Pro Access — No Credit Card Needed
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Dear <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Welcome! Your <strong>${data.trialDays}-day free trial</strong> of TG Drive Pro is now active. You have full access to unlimited cloud storage, zero ads, and high-speed transfers — completely free.
              </p>

              <!-- Trial Key Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #090e1a; border: 2px dashed #7c3aed; border-radius: 14px; padding: 22px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #a855f7; letter-spacing: 1.5px; margin-bottom: 10px;">
                      Your Trial License Key
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; word-break: break-all; padding: 4px 0;">
                      ${data.licenseKey}
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 10px;">
                      (Paste this key in TG Drive app → Activate Key tab)
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Trial Expiry Warning -->
              <div style="background-color: rgba(245, 158, 11, 0.08); border: 1px solid #f59e0b; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 13px; color: #fbbf24; font-weight: 700; margin-bottom: 4px;">
                  ⏳ Trial Valid Until: ${expiryDate}
                </div>
                <div style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
                  After ${data.trialDays} days, your trial key will expire automatically. You'll receive a reminder email <strong>3 days before expiry</strong> with an upgrade option.
                </div>
              </div>

              <!-- What's Included -->
              <div style="background-color: #0b1120; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #1e293b;">
                <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 10px;">🚀 What You Get During Your Trial:</div>
                <div style="font-size: 13px; color: #94a3b8; line-height: 1.8;">
                  &#10003; 100% Ad-Free Experience<br>
                  &#10003; Unlimited Cloud Storage via Telegram<br>
                  &#10003; High-Speed Multi-Part Engine<br>
                  &#10003; Up to 2 Devices Simultaneously<br>
                  &#10003; PDF Supporter Certificate (Attached)
                </div>
              </div>

              <!-- Activation Steps -->
              <div style="background-color: #162032; border: 1px solid #1e293b; border-radius: 14px; padding: 20px; margin-bottom: 8px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #a855f7;">Quick Activation:</h3>
                <ol style="margin: 0; padding-left: 22px; font-size: 13px; line-height: 1.8; color: #cbd5e1;">
                  <li>Launch <strong>TG Drive</strong> on your device</li>
                  <li>Tap the <strong>Activate Key</strong> tab</li>
                  <li>Paste the key above and tap <strong>Activate License</strong></li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Upgrade CTA -->
          <tr>
            <td style="padding: 0 36px 32px 36px; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Enjoying TG Drive? Upgrade to Lifetime Access anytime before your trial ends and keep your progress, files and configuration.
              </p>
              <a href="${env.STORE_URL || 'https://rzp.io/rzp/eBLEV0w'}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #fff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 32px; border-radius: 12px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(6,182,212,0.3);">
                ⚡ Upgrade to Lifetime Pro
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px 36px; text-align: center; border-top: 1px solid #1e293b; background-color: #090e1a;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                &copy; 2026 TG Drive Cloud Inc. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                You received this because you claimed a free trial on TG Drive.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return await sendEmail(env, {
    to: data.to,
    subject: `Your ${data.trialDays}-Day TG Drive Free Trial is Active`,
    html,
    attachments: [
      {
        filename: 'TG-Drive-Trial-Certificate.pdf',
        contentType: 'application/pdf',
        data: pdfBytes,
      },
    ],
  });
}

// Sends expiry reminder email 3 days before trial ends
export async function sendTrialExpiryReminderEmail(
  env: Env,
  data: {
    to: string;
    name?: string | null;
    licenseKey: string;
    expiresAt: number; // unix timestamp
    daysLeft: number;
  }
): Promise<boolean> {
  const recipientName = data.name || 'Explorer';
  const expiryDate = new Date(data.expiresAt * 1000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your TG Drive Trial Expires in ${data.daysLeft} Days</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080c14; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);">

          <!-- Header -->
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center; background: linear-gradient(180deg, #1c0f00 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <div style="font-size: 40px; margin-bottom: 12px;">⏰</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">
                Your Trial Expires in ${data.daysLeft} Day${data.daysLeft !== 1 ? 's' : ''}!
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #f59e0b; font-weight: 600;">
                Expiry Date: ${expiryDate}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 36px 16px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Dear <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Your free trial of <strong>TG Drive Pro</strong> will expire on <strong>${expiryDate}</strong>. After this date, you'll lose access to Pro features like unlimited storage, ad-free experience, and high-speed transfers.
              </p>

              <!-- Key reminder -->
              <div style="background-color: #090e1a; border: 1px solid #334155; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">Your Trial Key</div>
                <div style="font-family: monospace; font-size: 16px; color: #94a3b8; letter-spacing: 1px;">${data.licenseKey}</div>
              </div>

              <!-- What you'll lose -->
              <div style="background-color: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #f87171; margin-bottom: 8px;">After expiry you'll lose:</div>
                <div style="font-size: 13px; color: #94a3b8; line-height: 1.8;">
                  ✗ Unlimited storage (back to limited free tier)<br>
                  ✗ Ad-free experience<br>
                  ✗ High-speed multi-part engine<br>
                  ✗ Multi-device sync
                </div>
              </div>
            </td>
          </tr>

          <!-- Upgrade CTA -->
          <tr>
            <td style="padding: 0 36px 32px 36px; text-align: center;">
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Upgrade to <strong>Lifetime Pro</strong> — a one-time payment, no recurring fees. Keep unlimited storage forever.
              </p>
              <a href="${env.STORE_URL || 'https://rzp.io/rzp/eBLEV0w'}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #fff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 15px 36px; border-radius: 12px; box-shadow: 0 4px 14px rgba(6,182,212,0.3);">
                ⚡ Upgrade to Lifetime Pro Now
              </a>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #475569;">
                One-time payment • No monthly fees • Instant key delivery
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px 36px; text-align: center; border-top: 1px solid #1e293b; background-color: #090e1a;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                &copy; 2026 TG Drive Cloud Inc. — You're receiving this as a trial reminder.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return await sendEmail(env, {
    to: data.to,
    subject: `⏰ Your TG Drive Trial Expires in ${data.daysLeft} Day${data.daysLeft !== 1 ? 's' : ''} — Upgrade Now`,
    html,
  });
}

export async function sendReferralEarningEmail(
  env: Env,
  data: {
    to: string;
    name?: string;
    earnedAmount: number;
    walletBalance: number;
    referralCode: string;
  }
): Promise<boolean> {
  const recipientName = data.name || 'Partner';
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Referral Commission Earned</title></head>
<body style="margin: 0; padding: 20px; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
          <tr>
            <td style="padding: 32px; text-align: center; background: linear-gradient(180deg, rgba(16,185,129,0.15) 0%, transparent 100%);">
              <div style="font-size: 44px; margin-bottom: 8px;">🎉</div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #10b981;">You Earned ₹${data.earnedAmount.toFixed(0)} Commission!</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">TG Drive Refer & Earn Program</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #cbd5e1;">Dear <strong>${recipientName}</strong>,</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Awesome news! Someone just upgraded to <strong>TG Drive Lifetime Pro</strong> using your referral code <strong style="color: #06b6d4; font-family: monospace;">${data.referralCode}</strong>.
              </p>
              <div style="background-color: #090e1a; border: 1px solid #334155; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Available Wallet Balance</div>
                <div style="font-size: 32px; font-weight: 900; color: #10b981; font-family: monospace;">₹${data.walletBalance.toFixed(2)}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">You can withdraw directly to your UPI ID or Bank Account anytime!</div>
              </div>
              <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">Keep sharing your link with friends, groups, and channels to earn more!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b; background-color: #090e1a;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">&copy; 2026 TG Drive Cloud Inc.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return await sendEmail(env, {
    to: data.to,
    subject: `🎉 You Earned ₹${data.earnedAmount.toFixed(0)} from TG Drive Refer & Earn!`,
    html,
  });
}

export async function sendPayoutCompletedEmail(
  env: Env,
  data: {
    to: string;
    name?: string;
    amount: number;
    method: string;
    utrNumber?: string;
  }
): Promise<boolean> {
  const recipientName = data.name || 'Partner';
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Withdrawal Completed</title></head>
<body style="margin: 0; padding: 20px; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
          <tr>
            <td style="padding: 32px; text-align: center; background: linear-gradient(180deg, rgba(6,182,212,0.15) 0%, transparent 100%);">
              <div style="font-size: 44px; margin-bottom: 8px;">💸</div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #06b6d4;">₹${data.amount.toFixed(2)} Transferred Successfully!</h1>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">Your TG Drive Payout is Completed</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #cbd5e1;">Dear <strong>${recipientName}</strong>,</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Your withdrawal request of <strong>₹${data.amount.toFixed(2)}</strong> has been processed via <strong>${data.method.toUpperCase()}</strong>.
              </p>
              ${data.utrNumber ? `
              <div style="background-color: #090e1a; border: 1px solid #334155; border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Bank UTR / Transaction Reference</div>
                <div style="font-size: 16px; font-family: monospace; font-weight: 700; color: #f8fafc; margin-top: 4px;">${data.utrNumber}</div>
              </div>` : ''}
              <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
                The funds should reflect in your account within a few minutes. Thank you for partnering with TG Drive!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b; background-color: #090e1a;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">&copy; 2026 TG Drive Cloud Inc.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return await sendEmail(env, {
    to: data.to,
    subject: `💸 Payout Sent: ₹${data.amount.toFixed(2)} Transferred Successfully!`,
    html,
  });
}


