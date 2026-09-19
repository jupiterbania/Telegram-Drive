import {
  activateDevice,
  banLicense,
  countActiveDevices,
  createCoupon,
  createLicense,
  deactivateDevice,
  deleteCoupon,
  deleteLicense,
  deleteOtpForEmail,
  ensureStoreTables,
  getCouponByCode,
  getDashboardStats,
  getDevicesForLicense,
  getLatestOtpForEmail,
  getLicenseByKey,
  getLicensesByEmail,
  getStoreSetting,
  incrementCouponUsage,
  incrementOtpAttempts,
  listCoupons,
  listLicenses,
  recordAdminLog,
  resetDevicesForLicense,
  saveOtpRecord,
  searchLicenses,
  setStoreSetting,
  touchDevice,
  unbanLicense,
  createPayoutRequest,
  getOrCreateReferralProfile,
  getReferralProfileByCode,
  getTopReferrers,
  getUserPayouts,
  listPayoutRequests,
  processPayoutRequest,
  recordReferralConversion,
  clearCrashReports,
  deleteCrashReport,
  getCrashReportCount,
  getCrashReports,
  recordCrashReport,
} from './db';
import {
  generateLicenseKey,
  generateOtpCode,
  issueLicenseToken,
  sha256Hex,
  timingSafeEqual,
  verifyLicenseToken,
} from './crypto';
import { renderAdminDashboardHtml } from './adminHtml';
import { renderRecoveryHtml } from './recoveryHtml';
import { renderEveykaHtml } from './eveykaHtml';
import {
  sendEmail,
  sendEmailDetailed,
  sendOtpEmail,
  sendPurchaseEmail,
  sendTrialWelcomeEmail,
  sendTrialExpiryReminderEmail,
  sendReferralEarningEmail,
  sendPayoutCompletedEmail,
} from './email';
import type {
  ActivationRequest,
  CreateLicenseRequest,
  DeactivateRequest,
  DevicePlatform,
  Env,
  LicenseClaims,
  RequestOtpRequest,
  SelfResetDeviceRequest,
  VerifyOtpRequest,
  VerifyRequest,
} from './types';

