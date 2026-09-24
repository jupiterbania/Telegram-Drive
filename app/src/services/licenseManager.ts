import { invoke } from '@tauri-apps/api/core';

export type LicensePlan = 'lifetime' | 'annual' | 'monthly' | 'trial';

export interface LicenseInfo {
  isLicensed: boolean;
  licenseKey: string | null;
  planType: LicensePlan | null;
  customerName: string | null;
  expiresAt: number | null;
  token: string | null;
  hardwareId: string;
  maxDevices?: number;
  lastVerifiedAt?: number;
}

const STORAGE_KEY_LICENSE = 'tg_drive_license_data';
const STORAGE_KEY_HWID = 'tg_drive_hwid';

// Default worker endpoint (or custom domain if configured)
const DEFAULT_LICENSE_API = 'https://tg-drive-license-service.jupiterbania472.workers.dev';

export class LicenseManager {
  private static instance: LicenseManager;
  private currentLicense: LicenseInfo | null = null;
  private apiEndpoint: string = DEFAULT_LICENSE_API;

  private constructor() {
    this.apiEndpoint = (import.meta.env.VITE_LICENSE_API_URL as string) || DEFAULT_LICENSE_API;
  }

  public static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  public getCurrentLicense(): LicenseInfo | null {
    return this.currentLicense;
  }

