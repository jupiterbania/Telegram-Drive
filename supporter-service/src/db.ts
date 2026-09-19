import type { CrashReportRow, DeviceActivationRow, DevicePlatform, LicensePlan, LicenseRow } from './types';

// Creates a new license
export async function createLicense(
  db: D1Database,
  data: {
    id: string;
    license_key: string;
    customer_name?: string | null;
    customer_email?: string | null;
    plan_type: LicensePlan;
    max_devices: number;
    notes?: string | null;
    expires_at?: number | null;
  }
): Promise<LicenseRow> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO licenses (
        id, license_key, customer_name, customer_email, plan_type, max_devices, is_banned, notes, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
    )
    .bind(
      data.id,
      data.license_key,
      data.customer_name || null,
      data.customer_email || null,
      data.plan_type,
      data.max_devices,
      data.notes || null,
      now,
      data.expires_at || null
    )
    .run();

  return {
    id: data.id,
    license_key: data.license_key,
    customer_name: data.customer_name || null,
    customer_email: data.customer_email || null,
    plan_type: data.plan_type,
    max_devices: data.max_devices,
    is_banned: 0,
    ban_reason: null,
    notes: data.notes || null,
    created_at: now,
    expires_at: data.expires_at || null,
  };
}

// Retrieves license by Key
export async function getLicenseByKey(db: D1Database, key: string): Promise<LicenseRow | null> {
  return await db
    .prepare('SELECT * FROM licenses WHERE license_key = ?')
    .bind(key.trim().toUpperCase())
    .first<LicenseRow>();
}

