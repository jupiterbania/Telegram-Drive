export type LicensePlan = 'lifetime' | 'annual' | 'monthly' | 'trial';
export type DevicePlatform = 'windows' | 'android' | 'ios' | 'macos' | 'linux' | 'web' | 'other';

export interface LicenseRow {
  id: string;
  license_key: string;
  telegram_user_id?: string | null;
  phone_number?: string | null;
  customer_name: string | null;
  customer_email: string | null;
  plan_type: LicensePlan;
  max_devices: number;
  is_banned: number;
  ban_reason: string | null;
  notes: string | null;
  created_at: number;
  expires_at: number | null;
}

export interface DeviceActivationRow {
  id: string;
  license_key: string;
  hardware_id: string;
  device_name: string;
  platform: DevicePlatform;
  activated_at: number;
  last_seen_at: number;
  is_revoked: number;
}

export interface LicenseClaims {
  sub: string; // license key or telegram user id
  hwid?: string; // hardware ID (optional for account-bound mode)
  tg_id?: string; // telegram user id
  phone?: string; // phone number
  plan: LicensePlan;
  exp: number | null; // expiry timestamp or null for lifetime
  iat: number;
  iss: string;
  name?: string;
}

export interface Env {
  DB: D1Database;
  APP_NAME?: string;
  STORE_URL?: string;
  MAX_DEFAULT_DEVICES?: string;
  ADMIN_SECRET?: string;
  SIGNING_PRIVATE_KEY?: string; // Hex or base64 Ed25519 JWK / PEM / Raw
  SIGNING_PUBLIC_KEY?: string;
  LEMON_SQUEEZY_WEBHOOK_SECRET?: string;
  LEMON_SQUEEZY_API_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
}

export interface OrderStatusResponse {
  paid: boolean;
  order_id?: string;
  license_key?: string;
  plan_type?: LicensePlan;
  customer_name?: string | null;
  customer_email?: string | null;
  expires_at?: number | null;
  token?: string;
}

export interface RecoveryOtpRow {
  id: string;
  email: string;
  otp_hash: string;
  attempts: number;
  expires_at: number;
  created_at: number;
}

export interface RequestOtpRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface SelfResetDeviceRequest {
  email: string;
  session_token: string;
  hardware_id: string;
}

export interface ActivationRequest {
  license_key: string;
  hardware_id: string;
  device_name?: string;
  platform?: DevicePlatform;
  telegram_user_id?: string;
  phone_number?: string;
}

export interface VerifyRequest {
  license_key: string;
  hardware_id: string;
  token?: string;
}

export interface DeactivateRequest {
  license_key: string;
  hardware_id: string;
}

export interface CreateLicenseRequest {
  customer_name?: string;
  customer_email?: string;
  telegram_user_id?: string;
  phone_number?: string;
  plan_type?: LicensePlan;
  max_devices?: number;
  notes?: string;
  count?: number; // for bulk generation
}

export interface CheckAccountRequest {
  telegram_user_id?: string;
  phone_number?: string;
}

export interface AccountStatusResponse {
  active: boolean;
  license_key?: string | null;
  plan_type?: LicensePlan;
  customer_name?: string | null;
  customer_email?: string | null;
  expires_at?: number | null;
  token?: string;
  terms_version: string;
}

export interface CrashReportRow {
  id: string;
  app_version: string;
  source: string;
  error_type: string;
  frames: string;
  platform: string;
  occurred_at: string;
  created_at: number;
}