async function createRecoveryToken(email: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const payload = JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + 3600 });
  const b64Payload = btoa(payload);
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(b64Payload));
  const sigHex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${b64Payload}.${sigHex}`;
}

async function verifyRecoveryToken(token: string, secret: string, expectedEmail: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const b64Payload = parts[0] ?? '';
    const sigHex = parts[1] ?? '';
    const payload = JSON.parse(atob(b64Payload)) as { email: string; exp: number };
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    if (payload.email.toLowerCase() !== expectedEmail.toLowerCase()) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(b64Payload));
    const expectedSig = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return timingSafeEqual(sigHex, expectedSig);
  } catch {
    return false;
  }
}


const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function verifyAdminAuth(request: Request, env: Env): boolean {
  const secret = env.ADMIN_SECRET || 'tg-drive-master-secret-2026';
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7).trim();
  return timingSafeEqual(token, secret);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: JSON_HEADERS,
      });
    }

    try {
      // -------------------------------------------------------------
      // 0. Official Eveyka Software Website (/)
      // -------------------------------------------------------------
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const html = renderEveykaHtml();
        return new Response(html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-cache, no-store, must-revalidate',
          },
        });
      }

      // -------------------------------------------------------------
      // 1. Web Admin Dashboard (/admin)
      // -------------------------------------------------------------
      if (url.pathname === '/admin' || url.pathname === '/admin/') {
        const appName = env.APP_NAME || 'TG Drive: Unlimited Cloud';
        const html = renderAdminDashboardHtml(appName);
        return new Response(html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-cache',
          },
        });
      }

      // -------------------------------------------------------------
      // 1.5 Self-Service Key Recovery Portal (/recover)
      // -------------------------------------------------------------
      if (url.pathname === '/recover' || url.pathname === '/recover/') {
        const appName = env.APP_NAME || 'TG Drive: Unlimited Cloud';
        const html = renderRecoveryHtml(appName);
        return new Response(html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-cache',
          },
        });
      }


      // -------------------------------------------------------------
      // 2. Admin APIs (Require Bearer Auth)
      // -------------------------------------------------------------
      if (url.pathname.startsWith('/api/admin/')) {
        if (!verifyAdminAuth(request, env)) {
          return jsonResponse({ error: 'Unauthorized: Invalid Admin Secret' }, 401);
        }

        // GET /api/admin/stats
        if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
          const stats = await getDashboardStats(env.DB);
          return jsonResponse(stats);
        }

        // GET /api/admin/licenses
        if (url.pathname === '/api/admin/licenses' && request.method === 'GET') {
          const licenses = await listLicenses(env.DB);
          return jsonResponse({ licenses });
        }

        // GET /api/admin/licenses/search?q=...
        if (url.pathname === '/api/admin/licenses/search' && request.method === 'GET') {
          const q = url.searchParams.get('q') || '';
          const licenses = await searchLicenses(env.DB, q);
          return jsonResponse({ licenses });
        }

        // POST /api/admin/licenses/create
        if (url.pathname === '/api/admin/licenses/create' && request.method === 'POST') {
          const body = (await request.json()) as CreateLicenseRequest;
          const key = generateLicenseKey();
          const id = crypto.randomUUID();

          let expiresAt: number | null = null;
          const now = Math.floor(Date.now() / 1000);
          if (body.plan_type === 'annual') {
            expiresAt = now + 365 * 24 * 60 * 60;
          } else if (body.plan_type === 'monthly') {
            expiresAt = now + 30 * 24 * 60 * 60;
          } else if (body.plan_type === 'trial') {
            expiresAt = now + 7 * 24 * 60 * 60;
          }

          const license = await createLicense(env.DB, {
            id,
            license_key: key,
            customer_name: body.customer_name,
            customer_email: body.customer_email,
            plan_type: body.plan_type || 'lifetime',
            max_devices: body.max_devices || parseInt(env.MAX_DEFAULT_DEVICES || '2', 10),
            notes: body.notes,
            expires_at: expiresAt,
          });

          await recordAdminLog(env.DB, 'CREATE_LICENSE', key, `Created ${license.plan_type} license`);
          return jsonResponse({ success: true, license }, 201);
        }

        // POST /api/admin/licenses/ban
        if (url.pathname === '/api/admin/licenses/ban' && request.method === 'POST') {
          const body = (await request.json()) as { license_key: string; reason?: string };
          if (!body.license_key) return jsonResponse({ error: 'Missing license_key' }, 400);
          await banLicense(env.DB, body.license_key, body.reason || 'Banned by administrator');
          await recordAdminLog(env.DB, 'BAN_LICENSE', body.license_key, body.reason || 'Admin Ban');
          return jsonResponse({ success: true });
        }

        // POST /api/admin/licenses/unban
        if (url.pathname === '/api/admin/licenses/unban' && request.method === 'POST') {
          const body = (await request.json()) as { license_key: string };
          if (!body.license_key) return jsonResponse({ error: 'Missing license_key' }, 400);
          await unbanLicense(env.DB, body.license_key);
          await recordAdminLog(env.DB, 'UNBAN_LICENSE', body.license_key, 'Unbanned');
          return jsonResponse({ success: true });
        }

        // POST /api/admin/licenses/delete
        if (url.pathname === '/api/admin/licenses/delete' && request.method === 'POST') {
          const body = (await request.json()) as { license_key: string };
          if (!body.license_key) return jsonResponse({ error: 'Missing license_key' }, 400);
          await deleteLicense(env.DB, body.license_key);
          await recordAdminLog(env.DB, 'DELETE_LICENSE', body.license_key, 'Deleted license');
          return jsonResponse({ success: true });
        }

        // POST /api/admin/licenses/reset-devices
        if (url.pathname === '/api/admin/licenses/reset-devices' && request.method === 'POST') {
          const body = (await request.json()) as { license_key: string };
          if (!body.license_key) return jsonResponse({ error: 'Missing license_key' }, 400);
          await resetDevicesForLicense(env.DB, body.license_key);
          await recordAdminLog(env.DB, 'RESET_DEVICES', body.license_key, 'Reset active devices');
          return jsonResponse({ success: true });
        }

        // POST /api/admin/licenses/resend-email
        if (url.pathname === '/api/admin/licenses/resend-email' && request.method === 'POST') {
          const body = (await request.json()) as { license_key: string };
          if (!body.license_key) return jsonResponse({ error: 'Missing license_key' }, 400);
          const license = await getLicenseByKey(env.DB, body.license_key);
          if (!license || !license.customer_email) {
            return jsonResponse({ error: 'License or email address not found.' }, 404);
          }
          const emailSent = await sendPurchaseEmail(env, {
            to: license.customer_email,
            name: license.customer_name || 'Valued Customer',
            licenseKey: license.license_key,
            planType: license.plan_type,
            orderId: license.notes || 'MANUAL-RESEND',
          });
          await recordAdminLog(env.DB, 'RESEND_EMAIL', body.license_key, `Email resend to ${license.customer_email}: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
          return jsonResponse({ success: emailSent, email: license.customer_email, message: emailSent ? 'Email sent successfully!' : 'Email delivery failed. Please check SMTP / Resend configuration.' });
        }

        // POST /api/admin/test-email
        if (url.pathname === '/api/admin/test-email' && request.method === 'POST') {
          const body = (await request.json()) as { to: string };
          if (!body.to) return jsonResponse({ error: 'Missing recipient email' }, 400);
          const cleanTo = body.to.trim().toLowerCase();
          const emailResult = await sendEmailDetailed(env, {
            to: cleanTo,
            subject: '✅ TG Drive Email Delivery Diagnostic Test',
            html: `<div style="font-family:sans-serif;padding:20px;background:#0f172a;color:#fff;border-radius:12px;"><h2>TG Drive Email Service Test</h2><p>If you are reading this email, your email provider configuration (Gmail SMTP / Resend) is working perfectly!</p><p>Timestamp: ${new Date().toISOString()}</p></div>`,
          });
          return jsonResponse({
            success: emailResult.success,
            provider: emailResult.provider,
            sender_email: emailResult.from || env.GMAIL_USER || 'Not configured',
            to: cleanTo,
            error: emailResult.error || null,
            smtp_logs: emailResult.logs || [],
            has_gmail_user: Boolean(env.GMAIL_USER),
            has_gmail_password: Boolean(env.GMAIL_APP_PASSWORD),
            has_resend: Boolean(env.RESEND_API_KEY),
            message: emailResult.success
              ? `Test email successfully delivered to ${cleanTo} via ${emailResult.provider}!`
              : `Test email failed to send: ${emailResult.error || 'Unknown error'}`,
          });
        }

        // GET /api/admin/pricing
        if (url.pathname === '/api/admin/pricing' && request.method === 'GET') {
          const livePriceStr = await getStoreSetting(env.DB, 'live_price', '399');
          const storeUrl = await getStoreSetting(env.DB, 'store_url', env.STORE_URL || 'https://rzp.io/rzp/eBLEV0w');
          const price = parseFloat(livePriceStr) || 399;

          return jsonResponse({
            configured: true,
            gateway: 'Razorpay',
            product_name: 'TG Drive: Lifetime Pro License',
            price,
            formatted_price: '₹' + price.toFixed(2),
            currency: 'INR',
            key_id: env.RAZORPAY_KEY_ID || 'rzp_live_T1mw2QboxNW91L',
            payment_link: storeUrl,
            webhook_endpoint: 'https://tg-drive-license-service.jupiterbania472.workers.dev/api/webhooks/razorpay',
          });
        }

        // POST /api/admin/pricing/update
        if (url.pathname === '/api/admin/pricing/update' && request.method === 'POST') {
          const body = (await request.json()) as { price: number; payment_link?: string };
          if (!body.price || body.price <= 0) {
            return jsonResponse({ error: 'Please enter a valid price greater than 0' }, 400);
          }

          let paymentLink = body.payment_link;

          if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
            try {
              const authHeader = 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
              const plRes = await fetch('https://api.razorpay.com/v1/payment_links', {
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  amount: Math.round(body.price * 100),
                  currency: 'INR',
                  accept_partial: false,
                  description: 'TG Drive: Lifetime Pro License (Unlimited Cloud Storage)',
                  notify: { sms: false, email: true },
                  reminder_enable: true,
                  notes: { product: 'tg_drive_lifetime_pro' },
                }),
              });

              const plData = (await plRes.json()) as { short_url?: string; error?: { description?: string } };
              if (plRes.ok && plData.short_url) {
                paymentLink = plData.short_url;
              }
            } catch (err: unknown) {
              console.error('Error generating Razorpay payment link:', err);
            }
          }

          // Save price & store URL directly in DB for 0-latency instant app sync
          await setStoreSetting(env.DB, 'live_price', String(body.price));
          if (paymentLink) {
            await setStoreSetting(env.DB, 'store_url', paymentLink);
          }

          await recordAdminLog(env.DB, 'UPDATE_PRICING', null, `Updated price to ₹${body.price}`);

          return jsonResponse({
            success: true,
            price: body.price,
            payment_link: paymentLink || env.STORE_URL,
            message: `Live price successfully updated to ₹${body.price.toFixed(2)}! Apps will sync immediately.`,
          });
        }

        // GET /api/admin/discounts
        if (url.pathname === '/api/admin/discounts' && request.method === 'GET') {
          const couponList = await listCoupons(env.DB);
          const discounts = couponList.map(c => ({
            id: c.id,
            name: `Coupon ${c.code}`,
            code: c.code,
            amount: c.discount_value,
            amount_type: c.discount_type,
            is_limited_redemptions: c.max_uses > 0,
            max_redemptions: c.max_uses,
            times_used: c.times_used,
            expires_at: c.expires_at ? new Date(c.expires_at * 1000).toISOString() : null,
            status: c.is_active ? 'published' : 'draft',
          }));
          return jsonResponse({ discounts });
        }

        // POST /api/admin/discounts/create
        if (url.pathname === '/api/admin/discounts/create' && request.method === 'POST') {
          const body = (await request.json()) as {
            code: string;
            amount: number;
            amount_type?: 'percent' | 'fixed';
            max_redemptions?: number;
            duration_days?: number;
          };

          if (!body.code || !body.amount || body.amount <= 0) {
            return jsonResponse({ error: 'Missing valid coupon code or discount amount' }, 400);
          }

          const cleanCode = body.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          const existing = await getCouponByCode(env.DB, cleanCode);
          if (existing) {
            return jsonResponse({ error: `Coupon code '${cleanCode}' already exists!` }, 400);
          }

          const coupon = await createCoupon(env.DB, {
            code: cleanCode,
            discount_type: body.amount_type || 'percent',
            discount_value: body.amount,
            max_uses: body.max_redemptions,
            duration_days: body.duration_days,
          });

          await recordAdminLog(env.DB, 'CREATE_COUPON', cleanCode, `Created coupon ${cleanCode} with ${body.amount}${body.amount_type === 'fixed' ? ' INR' : '%'} off`);

          return jsonResponse(
            {
              success: true,
              discount: coupon,
              message: `Coupon ${cleanCode} created successfully!`,
            },
            201
          );
        }

        // POST /api/admin/discounts/delete
        if (url.pathname === '/api/admin/discounts/delete' && request.method === 'POST') {
          const body = (await request.json()) as { id: string; code?: string };
          if (!body.id) return jsonResponse({ error: 'Missing discount ID' }, 400);
          await deleteCoupon(env.DB, body.id);
          await recordAdminLog(env.DB, 'DELETE_COUPON', body.code || body.id, `Deleted coupon ${body.code || body.id}`);
          return jsonResponse({ success: true, message: 'Coupon deleted successfully.' });
        }

        // GET /api/admin/offers
        if (url.pathname === '/api/admin/offers' && request.method === 'GET') {
          try {
            const stmt = env.DB.prepare('SELECT * FROM special_offers ORDER BY created_at DESC');
            const rows = await stmt.all();
            const offers = (rows.results || []).map((r: Record<string, unknown>) => {
              let parsedPerks: string[] = [];
              if (typeof r.perks === 'string' && r.perks) {
                try {
                  parsedPerks = JSON.parse(r.perks) as string[];
                } catch {
                  parsedPerks = r.perks.split('\n').map(p => p.trim()).filter(Boolean);
                }
              }
              return { ...r, perks_list: parsedPerks };
            });
            return jsonResponse({ offers });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch offers';
            return jsonResponse({ error: msg }, 500);
          }
        }

        // POST /api/admin/offers/create
        if (url.pathname === '/api/admin/offers/create' && request.method === 'POST') {
          const body = (await request.json()) as {
            title: string;
            badge?: string;
            description: string;
            discount_type?: 'percent' | 'flat' | 'bundle';
            discount_value?: number;
            original_price?: number;
            offer_price?: number;
            perks?: string[] | string;
            coupon_code?: string;
            cta_text?: string;
            banner_style?: string;
            duration_hours?: number;
          };

          if (!body.title || !body.description) {
            return jsonResponse({ error: 'Please provide both Title and Description for the offer.' }, 400);
          }

          try {
            const id = crypto.randomUUID();
            const now = Math.floor(Date.now() / 1000);
            const countdownEnd = body.duration_hours && body.duration_hours > 0
              ? now + Math.round(body.duration_hours * 3600)
              : null;

            let perksJson = '';
            if (Array.isArray(body.perks)) {
              perksJson = JSON.stringify(body.perks.filter(Boolean));
            } else if (typeof body.perks === 'string') {
              perksJson = JSON.stringify(body.perks.split('\n').map(p => p.trim()).filter(Boolean));
            }

            // Deactivate existing active offers
            await env.DB.prepare('UPDATE special_offers SET is_active = 0 WHERE is_active = 1').run();

            await env.DB.prepare(`
              INSERT INTO special_offers (id, title, badge, description, discount_type, discount_value, original_price, offer_price, perks, coupon_code, cta_text, banner_style, countdown_end, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            `).bind(
              id,
              body.title.trim(),
              body.badge?.trim() || 'LIMITED OFFER',
              body.description.trim(),
              body.discount_type || 'percent',
              body.discount_value || 0,
              body.original_price || null,
              body.offer_price || null,
              perksJson || null,
              body.coupon_code ? body.coupon_code.trim().toUpperCase() : null,
              body.cta_text?.trim() || 'Claim Offer',
              body.banner_style || 'gold',
              countdownEnd,
              now,
              now
            ).run();

            await recordAdminLog(env.DB, 'CREATE_OFFER', id, `Created special offer: ${body.title}`);
            return jsonResponse({ success: true, message: 'Special offer created & activated live!' }, 201);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error creating offer';
            return jsonResponse({ error: msg }, 500);
          }
        }

        // POST /api/admin/offers/toggle
        if (url.pathname === '/api/admin/offers/toggle' && request.method === 'POST') {
          const body = (await request.json()) as { id: string; is_active: number };
          if (!body.id) return jsonResponse({ error: 'Missing offer ID' }, 400);

          try {
            const now = Math.floor(Date.now() / 1000);
            if (body.is_active === 1) {
              await env.DB.prepare('UPDATE special_offers SET is_active = 0').run();
            }
            await env.DB.prepare('UPDATE special_offers SET is_active = ?, updated_at = ? WHERE id = ?')
              .bind(body.is_active, now, body.id)
              .run();

            await recordAdminLog(env.DB, 'TOGGLE_OFFER', body.id, `Toggled offer ${body.id} to ${body.is_active ? 'ACTIVE' : 'INACTIVE'}`);
            return jsonResponse({ success: true });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error toggling offer status';
            return jsonResponse({ error: msg }, 500);
          }
        }

        // POST /api/admin/offers/delete
        if (url.pathname === '/api/admin/offers/delete' && request.method === 'POST') {
          const body = (await request.json()) as { id: string };
          if (!body.id) return jsonResponse({ error: 'Missing offer ID' }, 400);

          try {
            await env.DB.prepare('DELETE FROM special_offers WHERE id = ?').bind(body.id).run();
            await recordAdminLog(env.DB, 'DELETE_OFFER', body.id, `Deleted special offer ${body.id}`);
            return jsonResponse({ success: true, message: 'Offer deleted successfully' });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error deleting offer';
            return jsonResponse({ error: msg }, 500);
          }
        }

        // GET /api/admin/trial
        if (url.pathname === '/api/admin/trial' && request.method === 'GET') {
          const trialEnabled = (await getStoreSetting(env.DB, 'trial_enabled', '1')) === '1';
          const trialDays = parseInt(await getStoreSetting(env.DB, 'trial_days', '30'), 10) || 30;
          return jsonResponse({ trial_enabled: trialEnabled, trial_days: trialDays });
        }

        // POST /api/admin/trial/update
        if (url.pathname === '/api/admin/trial/update' && request.method === 'POST') {
          const body = (await request.json()) as { trial_enabled?: boolean; trial_days?: number };
          const enabled = body.trial_enabled ? '1' : '0';
          const days = String(body.trial_days || 30);
          await setStoreSetting(env.DB, 'trial_enabled', enabled);
          await setStoreSetting(env.DB, 'trial_days', days);
          await recordAdminLog(env.DB, 'UPDATE_TRIAL', null, `Updated free trial settings: enabled=${enabled}, days=${days}`);
          return jsonResponse({ success: true, trial_enabled: enabled === '1', trial_days: parseInt(days, 10), message: 'Trial settings updated successfully!' });
        }

        // GET /api/admin/referrals/settings
        if (url.pathname === '/api/admin/referrals/settings' && request.method === 'GET') {
          const enabled = await getStoreSetting(env.DB, 'referral_enabled', '1');
          const rewardType = await getStoreSetting(env.DB, 'referral_reward_type', 'fixed');
          const rewardVal = await getStoreSetting(env.DB, 'referral_reward_value', '50');
          const friendDiscType = await getStoreSetting(env.DB, 'referral_friend_discount_type', 'percent');
          const friendDiscVal = await getStoreSetting(env.DB, 'referral_friend_discount_value', '10');
          const minPayout = await getStoreSetting(env.DB, 'referral_min_payout', '200');

          return jsonResponse({
            success: true,
            referral_enabled: enabled === '1',
            reward_type: rewardType,
            reward_value: parseFloat(rewardVal) || 50,
            friend_discount_type: friendDiscType,
            friend_discount_value: parseFloat(friendDiscVal) || 10,
            min_payout: parseFloat(minPayout) || 200,
          });
        }

        // POST /api/admin/referrals/settings
        if (url.pathname === '/api/admin/referrals/settings' && request.method === 'POST') {
          const body = (await request.json()) as {
            referral_enabled?: boolean | string | number;
            reward_type?: string;
            reward_value?: number | string;
            friend_discount_type?: string;
            friend_discount_value?: number | string;
            min_payout?: number | string;
          };

          if (body.referral_enabled !== undefined) {
            const val = body.referral_enabled === true || body.referral_enabled === '1' || body.referral_enabled === 1 ? '1' : '0';
            await setStoreSetting(env.DB, 'referral_enabled', val);
          }
          if (body.reward_type) {
            await setStoreSetting(env.DB, 'referral_reward_type', body.reward_type === 'percent' ? 'percent' : 'fixed');
          }
          if (body.reward_value !== undefined) {
            await setStoreSetting(env.DB, 'referral_reward_value', String(Math.max(1, parseFloat(String(body.reward_value)) || 50)));
          }
          if (body.friend_discount_type) {
            await setStoreSetting(env.DB, 'referral_friend_discount_type', body.friend_discount_type === 'fixed' ? 'fixed' : 'percent');
          }
          if (body.friend_discount_value !== undefined) {
            await setStoreSetting(env.DB, 'referral_friend_discount_value', String(Math.max(1, parseFloat(String(body.friend_discount_value)) || 10)));
          }
          if (body.min_payout !== undefined) {
            await setStoreSetting(env.DB, 'referral_min_payout', String(Math.max(1, parseFloat(String(body.min_payout)) || 200)));
          }

          await recordAdminLog(env.DB, 'UPDATE_REFERRAL_SETTINGS', null, 'Updated Refer & Earn commission & payout settings');
          return jsonResponse({ success: true, message: 'Referral settings updated successfully!' });
        }

        // GET /api/admin/payouts
        if (url.pathname === '/api/admin/payouts' && request.method === 'GET') {
          const status = url.searchParams.get('status') || 'all';
          const payouts = await listPayoutRequests(env.DB, status);
          return jsonResponse({ success: true, payouts });
        }

        // POST /api/admin/payouts/process
        if (url.pathname === '/api/admin/payouts/process' && request.method === 'POST') {
          const body = (await request.json()) as {
            payout_id?: string;
            status?: 'completed' | 'rejected';
            utr_number?: string;
            reason?: string;
          };

          if (!body.payout_id || !body.status) {
            return jsonResponse({ error: 'Missing payout_id or status' }, 400);
          }

          const existingPayout = await env.DB.prepare('SELECT * FROM payout_requests WHERE id = ?').bind(body.payout_id).first<{
            id: string;
            referral_code: string;
            user_email: string;
            user_name: string | null;
            amount: number;
            payout_method: string;
          }>();
          if (!existingPayout) {
            return jsonResponse({ error: 'Payout request not found.' }, 404);
          }

          const res = await processPayoutRequest(env.DB, body.payout_id, body.status, body.utr_number || body.reason);
          if (!res.success) {
            return jsonResponse({ error: res.error || 'Failed to process payout' }, 400);
          }

          await recordAdminLog(
            env.DB,
            body.status === 'completed' ? 'PAYOUT_COMPLETED' : 'PAYOUT_REJECTED',
            existingPayout.referral_code,
            `Processed payout of ₹${existingPayout.amount} for ${existingPayout.user_email}: ${body.status}`
          );

          if (body.status === 'completed') {
            try {
              await sendPayoutCompletedEmail(env, {
                to: existingPayout.user_email,
                name: existingPayout.user_name || undefined,
                amount: existingPayout.amount,
                method: existingPayout.payout_method,
                utrNumber: body.utr_number || undefined,
              });
            } catch (err) {
              console.error('Payout completed email error:', err);
            }
          }

          return jsonResponse({ success: true, message: `Payout marked as ${body.status}!` });
        }

        // GET /api/admin/referrals/leaderboard
        if (url.pathname === '/api/admin/referrals/leaderboard' && request.method === 'GET') {
          const referrers = await getTopReferrers(env.DB, 50);
          return jsonResponse({ success: true, referrers });
        }

        // GET /api/admin/crash-reports
        if (url.pathname === '/api/admin/crash-reports' && request.method === 'GET') {
          const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
          const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
          const reports = await getCrashReports(env.DB, limit, offset);
          const total = await getCrashReportCount(env.DB);
          return jsonResponse({ success: true, reports, total });
        }

        // POST /api/admin/crash-reports/clear
        if (url.pathname === '/api/admin/crash-reports/clear' && request.method === 'POST') {
          await clearCrashReports(env.DB);
          await recordAdminLog(env.DB, 'CLEAR_CRASH_REPORTS', null, 'Cleared all recorded crash reports');
          return jsonResponse({ success: true, message: 'All crash reports have been cleared.' });
        }

        // DELETE /api/admin/crash-reports/:id
        if (url.pathname.startsWith('/api/admin/crash-reports/') && request.method === 'DELETE') {
          const id = url.pathname.replace('/api/admin/crash-reports/', '').trim();
          if (!id) return jsonResponse({ error: 'Missing crash report id' }, 400);
          await deleteCrashReport(env.DB, id);
          return jsonResponse({ success: true });
        }
      }

      // -------------------------------------------------------------
      // 2.34 Privacy-Safe Crash Ingestion API (/api/crash-report)
      // -------------------------------------------------------------
      if (url.pathname === '/api/crash-report' && request.method === 'POST') {
        try {
          const body = (await request.json()) as {
            event?: string;
            appVersion?: string;
            source?: string;
            errorType?: string;
            frames?: string[];
            platform?: string;
            occurredAt?: string;
          };

          if (!body || body.event !== 'app_crash') {
            return jsonResponse({ error: 'Invalid crash report event' }, 400);
          }

          const cleanVersion = String(body.appVersion || 'unknown').trim().slice(0, 32);
          const cleanSource = String(body.source || 'unknown').trim().slice(0, 16);
          const cleanErrorType = String(body.errorType || 'UnknownError').trim().slice(0, 96);
          const cleanPlatform = String(body.platform || 'unknown').trim().slice(0, 96);
          const cleanOccurredAt = String(body.occurredAt || new Date().toISOString()).trim().slice(0, 64);
          const safeFrames = Array.isArray(body.frames)
            ? body.frames.slice(0, 6).map(f => String(f).trim().slice(0, 160))
            : [];

          const report = await recordCrashReport(env.DB, {
            app_version: cleanVersion,
            source: cleanSource,
            error_type: cleanErrorType,
            frames: JSON.stringify(safeFrames),
            platform: cleanPlatform,
            occurred_at: cleanOccurredAt,
          });

          return jsonResponse({ success: true, id: report.id });
        } catch (err) {
          console.error('Error recording crash report:', err);
          return jsonResponse({ error: 'Failed to record crash report' }, 500);
        }
      }

      // -------------------------------------------------------------
      // 2.35 Public Active Offer Endpoint (/api/store/active-offer)
      // -------------------------------------------------------------
      if (url.pathname === '/api/store/active-offer' && request.method === 'GET') {
        try {
          await ensureStoreTables(env.DB);
          const now = Math.floor(Date.now() / 1000);
          const row = (await env.DB.prepare(`
            SELECT * FROM special_offers 
            WHERE is_active = 1 AND (countdown_end IS NULL OR countdown_end > ?)
            ORDER BY created_at DESC LIMIT 1
          `).bind(now).first()) as Record<string, unknown> | null;

          if (!row) {
            return jsonResponse({ active: false, offer: null });
          }

          let parsedPerks: string[] = [];
          if (typeof row.perks === 'string' && row.perks) {
            try {
              parsedPerks = JSON.parse(row.perks) as string[];
            } catch {
              parsedPerks = row.perks.split('\n').map(p => p.trim()).filter(Boolean);
            }
          }

          const countdownEnd = typeof row.countdown_end === 'number' ? row.countdown_end : null;
          const remainingSeconds = countdownEnd ? Math.max(0, countdownEnd - now) : null;

          return jsonResponse({
            active: true,
            offer: {
              ...row,
              perks_list: parsedPerks,
              remaining_seconds: remainingSeconds,
            }
          });
        } catch (err) {
          console.error('Error fetching active offer:', err);
          return jsonResponse({ active: false, offer: null });
        }
      }

      // -------------------------------------------------------------
      // 2.38 Claim Free Trial Endpoint (/api/store/claim-trial)
      // -------------------------------------------------------------
      if (url.pathname === '/api/store/claim-trial' && request.method === 'POST') {
        try {
          await ensureStoreTables(env.DB);
          const body = (await request.json()) as { name?: string; email?: string; hardware_id?: string };

          if (!body.name || !body.name.trim()) {
            return jsonResponse({ error: 'Please enter your Full Name to claim your free trial.' }, 400);
          }
          if (!body.email || !body.email.trim() || !body.email.includes('@')) {
            return jsonResponse({ error: 'Please enter a valid Email Address.' }, 400);
          }
          if (!body.hardware_id || !body.hardware_id.trim()) {
            return jsonResponse({ error: 'Device Hardware ID is required for trial registration.' }, 400);
          }

          const trialEnabled = (await getStoreSetting(env.DB, 'trial_enabled', '1')) === '1';
          if (!trialEnabled) {
            return jsonResponse({ error: 'Free trial is currently disabled by administrator.' }, 400);
          }

          const trialDays = parseInt(await getStoreSetting(env.DB, 'trial_days', '30'), 10) || 30;
          const cleanName = body.name.trim();
          const cleanEmail = body.email.trim().toLowerCase();
          const cleanHwid = body.hardware_id.trim();

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(cleanEmail)) {
            return jsonResponse({ error: 'Please provide a valid email address format (e.g. name@example.com).' }, 400);
          }

          // Reject disposable/throwaway email providers
          const emailDomain = cleanEmail.split('@')[1];
          const blockedDomains = [
            'tempmail.com', 'temp-mail.org', '10minutemail.com', '10minutemail.net',
            'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'sharklasers.com',
            'yopmail.com', 'yopmail.fr', 'trashmail.com', 'trashmail.net',
            'getairmail.com', 'mohmal.com', 'dispostable.com', 'nada.ltd',
            'inboxkitten.com', 'mytemp.email', 'crazymailing.com', 'burnermail.io', 'maildrop.cc'
          ];
          if (emailDomain && blockedDomains.includes(emailDomain)) {
            return jsonResponse({ error: 'Temporary or disposable email services are not allowed. Please use your primary email.' }, 400);
          }

          // Check if email already claimed a trial
          const existingEmailTrial = await env.DB.prepare(
            'SELECT * FROM licenses WHERE LOWER(customer_email) = ? AND plan_type = "trial"'
          ).bind(cleanEmail).first();
          if (existingEmailTrial) {
            return jsonResponse({ error: 'This email address has already used its free trial.' }, 400);
          }

          // Check if hardware_id already claimed a trial
          const existingDevice = await env.DB.prepare(
            'SELECT d.*, l.plan_type FROM device_activations d JOIN licenses l ON d.license_key = l.license_key WHERE d.hardware_id = ? AND l.plan_type = "trial"'
          ).bind(cleanHwid).first();
          if (existingDevice) {
            return jsonResponse({ error: 'This device has already claimed its free trial period.' }, 400);
          }

          const id = crypto.randomUUID();
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = now + trialDays * 86400;
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
          const licenseKey = `TGDRV-TR-${randomSuffix}`;

          // Create trial license
          await createLicense(env.DB, {
            id,
            license_key: licenseKey,
            customer_name: cleanName,
            customer_email: cleanEmail,
            plan_type: 'trial',
            max_devices: 2,
            notes: `Self-claimed ${trialDays}-day free trial`,
            expires_at: expiresAt,
          });

          // Activate this device
          const rawPlatform = (body as { platform?: string }).platform;
          const validPlatforms: DevicePlatform[] = ['windows', 'android', 'ios', 'macos', 'linux', 'web', 'other'];
          const platform: DevicePlatform = (rawPlatform && validPlatforms.includes(rawPlatform as DevicePlatform))
            ? (rawPlatform as DevicePlatform)
            : 'android';

          await activateDevice(env.DB, {
            id: crypto.randomUUID(),
            license_key: licenseKey,
            hardware_id: cleanHwid,
            device_name: (body as { device_name?: string }).device_name || 'Trial Client Device',
            platform,
          });

          // Issue cryptographic token
          const token = await issueLicenseToken(
            {
              sub: licenseKey,
              hwid: cleanHwid,
              plan: 'trial',
              exp: expiresAt,
              iat: now,
              iss: 'tg-drive-license-service',
              name: cleanName,
            },
            env
          );

          await recordAdminLog(env.DB, 'CLAIM_TRIAL', licenseKey, `User ${cleanEmail} claimed ${trialDays}-day free trial`);

          // Send trial welcome email with key + PDF certificate
          try {
            await sendTrialWelcomeEmail(env, {
              to: cleanEmail,
              name: cleanName,
              licenseKey,
              trialDays,
              expiresAt,
            });
          } catch (err) {
            console.error('Trial welcome email failed:', err);
          }

          return jsonResponse({
            success: true,
            license_key: licenseKey,
            customer_name: cleanName,
            plan_type: 'trial',
            expires_at: expiresAt,
            trial_days: trialDays,
            token,
            message: `Congratulations! Your ${trialDays}-day free trial is now active.`,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error('Error claiming free trial:', errMsg, err);
          return jsonResponse({ error: `Failed to register free trial: ${errMsg}` }, 500);
        }
      }

      // -------------------------------------------------------------
      // 2.4 Coupon Validation for App (/api/store/validate-coupon)
      // -------------------------------------------------------------
      if (url.pathname === '/api/store/validate-coupon' && request.method === 'GET') {
        try {
          await ensureStoreTables(env.DB);
          const code = url.searchParams.get('code') || '';
          if (!code.trim()) {
            return jsonResponse({ valid: false, error: 'Please enter a promo code.' });
          }

          const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          const coupon = await getCouponByCode(env.DB, cleanCode);

          if (!coupon) {
            // Check if code is a valid Refer & Earn code
            const referral = await getReferralProfileByCode(env.DB, cleanCode);
            if (referral) {
              const friendDiscType = await getStoreSetting(env.DB, 'referral_friend_discount_type', 'percent');
              const friendDiscVal = parseFloat(await getStoreSetting(env.DB, 'referral_friend_discount_value', '10')) || 10;
              const basePriceStr = await getStoreSetting(env.DB, 'live_price', '399');
              const basePrice = parseFloat(basePriceStr) || 399;
              let discountAmount = 0;
              if (friendDiscType === 'percent') {
                discountAmount = (basePrice * friendDiscVal) / 100;
              } else {
                discountAmount = friendDiscVal;
              }
              const discountedPrice = Math.max(1, Math.round(basePrice - discountAmount));
              const discountText = friendDiscType === 'percent' ? `${friendDiscVal}% Referral Discount` : `₹${friendDiscVal} Referral Discount`;
              const storeUrl = await getStoreSetting(env.DB, 'store_url', env.STORE_URL || 'https://rzp.io/rzp/eBLEV0w');

              return jsonResponse({
                valid: true,
                code: referral.referral_code,
                is_referral: true,
                discount_text: discountText,
                discount_type: friendDiscType,
                discount_value: friendDiscVal,
                original_price: basePrice,
                new_price: discountedPrice,
                payment_link: storeUrl,
              });
            }

            return jsonResponse({ valid: false, error: 'Invalid coupon or referral code. Please check and try again.' });
          }

          const now = Math.floor(Date.now() / 1000);
          if (coupon.expires_at && coupon.expires_at < now) {
            return jsonResponse({ valid: false, error: 'This promo code has expired.' });
          }

          if (coupon.max_uses > 0 && coupon.times_used >= coupon.max_uses) {
            return jsonResponse({ valid: false, error: 'This coupon has reached its maximum usage limit.' });
          }

          const basePriceStr = await getStoreSetting(env.DB, 'live_price', '399');
          const basePrice = parseFloat(basePriceStr) || 399;

          let discountAmount = 0;
          if (coupon.discount_type === 'percent') {
            discountAmount = (basePrice * coupon.discount_value) / 100;
          } else {
            discountAmount = coupon.discount_value;
          }

          const discountedPrice = Math.max(1, Math.round(basePrice - discountAmount));
          const discountText = coupon.discount_type === 'percent' 
            ? `${coupon.discount_value}% OFF` 
            : `₹${coupon.discount_value} OFF`;

          const storeUrl = await getStoreSetting(env.DB, 'store_url', env.STORE_URL || 'https://rzp.io/rzp/eBLEV0w');

          return jsonResponse({
            valid: true,
            code: cleanCode,
            discount_text: discountText,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            original_price: basePrice,
            new_price: discountedPrice,
            payment_link: storeUrl,
          });
        } catch (err) {
          console.error('Error validating coupon:', err);
          return jsonResponse({ valid: false, error: 'Error validating coupon. Please try again.' });
        }
      }

      // -------------------------------------------------------------
      // 2.45 Refer & Earn Public Client Endpoints
      // -------------------------------------------------------------

      // GET /api/referral/profile?email=...&name=...
      if (url.pathname === '/api/referral/profile' && request.method === 'GET') {
        try {
          await ensureStoreTables(env.DB);
          const email = url.searchParams.get('email') || '';
          const name = url.searchParams.get('name') || undefined;
          if (!email.trim() || !email.includes('@')) {
            return jsonResponse({ error: 'A valid email address is required to access your referral wallet.' }, 400);
          }

          const referralEnabled = (await getStoreSetting(env.DB, 'referral_enabled', '1')) === '1';
          const rewardType = await getStoreSetting(env.DB, 'referral_reward_type', 'fixed');
          const rewardVal = parseFloat(await getStoreSetting(env.DB, 'referral_reward_value', '50')) || 50;
          const friendDiscType = await getStoreSetting(env.DB, 'referral_friend_discount_type', 'percent');
          const friendDiscVal = parseFloat(await getStoreSetting(env.DB, 'referral_friend_discount_value', '10')) || 10;
          const minPayout = parseFloat(await getStoreSetting(env.DB, 'referral_min_payout', '200')) || 200;

          const profile = await getOrCreateReferralProfile(env.DB, email, name);
          const payouts = await getUserPayouts(env.DB, email);

          return jsonResponse({
            success: true,
            enabled: referralEnabled,
            profile,
            payouts,
            settings: {
              min_payout: minPayout,
              reward_type: rewardType,
              reward_value: rewardVal,
              friend_discount_type: friendDiscType,
              friend_discount_value: friendDiscVal,
            },
          });
        } catch (err) {
          console.error('Error fetching referral profile:', err);
          return jsonResponse({ error: 'Failed to fetch referral profile.' }, 500);
        }
      }

      // POST /api/referral/request-payout
      if (url.pathname === '/api/referral/request-payout' && request.method === 'POST') {
        try {
          await ensureStoreTables(env.DB);
          const body = (await request.json()) as {
            email?: string;
            name?: string;
            amount?: number;
            payout_method?: 'upi' | 'bank';
            upi_id?: string;
            bank_name?: string;
            bank_account?: string;
            bank_ifsc?: string;
            bank_holder_name?: string;
          };

          if (!body.email || !body.email.trim() || !body.email.includes('@')) {
            return jsonResponse({ error: 'Valid email address is required.' }, 400);
          }

          const amount = parseFloat(String(body.amount));
          if (!amount || isNaN(amount) || amount <= 0) {
            return jsonResponse({ error: 'Please enter a valid withdrawal amount.' }, 400);
          }

          const minPayout = parseFloat(await getStoreSetting(env.DB, 'referral_min_payout', '200')) || 200;
          if (amount < minPayout) {
            return jsonResponse({ error: `Minimum withdrawal amount is ₹${minPayout}.` }, 400);
          }

          const payoutMethod = body.payout_method === 'bank' ? 'bank' : 'upi';
          if (payoutMethod === 'upi') {
            if (!body.upi_id || !body.upi_id.trim() || !body.upi_id.includes('@')) {
              return jsonResponse({ error: 'Please enter a valid UPI ID (e.g. yourname@okaxis).' }, 400);
            }
          } else {
            if (!body.bank_account || !body.bank_account.trim() || !body.bank_ifsc || !body.bank_ifsc.trim() || !body.bank_holder_name || !body.bank_holder_name.trim()) {
              return jsonResponse({ error: 'Please provide complete Bank Account, IFSC Code, and Account Holder Name.' }, 400);
            }
          }

          const result = await createPayoutRequest(env.DB, {
            email: body.email,
            name: body.name,
            amount,
            payout_method: payoutMethod,
            upi_id: body.upi_id,
            bank_name: body.bank_name,
            bank_account: body.bank_account,
            bank_ifsc: body.bank_ifsc,
            bank_holder_name: body.bank_holder_name,
          });

          if (!result.success) {
            return jsonResponse({ error: result.error || 'Failed to submit withdrawal request.' }, 400);
          }

          return jsonResponse({
            success: true,
            message: `Withdrawal request of ₹${amount.toFixed(2)} submitted successfully! Funds will be transferred shortly.`,
            payout: result.payout,
          });
        } catch (err) {
          console.error('Error creating payout request:', err);
          return jsonResponse({ error: 'Failed to submit withdrawal request.' }, 500);
        }
      }

      // GET /api/referral/validate?code=...
      if (url.pathname === '/api/referral/validate' && request.method === 'GET') {
        try {
          await ensureStoreTables(env.DB);
          const code = url.searchParams.get('code') || '';
          if (!code.trim()) {
            return jsonResponse({ valid: false, error: 'Please enter a referral code.' });
          }

          const cleanCode = code.trim().toUpperCase();
          const profile = await getReferralProfileByCode(env.DB, cleanCode);
          if (!profile) {
            return jsonResponse({ valid: false, error: 'Invalid referral code.' });
          }

          const friendType = await getStoreSetting(env.DB, 'referral_friend_discount_type', 'percent');
          const friendVal = parseFloat(await getStoreSetting(env.DB, 'referral_friend_discount_value', '10')) || 10;

          return jsonResponse({
            valid: true,
            code: profile.referral_code,
            referrer_name: profile.user_name || 'Friend',
            discount_type: friendType,
            discount_value: friendVal,
            discount_text: friendType === 'percent' ? `${friendVal}% OFF Referral Discount` : `₹${friendVal} OFF Referral Discount`,
          });
        } catch (err) {
          return jsonResponse({ valid: false, error: 'Error validating referral code.' });
        }
      }

      // -------------------------------------------------------------
      // 2.5 Public Store Configuration (/api/store/config)
      // -------------------------------------------------------------
      if (url.pathname === '/api/store/config' && request.method === 'GET') {
        try {
          await ensureStoreTables(env.DB);
          const livePriceStr = await getStoreSetting(env.DB, 'live_price', '399');
          const storeUrl = await getStoreSetting(env.DB, 'store_url', env.STORE_URL || 'https://rzp.io/rzp/eBLEV0w');
          const trialEnabled = (await getStoreSetting(env.DB, 'trial_enabled', '1')) === '1';
          const trialDays = parseInt(await getStoreSetting(env.DB, 'trial_days', '30'), 10) || 30;
          const price = parseFloat(livePriceStr) || 399;

          const trialLabel = `${trialDays}-Day Free Trial`;

          return jsonResponse({
            product_name: 'TG Drive: Lifetime Pro License',
            price: Math.round(price),
            formatted_price: '₹' + Math.round(price),
            currency: 'INR',
            buy_url: storeUrl,
            trial_enabled: trialEnabled,
            trial_days: trialDays,
            trial_label: trialLabel,
          });
        } catch (err) {
          console.error('Error fetching store config:', err);
          return jsonResponse({
            product_name: 'TG Drive: Lifetime Pro License',
            price: 399,
            formatted_price: '₹399',
            currency: 'INR',
            buy_url: 'https://rzp.io/rzp/eBLEV0w',
            trial_enabled: true,
            trial_days: 30,
            trial_label: '30-Day Free Trial',
          });
        }
      }

      // -------------------------------------------------------------
      // 2.6 Create Pre-filled Personalized Checkout Link (/api/store/create-checkout-link)
      // -------------------------------------------------------------
      if (url.pathname === '/api/store/create-checkout-link' && request.method === 'POST') {
        const body = (await request.json()) as {
          name: string;
          email: string;
          coupon_code?: string;
          referral_code?: string;
        };

        if (!body.name || !body.name.trim()) {
          return jsonResponse({ error: 'Please enter your Full Name for the supporter certificate.' }, 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!body.email || !emailRegex.test(body.email.trim())) {
          return jsonResponse({ error: 'Please enter a valid Email Address for license key delivery.' }, 400);
        }

        const cleanName = body.name.trim();
        const cleanEmail = body.email.trim().toLowerCase();

        const basePriceStr = await getStoreSetting(env.DB, 'live_price', '399');
        const basePrice = Math.round(parseFloat(basePriceStr) || 399);
        let finalPrice = basePrice;
        const discountNotes: string[] = [];
        let validCouponCode = '';

        // 1. Check for active Special Offer
        const now = Math.floor(Date.now() / 1000);
        const activeOffer = (await env.DB.prepare(`
          SELECT * FROM special_offers 
          WHERE is_active = 1 AND (countdown_end IS NULL OR countdown_end > ?)
          ORDER BY created_at DESC LIMIT 1
        `).bind(now).first()) as Record<string, unknown> | null;

        if (activeOffer) {
          let offerDiscount = 0;
          const discType = String(activeOffer.discount_type || 'percent');
          const discVal = Number(activeOffer.discount_value) || 0;
          if (discType === 'percent' && discVal > 0) {
            offerDiscount = (finalPrice * discVal) / 100;
            discountNotes.push(`Offer: ${discVal}% OFF`);
          } else if ((discType === 'flat' || discType === 'fixed') && discVal > 0) {
            offerDiscount = discVal;
            discountNotes.push(`Offer: ₹${Math.round(discVal)} OFF`);
          } else if (typeof activeOffer.offer_price === 'number' && activeOffer.offer_price > 0 && activeOffer.offer_price < finalPrice) {
            offerDiscount = finalPrice - activeOffer.offer_price;
            discountNotes.push(`Special Deal`);
          }
          finalPrice = Math.max(1, Math.round(finalPrice - offerDiscount));
        }

        // 2. Check for stackable Coupon Code (applied on top of offer price)
        if (body.coupon_code && body.coupon_code.trim()) {
          const cleanCode = body.coupon_code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          const coupon = await getCouponByCode(env.DB, cleanCode);
          if (coupon && (!coupon.expires_at || coupon.expires_at >= now) && (coupon.max_uses <= 0 || coupon.times_used < coupon.max_uses)) {
            let couponDiscount = 0;
            if (coupon.discount_type === 'percent') {
              couponDiscount = (finalPrice * coupon.discount_value) / 100;
              discountNotes.push(`Coupon ${cleanCode}: ${coupon.discount_value}% OFF`);
            } else {
              couponDiscount = coupon.discount_value;
              discountNotes.push(`Coupon ${cleanCode}: ₹${Math.round(coupon.discount_value)} OFF`);
            }
            finalPrice = Math.max(1, Math.round(finalPrice - couponDiscount));
            validCouponCode = cleanCode;
          }
        }

        // 3. Check for Refer & Earn referral code
        let validReferralCode = '';
        const candidateReferral = (body.referral_code || body.coupon_code || '').trim().toUpperCase();
        if (candidateReferral) {
          const refProfile = await getReferralProfileByCode(env.DB, candidateReferral);
          if (refProfile && refProfile.user_email.toLowerCase() !== cleanEmail) {
            validReferralCode = refProfile.referral_code;
            if (!validCouponCode) {
              const friendDiscType = await getStoreSetting(env.DB, 'referral_friend_discount_type', 'percent');
              const friendDiscVal = parseFloat(await getStoreSetting(env.DB, 'referral_friend_discount_value', '10')) || 10;
              let refDiscount = 0;
              if (friendDiscType === 'percent') {
                refDiscount = (finalPrice * friendDiscVal) / 100;
              } else {
                refDiscount = friendDiscVal;
              }
              finalPrice = Math.max(1, Math.round(finalPrice - refDiscount));
              discountNotes.push(`Referral ${validReferralCode}: ${friendDiscVal}% OFF`);
            }
          }
        }

        finalPrice = Math.max(1, Math.round(finalPrice));

        let paymentUrl = await getStoreSetting(env.DB, 'store_url', env.STORE_URL || 'https://rzp.io/rzp/eBLEV0w');

        if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
          try {
            const authHeader = 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
            const plRes = await fetch('https://api.razorpay.com/v1/payment_links', {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: Math.round(finalPrice * 100),
                currency: 'INR',
                accept_partial: false,
                description: `TG Drive: Lifetime Pro License${discountNotes.length > 0 ? ` (${discountNotes.join(' + ')})` : ''}`,
                customer: {
                  name: cleanName,
                  email: cleanEmail,
                },
                notify: { sms: false, email: true },
                reminder_enable: true,
                notes: {
                  product: 'tg_drive_lifetime_pro',
                  name: cleanName,
                  email: cleanEmail,
                  coupon: validCouponCode,
                  referral_code: validReferralCode,
                },
              }),
            });

            const plData = (await plRes.json()) as { short_url?: string };
            if (plRes.ok && plData.short_url) {
              paymentUrl = plData.short_url;
            }
          } catch (err) {
            console.error('Error generating prefilled Razorpay link:', err);
          }
        }

        return jsonResponse({
          success: true,
          payment_url: paymentUrl,
          name: cleanName,
          email: cleanEmail,
          final_price: finalPrice,
          formatted_price: `₹${finalPrice}`,
        });
      }

      // -------------------------------------------------------------
      // 3. Client App License APIs
      // -------------------------------------------------------------

      // POST /api/license/activate
      if (url.pathname === '/api/license/activate' && request.method === 'POST') {
        const body = (await request.json()) as ActivationRequest;
        if (!body.license_key || !body.hardware_id) {
          return jsonResponse({ error: 'Missing license_key or hardware_id' }, 400);
        }

        const cleanKey = body.license_key.trim().toUpperCase();
        const license = await getLicenseByKey(env.DB, cleanKey);

        if (!license) {
          return jsonResponse({ error: 'Invalid license key. Please check your key and try again.' }, 404);
        }

        if (license.is_banned === 1) {
          return jsonResponse({ error: `License is banned: ${license.ban_reason || 'Terms violation'}` }, 403);
        }

        const now = Math.floor(Date.now() / 1000);
        if (license.expires_at && license.expires_at < now) {
          return jsonResponse({ error: 'License key has expired. Please renew your license.' }, 403);
        }

        // Check if this device is already activated
        const devices = await getDevicesForLicense(env.DB, cleanKey);
        const existingDevice = devices.find(d => d.hardware_id === body.hardware_id);

        if (!existingDevice) {
          // Anti-abuse: A device cannot activate any new trial key if it has already utilized a trial before
          if (license.plan_type === 'trial') {
            const usedPastTrial = await env.DB.prepare(`
              SELECT d.id FROM device_activations d
              JOIN licenses l ON d.license_key = l.license_key
              WHERE d.hardware_id = ? AND l.plan_type = 'trial' AND l.license_key != ?
            `).bind(body.hardware_id, cleanKey).first();

            if (usedPastTrial) {
              return jsonResponse(
                { error: 'This device has already utilized a free trial period. Please upgrade to a Pro license to continue.' },
                403
              );
            }
          }

          // New device activation - check strict 1 PC + 1 Mobile slot limits
          const activeDevices = devices.filter(d => d.is_revoked === 0);
          const targetPlatform = body.platform || 'windows';
          const isMobile = targetPlatform === 'android' || targetPlatform === 'ios';

          if (license.max_devices <= 2) {
            // Standard license: strictly 1 Desktop + 1 Phone
            if (isMobile) {
              const activeMobile = activeDevices.filter(d => d.platform === 'android' || d.platform === 'ios');
              if (activeMobile.length >= 1) {
                return jsonResponse(
                  {
                    error: 'Mobile phone limit reached (Max 1 Phone per standard license). Please deactivate your existing phone first to transfer.',
                  },
                  429
                );
              }
            } else {
              const activeDesktop = activeDevices.filter(d => d.platform !== 'android' && d.platform !== 'ios');
              if (activeDesktop.length >= 1) {
                return jsonResponse(
                  {
                    error: 'Desktop PC limit reached (Max 1 PC/Laptop per standard license). Please deactivate your existing PC first to transfer.',
                  },
                  429
                );
              }
            }
          } else {
            // Custom multi-device license
            if (activeDevices.length >= license.max_devices) {
              return jsonResponse(
                {
                  error: `Device limit reached (${activeDevices.length}/${license.max_devices} devices active). Please transfer or deactivate an existing device first.`,
                },
                429
              );
            }
          }
        }

        // Activate or refresh device record
        const activationId = existingDevice ? existingDevice.id : crypto.randomUUID();
        await activateDevice(env.DB, {
          id: activationId,
          license_key: cleanKey,
          hardware_id: body.hardware_id,
          device_name: body.device_name || 'My Device',
          platform: body.platform || 'windows',
        });

        // Generate signed token
        const claims: LicenseClaims = {
          sub: cleanKey,
          hwid: body.hardware_id,
          plan: license.plan_type,
          exp: license.expires_at,
          iat: now,
          iss: 'tg-drive-licensing',
          name: license.customer_name || undefined,
        };

        const token = await issueLicenseToken(claims, env);

        return jsonResponse({
          success: true,
          token,
          license_key: cleanKey,
          plan_type: license.plan_type,
          expires_at: license.expires_at,
          customer_name: license.customer_name,
          max_devices: license.max_devices,
        });
      }

      // POST /api/license/verify
      if (url.pathname === '/api/license/verify' && request.method === 'POST') {
        const body = (await request.json()) as VerifyRequest;
        if (!body.license_key || !body.hardware_id) {
          return jsonResponse({ error: 'Missing license_key or hardware_id' }, 400);
        }

        const cleanKey = body.license_key.trim().toUpperCase();
        const license = await getLicenseByKey(env.DB, cleanKey);

        if (!license || license.is_banned === 1) {
          return jsonResponse({ valid: false, reason: license ? 'License banned' : 'License not found' }, 200);
        }

        const now = Math.floor(Date.now() / 1000);
        if (license.expires_at && license.expires_at < now) {
          return jsonResponse({ valid: false, reason: 'License expired' }, 200);
        }

        // Update last seen
        await touchDevice(env.DB, cleanKey, body.hardware_id);

        return jsonResponse({
          valid: true,
          plan_type: license.plan_type,
          expires_at: license.expires_at,
          customer_name: license.customer_name,
        });
      }

      // POST /api/license/deactivate
      if (url.pathname === '/api/license/deactivate' && request.method === 'POST') {
        const body = (await request.json()) as DeactivateRequest;
        if (!body.license_key || !body.hardware_id) {
          return jsonResponse({ error: 'Missing license_key or hardware_id' }, 400);
        }

        await deactivateDevice(env.DB, body.license_key, body.hardware_id);
        return jsonResponse({ success: true, message: 'Device deactivated successfully' });
      }

      // -------------------------------------------------------------
      // 3.5 OTP-Based Self-Service Key Recovery & Device Management APIs
      // -------------------------------------------------------------

      // POST /api/license/request-otp
      if (url.pathname === '/api/license/request-otp' && request.method === 'POST') {
        const body = (await request.json()) as RequestOtpRequest;
        if (!body.email) return jsonResponse({ error: 'Missing email' }, 400);

        const cleanEmail = body.email.trim().toLowerCase();
        const now = Math.floor(Date.now() / 1000);

        // Check rate limiting (max 1 request per 60s per email)
        const existingOtp = await getLatestOtpForEmail(env.DB, cleanEmail);
        if (existingOtp && now - existingOtp.created_at < 60) {
          const waitTime = 60 - (now - existingOtp.created_at);
          return jsonResponse({ error: `Please wait ${waitTime}s before requesting a new code.` }, 429);
        }

        const licenses = await getLicensesByEmail(env.DB, cleanEmail);
        if (licenses.length === 0) {
          return jsonResponse(
            {
              success: false,
              error: 'No active license found for this email address. Please verify your spelling or purchase a license.',
            },
            404
          );
        }

        // Generate cryptographically secure 6-digit OTP
        const otpCode = generateOtpCode();
        const otpHash = await sha256Hex(`${otpCode}:${cleanEmail}`);
        const id = crypto.randomUUID();
        const expiresAt = now + 600; // 10 minutes

        await saveOtpRecord(env.DB, {
          id,
          email: cleanEmail,
          otp_hash: otpHash,
          expires_at: expiresAt,
        });

        // Send email via Resend
        await sendOtpEmail(env, {
          to: cleanEmail,
          otpCode,
        });

        return jsonResponse({
          success: true,
          message: 'Verification code sent to your email.',
        });
      }

      // POST /api/license/verify-otp
      if (url.pathname === '/api/license/verify-otp' && request.method === 'POST') {
        const body = (await request.json()) as VerifyOtpRequest;
        if (!body.email || !body.otp) return jsonResponse({ error: 'Missing email or otp' }, 400);

        const cleanEmail = body.email.trim().toLowerCase();
        const cleanOtp = body.otp.trim();
        const now = Math.floor(Date.now() / 1000);

        const record = await getLatestOtpForEmail(env.DB, cleanEmail);
        if (!record) {
          return jsonResponse({ error: 'No verification code was requested for this email.' }, 400);
        }

        if (record.expires_at < now) {
          await deleteOtpForEmail(env.DB, cleanEmail);
          return jsonResponse({ error: 'Verification code has expired. Please request a new one.' }, 400);
        }

        if (record.attempts >= 5) {
          await deleteOtpForEmail(env.DB, cleanEmail);
          return jsonResponse({ error: 'Too many failed attempts. Please request a new code.' }, 429);
        }

        const expectedHash = await sha256Hex(`${cleanOtp}:${cleanEmail}`);
        if (!timingSafeEqual(record.otp_hash, expectedHash)) {
          await incrementOtpAttempts(env.DB, record.id);
          return jsonResponse({ error: 'Invalid verification code. Please check and try again.' }, 400);
        }

        // OTP verified successfully - cleanup OTP
        await deleteOtpForEmail(env.DB, cleanEmail);

        // Generate temporary recovery session token (1 hour validity)
        const secret = env.ADMIN_SECRET || 'tg-drive-master-secret-2026';
        const sessionToken = await createRecoveryToken(cleanEmail, secret);

        // Fetch customer licenses & active devices
        const licenses = await getLicensesByEmail(env.DB, cleanEmail);
        const licensesWithDevices = await Promise.all(
          licenses.map(async lic => {
            const devices = await getDevicesForLicense(env.DB, lic.license_key);
            return {
              ...lic,
              devices: devices.filter(d => d.is_revoked === 0),
            };
          })
        );

        return jsonResponse({
          success: true,
          session_token: sessionToken,
          licenses: licensesWithDevices,
        });
      }

      // POST /api/license/self-reset-device
      if (url.pathname === '/api/license/self-reset-device' && request.method === 'POST') {
        const body = (await request.json()) as SelfResetDeviceRequest;
        if (!body.email || !body.session_token || !body.hardware_id) {
          return jsonResponse({ error: 'Missing required parameters' }, 400);
        }

        const cleanEmail = body.email.trim().toLowerCase();
        const secret = env.ADMIN_SECRET || 'tg-drive-master-secret-2026';
        const isValidSession = await verifyRecoveryToken(body.session_token, secret, cleanEmail);

        if (!isValidSession) {
          return jsonResponse({ error: 'Session expired or invalid. Please verify with OTP again.' }, 401);
        }

        // Verify this device belongs to one of customer's licenses
        const licenses = await getLicensesByEmail(env.DB, cleanEmail);
        let found = false;
        for (const lic of licenses) {
          const devices = await getDevicesForLicense(env.DB, lic.license_key);
          const dev = devices.find(d => d.hardware_id === body.hardware_id);
          if (dev) {
            await deactivateDevice(env.DB, lic.license_key, body.hardware_id);
            await recordAdminLog(env.DB, 'SELF_DEVICE_RESET', lic.license_key, `Customer deactivated device ${body.hardware_id}`);
            found = true;
            break;
          }
        }

        if (!found) {
          return jsonResponse({ error: 'Device not found on your licenses.' }, 404);
        }

        return jsonResponse({ success: true, message: 'Device slot deactivated successfully.' });
      }

      // -------------------------------------------------------------
      // 4. Lemon Squeezy Automated Webhook (/api/webhooks/lemonsqueezy)
      // -------------------------------------------------------------
      if (url.pathname === '/api/webhooks/lemonsqueezy' && request.method === 'POST') {
        const rawBody = await request.text();
        const signature = request.headers.get('x-signature') || '';

        // If secret is set, verify HMAC signature
        if (env.LEMON_SQUEEZY_WEBHOOK_SECRET) {
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(env.LEMON_SQUEEZY_WEBHOOK_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          const expectedSig = Array.from(
            new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)))
          )
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          if (!timingSafeEqual(signature, expectedSig)) {
            return jsonResponse({ error: 'Invalid webhook signature' }, 401);
          }
        }

        const payload = JSON.parse(rawBody) as {
          meta?: { event_name?: string };
          data?: {
            id?: string;
            attributes?: {
              user_name?: string;
              user_email?: string;
              status?: string;
              order_number?: number;
            };
          };
        };

        const eventName = payload.meta?.event_name || '';
        if (eventName === 'order_created' || eventName === 'subscription_created') {
          const attr = payload.data?.attributes;
          const key = generateLicenseKey();
          const id = crypto.randomUUID();

          await createLicense(env.DB, {
            id,
            license_key: key,
            customer_name: attr?.user_name || 'LemonSqueezy Customer',
            customer_email: attr?.user_email || null,
            plan_type: 'lifetime',
            max_devices: parseInt(env.MAX_DEFAULT_DEVICES || '2', 10),
            notes: `LemonSqueezy Order #${attr?.order_number || payload.data?.id || ''}`,
          });

          await recordAdminLog(env.DB, 'LEMON_SQUEEZY_ORDER', key, `Auto-generated for ${attr?.user_email}`);

          // Automated email delivery to customer
          if (attr?.user_email) {
            await sendPurchaseEmail(env, {
              to: attr.user_email,
              name: attr.user_name || null,
              licenseKey: key,
              planType: 'lifetime',
              orderId: String(attr?.order_number || payload.data?.id || ''),
            });
          }

          return jsonResponse({ received: true, license_key: key });
        }

        return jsonResponse({ received: true });
      }

      // -------------------------------------------------------------
      // 4.5 Razorpay Automated Webhook (/api/webhooks/razorpay or /api/webhook)
      // -------------------------------------------------------------
      if ((url.pathname === '/api/webhooks/razorpay' || url.pathname === '/api/webhook' || url.pathname === '/webhook') && request.method === 'POST') {
        const rawBody = await request.text();
        const payload = JSON.parse(rawBody) as {
          event?: string;
          payload?: {
            payment?: {
              entity?: {
                id?: string;
                email?: string;
                notes?: Record<string, string>;
                amount?: number;
              };
            };
            payment_link?: {
              entity?: {
                id?: string;
                customer?: {
                  email?: string;
                  name?: string;
                };
              };
            };
            order?: {
              entity?: {
                id?: string;
                notes?: Record<string, string>;
              };
            };
          };
        };

        const eventName = payload.event || '';
        if (eventName === 'payment.captured' || eventName === 'payment_link.paid' || eventName === 'order.paid') {
          const paymentEntity = payload.payload?.payment?.entity;
          const plinkCustomer = payload.payload?.payment_link?.entity?.customer;
          const orderEntity = payload.payload?.order?.entity;

          // Collect candidate emails in priority order
          const candidates: (string | undefined)[] = [
            paymentEntity?.notes?.email,
            paymentEntity?.notes?.customer_email,
            paymentEntity?.notes?.['Email Address'],
            paymentEntity?.notes?.['Email'],
            orderEntity?.notes?.email,
            orderEntity?.notes?.customer_email,
            plinkCustomer?.email,
            paymentEntity?.email,
          ];

          // Filter out empty or dummy void@razorpay.com emails
          let email = candidates
            .map(e => (e || '').trim().toLowerCase())
            .find(e => e && e.includes('@') && !e.includes('void@razorpay.com')) || '';

          if (!email && paymentEntity?.email) {
            email = paymentEntity.email.trim().toLowerCase();
          }
          const name = plinkCustomer?.name ||
            paymentEntity?.notes?.name ||
            paymentEntity?.notes?.customer_name ||
            paymentEntity?.notes?.['Full Name'] ||
            'Valued Customer';

          const orderId = paymentEntity?.id || payload.payload?.payment_link?.entity?.id || orderEntity?.id || 'RZP-' + Date.now();

          if (email) {
            // Check if license already exists for this exact order ID (Deduplication against multiple Razorpay webhooks)
            const existingLicenses = await getLicensesByEmail(env.DB, email);
            const existingMatch = existingLicenses.find(l => l.notes && l.notes.includes(orderId));

            if (existingMatch) {
              console.log(`[RAZORPAY_WEBHOOK] Order ${orderId} already processed (License: ${existingMatch.license_key}). Skipping duplicate email.`);
              return jsonResponse({ success: true, license_key: existingMatch.license_key, duplicate_skipped: true });
            }

            const key = generateLicenseKey();
            const id = crypto.randomUUID();

            await createLicense(env.DB, {
              id,
              license_key: key,
              customer_name: name,
              customer_email: email,
              plan_type: 'lifetime',
              max_devices: parseInt(env.MAX_DEFAULT_DEVICES || '2', 10),
              notes: `Razorpay Payment ID: ${orderId}`,
            });

            await recordAdminLog(env.DB, 'RAZORPAY_ORDER', key, `Auto-generated for ${email}`);

            // Process Refer & Earn commission if a valid referral code was used
            const referralCode = paymentEntity?.notes?.referral_code ||
              orderEntity?.notes?.referral_code ||
              paymentEntity?.notes?.coupon;

            if (referralCode) {
              try {
                const referrer = await getReferralProfileByCode(env.DB, referralCode);
                if (referrer && referrer.user_email.toLowerCase() !== email.toLowerCase()) {
                  const referralEnabled = (await getStoreSetting(env.DB, 'referral_enabled', '1')) === '1';
                  if (referralEnabled) {
                    const rewardType = await getStoreSetting(env.DB, 'referral_reward_type', 'fixed');
                    const rewardVal = parseFloat(await getStoreSetting(env.DB, 'referral_reward_value', '50')) || 50;
                    const paidAmount = paymentEntity?.amount ? paymentEntity.amount / 100 : 399;
                    let commission = rewardVal;
                    if (rewardType === 'percent') {
                      commission = Math.round((paidAmount * rewardVal) / 100);
                    }

                    await recordReferralConversion(env.DB, {
                      referral_code: referrer.referral_code,
                      referrer_email: referrer.user_email,
                      referred_email: email,
                      order_id: orderId,
                      order_amount: paidAmount,
                      commission_amount: commission,
                      conversion_type: 'pro_purchase',
                    });

                    // Send notification email to referrer
                    try {
                      await sendReferralEarningEmail(env, {
                        to: referrer.user_email,
                        name: referrer.user_name || undefined,
                        earnedAmount: commission,
                        walletBalance: referrer.wallet_balance + commission,
                        referralCode: referrer.referral_code,
                      });
                    } catch (err) {
                      console.error('Failed to send referral earning email:', err);
                    }
                  }
                }
              } catch (refErr) {
                console.error('Error processing referral reward in webhook:', refErr);
              }
            }

            // Automated email delivery with attached PDF Certificate (Sent EXACTLY ONCE)
            const emailSent = await sendPurchaseEmail(env, {
              to: email,
              name,
              licenseKey: key,
              planType: 'lifetime',
              orderId,
            });

            console.log(`[RAZORPAY_WEBHOOK] Processed new order ${orderId} for ${email}. Email sent: ${emailSent}`);
            return jsonResponse({ success: true, license_key: key, email_sent: emailSent });
          }
        }

        return jsonResponse({ received: true });
      }

      // Root ping
      if (url.pathname === '/' || url.pathname === '/health') {
        return jsonResponse({
          status: 'online',
          app: env.APP_NAME || 'TG Drive: Unlimited Cloud',
          version: '1.0.0',
        });
      }

      return jsonResponse({ error: 'Not Found', path: url.pathname }, 404);
    } catch (err) {
      console.error('Unhandled error:', err);
      const msg = err instanceof Error ? err.message : 'Internal Server Error';
      return jsonResponse({ error: msg }, 500);
    }
  },

  // Cron Trigger: runs daily to send trial expiry reminder emails (3 days before expiry)
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      // Find trial licenses expiring in 3 days (±12 hour window to avoid double sends)
      const threeDaysFromNow = now + 3 * 86400;
      const windowStart = threeDaysFromNow - 43200; // -12h
      const windowEnd   = threeDaysFromNow + 43200; // +12h

      const rows = await env.DB.prepare(`
        SELECT license_key, customer_name, customer_email, expires_at
        FROM licenses
        WHERE plan_type = 'trial'
          AND is_banned = 0
          AND expires_at IS NOT NULL
          AND expires_at >= ?
          AND expires_at <= ?
          AND customer_email IS NOT NULL
      `).bind(windowStart, windowEnd).all();

      const trials = (rows.results || []) as { license_key: string; customer_name: string | null; customer_email: string; expires_at: number }[];
      console.log(`[CRON] Found ${trials.length} trial(s) expiring in ~3 days. Sending reminders...`);

      for (const trial of trials) {
        const daysLeft = Math.ceil((trial.expires_at - now) / 86400);
        await sendTrialExpiryReminderEmail(env, {
          to: trial.customer_email,
          name: trial.customer_name,
          licenseKey: trial.license_key,
          expiresAt: trial.expires_at,
          daysLeft,
        }).catch(err => console.error(`Reminder email failed for ${trial.customer_email}:`, err));
      }
    } catch (err) {
      console.error('[CRON] Trial reminder job failed:', err);
    }
  },
};