// Lists licenses with their active device count
export async function listLicenses(
  db: D1Database,
  limit = 100,
  offset = 0
): Promise<(LicenseRow & { active_devices_count: number })[]> {
  const result = await db
    .prepare(
      `SELECT l.*, 
        (SELECT COUNT(*) FROM device_activations d WHERE d.license_key = l.license_key AND d.is_revoked = 0) as active_devices_count
       FROM licenses l
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(limit, offset)
    .all<LicenseRow & { active_devices_count: number }>();

  return result.results || [];
}

// Searches licenses by Key, Name, or Email
export async function searchLicenses(
  db: D1Database,
  query: string
): Promise<(LicenseRow & { active_devices_count: number })[]> {
  const q = `%${query.trim()}%`;
  const result = await db
    .prepare(
      `SELECT l.*, 
        (SELECT COUNT(*) FROM device_activations d WHERE d.license_key = l.license_key AND d.is_revoked = 0) as active_devices_count
       FROM licenses l
       WHERE l.license_key LIKE ? OR l.customer_name LIKE ? OR l.customer_email LIKE ?
       ORDER BY l.created_at DESC
       LIMIT 50`
    )
    .bind(q, q, q)
    .all<LicenseRow & { active_devices_count: number }>();

  return result.results || [];
}

// Bans a license
export async function banLicense(db: D1Database, key: string, reason: string): Promise<boolean> {
  const res = await db
    .prepare('UPDATE licenses SET is_banned = 1, ban_reason = ? WHERE license_key = ?')
    .bind(reason, key.trim().toUpperCase())
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// Unbans a license
export async function unbanLicense(db: D1Database, key: string): Promise<boolean> {
  const res = await db
    .prepare('UPDATE licenses SET is_banned = 0, ban_reason = NULL WHERE license_key = ?')
    .bind(key.trim().toUpperCase())
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// Deletes a license
export async function deleteLicense(db: D1Database, key: string): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM licenses WHERE license_key = ?')
    .bind(key.trim().toUpperCase())
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// Gets devices activated under a license
export async function getDevicesForLicense(db: D1Database, key: string): Promise<DeviceActivationRow[]> {
  const res = await db
    .prepare('SELECT * FROM device_activations WHERE license_key = ? ORDER BY activated_at DESC')
    .bind(key.trim().toUpperCase())
    .all<DeviceActivationRow>();
  return res.results || [];
}

// Counts active devices for a license
export async function countActiveDevices(db: D1Database, key: string): Promise<number> {
  const res = await db
    .prepare('SELECT COUNT(*) as count FROM device_activations WHERE license_key = ? AND is_revoked = 0')
    .bind(key.trim().toUpperCase())
    .first<{ count: number }>();
  return res?.count || 0;
}

// Activates or refreshes a device
export async function activateDevice(
  db: D1Database,
  data: {
    id: string;
    license_key: string;
    hardware_id: string;
    device_name: string;
    platform: DevicePlatform;
  }
): Promise<DeviceActivationRow> {
  const now = Math.floor(Date.now() / 1000);
  const key = data.license_key.trim().toUpperCase();

  await db
    .prepare(
      `INSERT INTO device_activations (
        id, license_key, hardware_id, device_name, platform, activated_at, last_seen_at, is_revoked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(license_key, hardware_id) DO UPDATE SET
        device_name = excluded.device_name,
        platform = excluded.platform,
        last_seen_at = excluded.last_seen_at,
        is_revoked = 0`
    )
    .bind(data.id, key, data.hardware_id, data.device_name, data.platform, now, now)
    .run();

  return {
    id: data.id,
    license_key: key,
    hardware_id: data.hardware_id,
    device_name: data.device_name,
    platform: data.platform,
    activated_at: now,
    last_seen_at: now,
    is_revoked: 0,
  };
}

// Deactivates a specific device
export async function deactivateDevice(db: D1Database, key: string, hardwareId: string): Promise<boolean> {
  const res = await db
    .prepare('UPDATE device_activations SET is_revoked = 1 WHERE license_key = ? AND hardware_id = ?')
    .bind(key.trim().toUpperCase(), hardwareId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// Resets/Revokes all devices for a license (e.g. transfer to new machine)
export async function resetDevicesForLicense(db: D1Database, key: string): Promise<boolean> {
  const res = await db
    .prepare('UPDATE device_activations SET is_revoked = 1 WHERE license_key = ?')
    .bind(key.trim().toUpperCase())
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// Updates last seen timestamp for a hardware ID
export async function touchDevice(db: D1Database, key: string, hardwareId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE device_activations SET last_seen_at = ? WHERE license_key = ? AND hardware_id = ?')
    .bind(now, key.trim().toUpperCase(), hardwareId)
    .run();
}

// Records audit log
export async function recordAdminLog(
  db: D1Database,
  action: string,
  targetKey: string | null,
  details: string | null
): Promise<void> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('INSERT INTO admin_audit_logs (id, action, target_key, details, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, action, targetKey, details, now)
    .run();
}

// Gets dashboard summary metrics
export async function getDashboardStats(db: D1Database): Promise<{
  totalLicenses: number;
  activeDevices: number;
  bannedLicenses: number;
  lifetimeLicenses: number;
  totalCrashes: number;
}> {
  const total = await db.prepare('SELECT COUNT(*) as count FROM licenses').first<{ count: number }>();
  const activeDev = await db.prepare('SELECT COUNT(*) as count FROM device_activations WHERE is_revoked = 0').first<{ count: number }>();
  const banned = await db.prepare('SELECT COUNT(*) as count FROM licenses WHERE is_banned = 1').first<{ count: number }>();
  const lifetime = await db.prepare("SELECT COUNT(*) as count FROM licenses WHERE plan_type = 'lifetime'").first<{ count: number }>();
  let crashesCount = 0;
  try {
    const crashes = await db.prepare('SELECT COUNT(*) as count FROM crash_reports').first<{ count: number }>();
    crashesCount = crashes?.count || 0;
  } catch {
    crashesCount = 0;
  }

  return {
    totalLicenses: total?.count || 0,
    activeDevices: activeDev?.count || 0,
    bannedLicenses: banned?.count || 0,
    lifetimeLicenses: lifetime?.count || 0,
    totalCrashes: crashesCount,
  };
}


// Retrieves all active licenses associated with an email
export async function getLicensesByEmail(db: D1Database, email: string): Promise<LicenseRow[]> {
  const cleanEmail = email.trim().toLowerCase();
  const res = await db
    .prepare('SELECT * FROM licenses WHERE LOWER(customer_email) = ? ORDER BY created_at DESC')
    .bind(cleanEmail)
    .all<LicenseRow>();
  return res.results || [];
}

// Saves a hashed OTP code for recovery
export async function saveOtpRecord(
  db: D1Database,
  data: {
    id: string;
    email: string;
    otp_hash: string;
    expires_at: number;
  }
): Promise<void> {
  const cleanEmail = data.email.trim().toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  // Delete any old OTPs for this email first
  await db.prepare('DELETE FROM recovery_otps WHERE LOWER(email) = ?').bind(cleanEmail).run();

  await db
    .prepare(
      'INSERT INTO recovery_otps (id, email, otp_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, 0, ?, ?)'
    )
    .bind(data.id, cleanEmail, data.otp_hash, data.expires_at, now)
    .run();
}

// Gets the most recent OTP record for an email
export async function getLatestOtpForEmail(
  db: D1Database,
  email: string
): Promise<{ id: string; email: string; otp_hash: string; attempts: number; expires_at: number; created_at: number } | null> {
  const cleanEmail = email.trim().toLowerCase();
  return await db
    .prepare('SELECT * FROM recovery_otps WHERE LOWER(email) = ? ORDER BY created_at DESC LIMIT 1')
    .bind(cleanEmail)
    .first<{ id: string; email: string; otp_hash: string; attempts: number; expires_at: number; created_at: number }>();
}

// Increments the failed attempt counter for an OTP
export async function incrementOtpAttempts(db: D1Database, id: string): Promise<void> {
  await db.prepare('UPDATE recovery_otps SET attempts = attempts + 1 WHERE id = ?').bind(id).run();
}

// Deletes OTP after successful verification
export async function deleteOtpForEmail(db: D1Database, email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  await db.prepare('DELETE FROM recovery_otps WHERE LOWER(email) = ?').bind(cleanEmail).run();
}

// -------------------------------------------------------------
// Auto-Migration & Schema Safety
// -------------------------------------------------------------
let tablesInitialized = false;

export async function ensureStoreTables(db: D1Database): Promise<void> {
  if (tablesInitialized) return;
  try {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS store_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        discount_type TEXT NOT NULL DEFAULT 'percent',
        discount_value REAL NOT NULL,
        max_uses INTEGER NOT NULL DEFAULT 0,
        times_used INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS special_offers (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        badge TEXT,
        description TEXT NOT NULL,
        discount_type TEXT DEFAULT 'percent',
        discount_value REAL DEFAULT 0,
        original_price REAL,
        offer_price REAL,
        perks TEXT,
        coupon_code TEXT,
        cta_text TEXT,
        banner_style TEXT,
        countdown_end INTEGER,
        is_active INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS recovery_otps (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS referral_profiles (
        id TEXT PRIMARY KEY,
        referral_code TEXT NOT NULL UNIQUE,
        user_email TEXT NOT NULL UNIQUE,
        user_name TEXT,
        total_clicks INTEGER DEFAULT 0,
        total_referrals INTEGER DEFAULT 0,
        total_pro_sales INTEGER DEFAULT 0,
        total_earned REAL DEFAULT 0,
        wallet_balance REAL DEFAULT 0,
        pending_payout REAL DEFAULT 0,
        total_paid REAL DEFAULT 0,
        default_payout_method TEXT DEFAULT 'upi',
        default_upi_id TEXT,
        default_bank_name TEXT,
        default_bank_account TEXT,
        default_bank_ifsc TEXT,
        default_bank_holder TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS referral_conversions (
        id TEXT PRIMARY KEY,
        referral_code TEXT NOT NULL,
        referrer_email TEXT NOT NULL,
        referred_email TEXT NOT NULL,
        order_id TEXT,
        order_amount REAL DEFAULT 0,
        commission_amount REAL DEFAULT 0,
        conversion_type TEXT DEFAULT 'pro_purchase',
        status TEXT DEFAULT 'completed',
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS payout_requests (
        id TEXT PRIMARY KEY,
        referral_code TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_name TEXT,
        amount REAL NOT NULL,
        payout_method TEXT NOT NULL,
        upi_id TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_ifsc TEXT,
        bank_holder_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        utr_number TEXT,
        created_at INTEGER NOT NULL,
        processed_at INTEGER
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS crash_reports (
        id TEXT PRIMARY KEY,
        app_version TEXT NOT NULL,
        source TEXT NOT NULL,
        error_type TEXT NOT NULL,
        frames TEXT NOT NULL,
        platform TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_crash_reports_created_at ON crash_reports(created_at DESC)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_crash_reports_version ON crash_reports(app_version)`),
    ]);
    tablesInitialized = true;
  } catch (err) {
    console.error('Error in ensureStoreTables:', err);
  }
}

