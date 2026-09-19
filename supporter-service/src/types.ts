export type LicensePlan = 'lifetime' | 'annual' | 'monthly' | 'trial';
export type DevicePlatform = 'windows' | 'android' | 'ios' | 'macos' | 'linux' | 'web' | 'other';

export interface LicenseRow {
  id: string;
  license_key: string;
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
  sub: string; // license key
  hwid: string; // hardware ID
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
  plan_type?: LicensePlan;
  max_devices?: number;
  notes?: string;
  count?: number; // for bulk generation
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