  // Returns unique hardware ID for this PC/Phone
  public async getHardwareId(): Promise<string> {
    try {
      // Try to get hardware ID from Rust backend
      const rustHwid = await invoke<string>('cmd_get_hardware_id');
      if (rustHwid && rustHwid.length > 5) {
        return rustHwid;
      }
    } catch {
      // Fallback for web / dev / standard environment
    }

    let localHwid = localStorage.getItem(STORAGE_KEY_HWID);
    if (!localHwid) {
      // Generate cryptographic random UUID for device
      localHwid = 'hw-' + crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY_HWID, localHwid);
    }
    return localHwid;
  }

  // Loads cached license information from local storage
  public async loadLicense(): Promise<LicenseInfo> {
    const hwid = await this.getHardwareId();
    const stored = localStorage.getItem(STORAGE_KEY_LICENSE);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LicenseInfo;
        // Verify hardware ID matches this device
        if (parsed.hardwareId === hwid && parsed.isLicensed && parsed.token) {
          // Check expiration if time-limited
          if (parsed.expiresAt && parsed.expiresAt < Math.floor(Date.now() / 1000)) {
            parsed.isLicensed = false;
            localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(parsed));
          }
          this.currentLicense = parsed;
          return parsed;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_LICENSE);
      }
    }

    const defaultInfo: LicenseInfo = {
      isLicensed: false,
      licenseKey: null,
      planType: null,
      customerName: null,
      expiresAt: null,
      token: null,
      hardwareId: hwid,
    };
    this.currentLicense = defaultInfo;
    return defaultInfo;
  }

  // Activates the software using a License Key
  public async activateLicense(
    licenseKey: string,
    deviceName?: string,
    platform?: string,
    telegramUserId?: string | number | null,
    phone?: string | null
  ): Promise<{ success: boolean; message?: string; license?: LicenseInfo }> {
    const hwid = await this.getHardwareId();
    const cleanKey = licenseKey.trim().toUpperCase();

    try {
      const response = await fetch(`${this.apiEndpoint}/api/license/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: cleanKey,
          hardware_id: hwid,
          device_name: deviceName || 'TG Drive Client',
          platform: platform || 'windows',
          telegram_user_id: telegramUserId ? String(telegramUserId).trim() : undefined,
          phone_number: phone ? String(phone).trim() : undefined,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        token?: string;
        plan_type?: LicensePlan;
        expires_at?: number | null;
        customer_name?: string | null;
        max_devices?: number;
      };

      if (!response.ok || !data.success) {
        return {
          success: false,
          message: data.error || 'Failed to activate license. Please verify your key.',
        };
      }

      const licenseInfo: LicenseInfo = {
        isLicensed: true,
        licenseKey: cleanKey,
        planType: data.plan_type || 'lifetime',
        customerName: data.customer_name || null,
        expiresAt: data.expires_at || null,
        token: data.token || null,
        hardwareId: hwid,
        maxDevices: data.max_devices || 2,
        lastVerifiedAt: Math.floor(Date.now() / 1000),
      };

      localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(licenseInfo));
      this.currentLicense = licenseInfo;

      return {
        success: true,
        license: licenseInfo,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Network error connecting to license server.',
      };
    }
  }

  // Claims a free trial for this device
  public async claimFreeTrial(
    name: string,
    email: string
  ): Promise<{ success: boolean; message?: string; license?: LicenseInfo }> {
    const hwid = await this.getHardwareId();
    try {
      const response = await fetch(`${this.apiEndpoint}/api/store/claim-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          hardware_id: hwid,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        license_key?: string;
        customer_name?: string;
        expires_at?: number;
        token?: string;
        message?: string;
      };

      if (!response.ok || !data.success || !data.license_key) {
        return {
          success: false,
          message: data.error || 'Unable to claim free trial. Please check details.',
        };
      }

      const licenseInfo: LicenseInfo = {
        isLicensed: true,
        licenseKey: data.license_key,
        planType: 'trial',
        customerName: data.customer_name || name.trim(),
        expiresAt: data.expires_at || null,
        token: data.token || null,
        hardwareId: hwid,
        maxDevices: 2,
        lastVerifiedAt: Math.floor(Date.now() / 1000),
      };

      localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(licenseInfo));
      this.currentLicense = licenseInfo;

      return {
        success: true,
        message: data.message,
        license: licenseInfo,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Error connecting to trial server.',
      };
    }
  }

  // Verifies entitlement by Telegram User ID / Phone Number (Zero-Key seamless flow)
  public async checkTelegramAccount(
    telegramUserId?: string | number | null,
    phone?: string | null
  ): Promise<{ success: boolean; isLicensed: boolean; message?: string; license?: LicenseInfo }> {
    const hwid = await this.getHardwareId();
    const tgId = telegramUserId ? String(telegramUserId).trim() : '';
    const tgPhone = phone ? String(phone).trim() : '';

    if (!tgId && !tgPhone) {
      return { success: false, isLicensed: false, message: 'No Telegram account info provided' };
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/api/license/check-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_user_id: tgId,
          phone_number: tgPhone,
        }),
      });

      const data = (await response.json()) as {
        active?: boolean;
        license_key?: string;
        plan_type?: LicensePlan;
        customer_name?: string;
        customer_email?: string;
        expires_at?: number | null;
        token?: string;
        message?: string;
      };

      if (response.ok && data.active) {
        const licenseInfo: LicenseInfo = {
          isLicensed: true,
          licenseKey: data.license_key || `TG-PRO-${tgId}`,
          planType: data.plan_type || 'lifetime',
          customerName: data.customer_name || null,
          expiresAt: data.expires_at || null,
          token: data.token || null,
          hardwareId: hwid,
          maxDevices: 999, // Unlocked across all user devices
          lastVerifiedAt: Math.floor(Date.now() / 1000),
        };

        localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(licenseInfo));
        this.currentLicense = licenseInfo;

        return {
          success: true,
          isLicensed: true,
          license: licenseInfo,
        };
      }

      return {
        success: true,
        isLicensed: false,
        message: data.message || 'No active pro entitlement found for this Telegram account.',
      };
    } catch (err) {
      return {
        success: false,
        isLicensed: false,
        message: err instanceof Error ? err.message : 'Error connecting to license server.',
      };
    }
  }

  // Polls order status for real-time automatic license unlocking after checkout
  public async pollOrderStatus(
    orderIdOrSession: string,
    email?: string,
    telegramUserId?: string | number | null,
    phone?: string | null
  ): Promise<{ paid: boolean; license?: LicenseInfo }> {
    const hwid = await this.getHardwareId();
    try {
      const response = await fetch(`${this.apiEndpoint}/api/store/order-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderIdOrSession,
          session_id: orderIdOrSession,
          email: email ? email.trim().toLowerCase() : undefined,
          telegram_user_id: telegramUserId ? String(telegramUserId).trim() : undefined,
          phone_number: phone ? String(phone).trim() : undefined,
        }),
      });

      if (!response.ok) return { paid: false };
      const data = (await response.json()) as {
        paid?: boolean;
        license_key?: string;
        plan_type?: LicensePlan;
        customer_name?: string | null;
        customer_email?: string | null;
        expires_at?: number | null;
        token?: string;
      };

      if (data.paid && data.license_key) {
        const licenseInfo: LicenseInfo = {
          isLicensed: true,
          licenseKey: data.license_key,
          planType: data.plan_type || 'lifetime',
          customerName: data.customer_name || null,
          expiresAt: data.expires_at || null,
          token: data.token || null,
          hardwareId: hwid,
          maxDevices: 2,
          lastVerifiedAt: Math.floor(Date.now() / 1000),
        };

        localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(licenseInfo));
        this.currentLicense = licenseInfo;

        return {
          paid: true,
          license: licenseInfo,
        };
      }

      return { paid: false };
    } catch {
      return { paid: false };
    }
  }

  // Validates current license with server in background
  public async verifyLicense(): Promise<boolean> {
    const current = await this.loadLicense();
    if (!current.isLicensed || !current.licenseKey) return false;

    try {
      const response = await fetch(`${this.apiEndpoint}/api/license/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: current.licenseKey,
          hardware_id: current.hardwareId,
          token: current.token,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { valid: boolean; reason?: string };
        if (!data.valid) {
          // License was banned or revoked
          current.isLicensed = false;
          localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(current));
          return false;
        }
        current.lastVerifiedAt = Math.floor(Date.now() / 1000);
        localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(current));
        return true;
      }
      // If server unreachable, allow graceful offline access
      return current.isLicensed;
    } catch {
      // Offline mode: Keep app unlocked if token was valid
      return current.isLicensed;
    }
  }

  // Deactivates this device so key can be moved to another machine
  public async deactivateLicense(): Promise<boolean> {
    const current = await this.loadLicense();
    if (!current.licenseKey) return true;

    try {
      await fetch(`${this.apiEndpoint}/api/license/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: current.licenseKey,
          hardware_id: current.hardwareId,
        }),
      });
    } catch {
      // Ignore network errors on deactivation
    }

    localStorage.removeItem(STORAGE_KEY_LICENSE);
    this.currentLicense = null;
    return true;
  }

  // Calculates human-readable time remaining and formatted expiration date
  public getExpiryDetails(expiresAt: number | null): {
    isLifetime: boolean;
    isExpired: boolean;
    formattedDate: string;
    remainingDays: number;
    remainingHours: number;
    remainingMinutes: number;
    countdownText: string;
  } {
    if (!expiresAt) {
      return {
        isLifetime: true,
        isExpired: false,
        formattedDate: 'Never (Lifetime Access)',
        remainingDays: 99999,
        remainingHours: 99999,
        remainingMinutes: 99999,
        countdownText: 'Lifetime Access',
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const diff = expiresAt - now;

    const date = new Date(expiresAt * 1000);
    const formattedDate = date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (diff <= 0) {
      return {
        isLifetime: false,
        isExpired: true,
        formattedDate,
        remainingDays: 0,
        remainingHours: 0,
        remainingMinutes: 0,
        countdownText: 'Expired',
      };
    }

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    let countdownText = '';
    if (days > 0) {
      countdownText = `${days}d ${hours}h left`;
    } else if (hours > 0) {
      countdownText = `${hours}h ${minutes}m left`;
    } else {
      countdownText = `${Math.max(1, minutes)}m left`;
    }

    return {
      isLifetime: false,
      isExpired: false,
      formattedDate,
      remainingDays: days,
      remainingHours: hours,
      remainingMinutes: minutes,
      countdownText,
    };
  }
}

export const licenseManager = LicenseManager.getInstance();