// -------------------------------------------------------------
// Store Settings & Dynamic Pricing
// -------------------------------------------------------------
export async function getStoreSetting(db: D1Database, key: string, defaultValue: string): Promise<string> {
  try {
    await ensureStoreTables(db);
    const row = await db.prepare('SELECT value FROM store_settings WHERE key = ?').bind(key).first<{ value: string }>();
    return row?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setStoreSetting(db: D1Database, key: string, value: string): Promise<void> {
  await ensureStoreTables(db);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      'INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    )
    .bind(key, value, now)
    .run();
}

// -------------------------------------------------------------
// Coupons Management
// -------------------------------------------------------------
export interface CouponRow {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number;
  times_used: number;
  expires_at: number | null;
  is_active: number;
  created_at: number;
}

export async function listCoupons(db: D1Database): Promise<CouponRow[]> {
  try {
    await ensureStoreTables(db);
    const res = await db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all<CouponRow>();
    return res.results || [];
  } catch {
    return [];
  }
}

export async function createCoupon(
  db: D1Database,
  data: {
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    max_uses?: number;
    duration_days?: number;
  }
): Promise<CouponRow> {
  await ensureStoreTables(db);
  const id = crypto.randomUUID();
  const cleanCode = data.code.trim().toUpperCase();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = data.duration_days && data.duration_days > 0 ? now + data.duration_days * 86400 : null;
  const maxUses = data.max_uses || 0;

  await db
    .prepare(
      'INSERT INTO coupons (id, code, discount_type, discount_value, max_uses, times_used, expires_at, is_active, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?)'
    )
    .bind(id, cleanCode, data.discount_type, data.discount_value, maxUses, expiresAt, now)
    .run();

  return {
    id,
    code: cleanCode,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    max_uses: maxUses,
    times_used: 0,
    expires_at: expiresAt,
    is_active: 1,
    created_at: now,
  };
}

export async function deleteCoupon(db: D1Database, id: string): Promise<boolean> {
  await ensureStoreTables(db);
  const res = await db.prepare('DELETE FROM coupons WHERE id = ? OR code = ?').bind(id, id.trim().toUpperCase()).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function getCouponByCode(db: D1Database, code: string): Promise<CouponRow | null> {
  try {
    await ensureStoreTables(db);
    const cleanCode = code.trim().toUpperCase();
    return await db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').bind(cleanCode).first<CouponRow>();
  } catch {
    return null;
  }
}

export async function incrementCouponUsage(db: D1Database, code: string): Promise<void> {
  await ensureStoreTables(db);
  const cleanCode = code.trim().toUpperCase();
  await db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE code = ?').bind(cleanCode).run();
}

// -------------------------------------------------------------
// Refer & Earn / Affiliate System Helpers
// -------------------------------------------------------------
export interface ReferralProfileRow {
  id: string;
  referral_code: string;
  user_email: string;
  user_name: string | null;
  total_clicks: number;
  total_referrals: number;
  total_pro_sales: number;
  total_earned: number;
  wallet_balance: number;
  pending_payout: number;
  total_paid: number;
  default_payout_method: string | null;
  default_upi_id: string | null;
  default_bank_name: string | null;
  default_bank_account: string | null;
  default_bank_ifsc: string | null;
  default_bank_holder: string | null;
  created_at: number;
  updated_at: number;
}

export interface PayoutRequestRow {
  id: string;
  referral_code: string;
  user_email: string;
  user_name: string | null;
  amount: number;
  payout_method: 'upi' | 'bank';
  upi_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  bank_holder_name: string | null;
  status: 'pending' | 'completed' | 'rejected';
  admin_notes: string | null;
  utr_number: string | null;
  created_at: number;
  processed_at: number | null;
}

export interface ReferralConversionRow {
  id: string;
  referral_code: string;
  referrer_email: string;
  referred_email: string;
  order_id: string | null;
  order_amount: number;
  commission_amount: number;
  conversion_type: string;
  status: string;
  created_at: number;
}

function generateReferralCode(email: string, name?: string): string {
  let prefix = 'TG';
  if (name && name.trim()) {
    const clean = name.trim().replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    if (clean.length >= 2) prefix = clean;
  } else if (email && email.includes('@')) {
    const localPart = email.split('@')[0] || '';
    const local = localPart.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    if (local.length >= 2) prefix = local;
  }
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${randomSuffix}`;
}

export async function getOrCreateReferralProfile(
  db: D1Database,
  email: string,
  name?: string
): Promise<ReferralProfileRow> {
  await ensureStoreTables(db);
  const cleanEmail = email.trim().toLowerCase();

  const existing = await db
    .prepare('SELECT * FROM referral_profiles WHERE LOWER(user_email) = ?')
    .bind(cleanEmail)
    .first<ReferralProfileRow>();

  if (existing) {
    if (name && (!existing.user_name || existing.user_name !== name.trim())) {
      await db
        .prepare('UPDATE referral_profiles SET user_name = ?, updated_at = ? WHERE id = ?')
        .bind(name.trim(), Math.floor(Date.now() / 1000), existing.id)
        .run();
      existing.user_name = name.trim();
    }
    return existing;
  }

  const id = crypto.randomUUID();
  let referralCode = generateReferralCode(cleanEmail, name);

  // Ensure code uniqueness
  const codeCollision = await db.prepare('SELECT id FROM referral_profiles WHERE referral_code = ?').bind(referralCode).first();
  if (codeCollision) {
    referralCode = `TG-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  }

  const now = Math.floor(Date.now() / 1000);
  const cleanName = name ? name.trim() : null;

  await db
    .prepare(
      `INSERT INTO referral_profiles (
        id, referral_code, user_email, user_name,
        total_clicks, total_referrals, total_pro_sales, total_earned,
        wallet_balance, pending_payout, total_paid,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, ?, ?)`
    )
    .bind(id, referralCode, cleanEmail, cleanName, now, now)
    .run();

  return {
    id,
    referral_code: referralCode,
    user_email: cleanEmail,
    user_name: cleanName,
    total_clicks: 0,
    total_referrals: 0,
    total_pro_sales: 0,
    total_earned: 0,
    wallet_balance: 0,
    pending_payout: 0,
    total_paid: 0,
    default_payout_method: 'upi',
    default_upi_id: null,
    default_bank_name: null,
    default_bank_account: null,
    default_bank_ifsc: null,
    default_bank_holder: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getReferralProfileByCode(
  db: D1Database,
  code: string
): Promise<ReferralProfileRow | null> {
  try {
    await ensureStoreTables(db);
    const cleanCode = code.trim().toUpperCase();
    return await db
      .prepare('SELECT * FROM referral_profiles WHERE referral_code = ?')
      .bind(cleanCode)
      .first<ReferralProfileRow>();
  } catch {
    return null;
  }
}

export async function recordReferralConversion(
  db: D1Database,
  data: {
    referral_code: string;
    referrer_email: string;
    referred_email: string;
    order_id?: string;
    order_amount: number;
    commission_amount: number;
    conversion_type?: 'trial' | 'pro_purchase';
  }
): Promise<void> {
  await ensureStoreTables(db);
  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();
  const conversionType = data.conversion_type || 'pro_purchase';

  await db.batch([
    db
      .prepare(
        `INSERT INTO referral_conversions (
          id, referral_code, referrer_email, referred_email,
          order_id, order_amount, commission_amount, conversion_type,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`
      )
      .bind(
        id,
        data.referral_code.toUpperCase(),
        data.referrer_email.toLowerCase(),
        data.referred_email.toLowerCase(),
        data.order_id || null,
        data.order_amount,
        data.commission_amount,
        conversionType,
        now
      ),
    db
      .prepare(
        `UPDATE referral_profiles SET
          total_referrals = total_referrals + 1,
          total_pro_sales = total_pro_sales + (CASE WHEN ? = 'pro_purchase' THEN 1 ELSE 0 END),
          total_earned = total_earned + ?,
          wallet_balance = wallet_balance + ?,
          updated_at = ?
        WHERE referral_code = ?`
      )
      .bind(
        conversionType,
        data.commission_amount,
        data.commission_amount,
        now,
        data.referral_code.toUpperCase()
      ),
  ]);
}

export async function createPayoutRequest(
  db: D1Database,
  data: {
    email: string;
    name?: string;
    amount: number;
    payout_method: 'upi' | 'bank';
    upi_id?: string;
    bank_name?: string;
    bank_account?: string;
    bank_ifsc?: string;
    bank_holder_name?: string;
  }
): Promise<{ success: boolean; error?: string; payout?: PayoutRequestRow }> {
  await ensureStoreTables(db);
  const cleanEmail = data.email.trim().toLowerCase();
  const profile = await getOrCreateReferralProfile(db, cleanEmail, data.name);

  if (profile.wallet_balance < data.amount) {
    return {
      success: false,
      error: `Insufficient wallet balance. Available: ₹${profile.wallet_balance.toFixed(2)}, Requested: ₹${data.amount.toFixed(2)}`,
    };
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.batch([
    db
      .prepare(
        `INSERT INTO payout_requests (
          id, referral_code, user_email, user_name, amount,
          payout_method, upi_id, bank_name, bank_account, bank_ifsc, bank_holder_name,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
      )
      .bind(
        id,
        profile.referral_code,
        cleanEmail,
        data.name ? data.name.trim() : profile.user_name,
        data.amount,
        data.payout_method,
        data.upi_id ? data.upi_id.trim() : null,
        data.bank_name ? data.bank_name.trim() : null,
        data.bank_account ? data.bank_account.trim() : null,
        data.bank_ifsc ? data.bank_ifsc.trim().toUpperCase() : null,
        data.bank_holder_name ? data.bank_holder_name.trim() : null,
        now
      ),
    db
      .prepare(
        `UPDATE referral_profiles SET
          wallet_balance = wallet_balance - ?,
          pending_payout = pending_payout + ?,
          default_payout_method = ?,
          default_upi_id = COALESCE(?, default_upi_id),
          default_bank_name = COALESCE(?, default_bank_name),
          default_bank_account = COALESCE(?, default_bank_account),
          default_bank_ifsc = COALESCE(?, default_bank_ifsc),
          default_bank_holder = COALESCE(?, default_bank_holder),
          updated_at = ?
        WHERE id = ?`
      )
      .bind(
        data.amount,
        data.amount,
        data.payout_method,
        data.upi_id?.trim() || null,
        data.bank_name?.trim() || null,
        data.bank_account?.trim() || null,
        data.bank_ifsc?.trim().toUpperCase() || null,
        data.bank_holder_name?.trim() || null,
        now,
        profile.id
      ),
  ]);

  return {
    success: true,
    payout: {
      id,
      referral_code: profile.referral_code,
      user_email: cleanEmail,
      user_name: data.name || profile.user_name,
      amount: data.amount,
      payout_method: data.payout_method,
      upi_id: data.upi_id || null,
      bank_name: data.bank_name || null,
      bank_account: data.bank_account || null,
      bank_ifsc: data.bank_ifsc || null,
      bank_holder_name: data.bank_holder_name || null,
      status: 'pending',
      admin_notes: null,
      utr_number: null,
      created_at: now,
      processed_at: null,
    },
  };
}

export async function listPayoutRequests(
  db: D1Database,
  status?: string
): Promise<PayoutRequestRow[]> {
  try {
    await ensureStoreTables(db);
    if (status && status !== 'all') {
      const res = await db
        .prepare('SELECT * FROM payout_requests WHERE status = ? ORDER BY created_at DESC')
        .bind(status)
        .all<PayoutRequestRow>();
      return res.results || [];
    }
    const res = await db
      .prepare('SELECT * FROM payout_requests ORDER BY created_at DESC')
      .all<PayoutRequestRow>();
    return res.results || [];
  } catch {
    return [];
  }
}

export async function processPayoutRequest(
  db: D1Database,
  payoutId: string,
  newStatus: 'completed' | 'rejected',
  utrOrReason?: string
): Promise<{ success: boolean; error?: string }> {
  await ensureStoreTables(db);
  const payout = await db
    .prepare('SELECT * FROM payout_requests WHERE id = ?')
    .bind(payoutId)
    .first<PayoutRequestRow>();

  if (!payout) {
    return { success: false, error: 'Payout request not found.' };
  }

  if (payout.status !== 'pending') {
    return { success: false, error: `Payout request is already ${payout.status}.` };
  }

  const now = Math.floor(Date.now() / 1000);

  if (newStatus === 'completed') {
    await db.batch([
      db
        .prepare(
          'UPDATE payout_requests SET status = "completed", utr_number = ?, processed_at = ? WHERE id = ?'
        )
        .bind(utrOrReason || 'PROCESSED', now, payoutId),
      db
        .prepare(
          `UPDATE referral_profiles SET
            pending_payout = MAX(0, pending_payout - ?),
            total_paid = total_paid + ?,
            updated_at = ?
          WHERE LOWER(user_email) = ?`
        )
        .bind(payout.amount, payout.amount, now, payout.user_email.toLowerCase()),
    ]);
  } else {
    // Refund amount back to wallet_balance
    await db.batch([
      db
        .prepare(
          'UPDATE payout_requests SET status = "rejected", admin_notes = ?, processed_at = ? WHERE id = ?'
        )
        .bind(utrOrReason || 'Rejected by administrator', now, payoutId),
      db
        .prepare(
          `UPDATE referral_profiles SET
            pending_payout = MAX(0, pending_payout - ?),
            wallet_balance = wallet_balance + ?,
            updated_at = ?
          WHERE LOWER(user_email) = ?`
        )
        .bind(payout.amount, payout.amount, now, payout.user_email.toLowerCase()),
    ]);
  }

  return { success: true };
}

export async function getUserPayouts(
  db: D1Database,
  email: string
): Promise<PayoutRequestRow[]> {
  try {
    await ensureStoreTables(db);
    const cleanEmail = email.trim().toLowerCase();
    const res = await db
      .prepare('SELECT * FROM payout_requests WHERE LOWER(user_email) = ? ORDER BY created_at DESC')
      .bind(cleanEmail)
      .all<PayoutRequestRow>();
    return res.results || [];
  } catch {
    return [];
  }
}

export async function getTopReferrers(
  db: D1Database,
  limit = 20
): Promise<ReferralProfileRow[]> {
  try {
    await ensureStoreTables(db);
    const res = await db
      .prepare('SELECT * FROM referral_profiles ORDER BY total_pro_sales DESC, total_earned DESC LIMIT ?')
      .bind(limit)
      .all<ReferralProfileRow>();
    return res.results || [];
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// Crash Telemetry & Error Reporting
// -------------------------------------------------------------

export async function recordCrashReport(
  db: D1Database,
  data: {
    app_version: string;
    source: string;
    error_type: string;
    frames: string;
    platform: string;
    occurred_at: string;
  }
): Promise<CrashReportRow> {
  await ensureStoreTables(db);
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO crash_reports (
        id, app_version, source, error_type, frames, platform, occurred_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.app_version,
      data.source,
      data.error_type,
      data.frames,
      data.platform,
      data.occurred_at,
      now
    )
    .run();

  // Cap total crash reports to keep D1 storage clean (retain latest 1,000)
  try {
    await db
      .prepare(
        `DELETE FROM crash_reports WHERE id NOT IN (
          SELECT id FROM crash_reports ORDER BY created_at DESC LIMIT 1000
        )`
      )
      .run();
  } catch {
    // Best-effort cleanup
  }

  return {
    id,
    app_version: data.app_version,
    source: data.source,
    error_type: data.error_type,
    frames: data.frames,
    platform: data.platform,
    occurred_at: data.occurred_at,
    created_at: now,
  };
}

export async function getCrashReports(
  db: D1Database,
  limit = 50,
  offset = 0
): Promise<CrashReportRow[]> {
  try {
    await ensureStoreTables(db);
    const res = await db
      .prepare('SELECT * FROM crash_reports ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all<CrashReportRow>();
    return res.results || [];
  } catch {
    return [];
  }
}

export async function getCrashReportCount(db: D1Database): Promise<number> {
  try {
    await ensureStoreTables(db);
    const res = await db
      .prepare('SELECT COUNT(*) as count FROM crash_reports')
      .first<{ count: number }>();
    return res?.count || 0;
  } catch {
    return 0;
  }
}

export async function clearCrashReports(db: D1Database): Promise<void> {
  try {
    await ensureStoreTables(db);
    await db.prepare('DELETE FROM crash_reports').run();
  } catch (err) {
    console.error('Error clearing crash reports:', err);
  }
}

export async function deleteCrashReport(db: D1Database, id: string): Promise<boolean> {
  try {
    await ensureStoreTables(db);
    const res = await db.prepare('DELETE FROM crash_reports WHERE id = ?').bind(id).run();
    return (res.meta?.changes ?? 0) > 0;
  } catch {
    return false;
  }
}



