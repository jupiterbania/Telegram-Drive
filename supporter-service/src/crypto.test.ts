import { describe, expect, it } from 'vitest';
import {
  base64UrlDecode,
  base64UrlEncode,
  generateLicenseKey,
  generateOtpCode,
  issueLicenseToken,
  sha256Hex,
  timingSafeEqual,
  verifyLicenseToken,
} from './crypto';

describe('Commercial Crypto Module', () => {
  it('generates valid license keys with TGDRV prefix', () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^TGDRV-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('correctly base64url encodes and decodes', () => {
    const original = new TextEncoder().encode('Hello TG Drive 2026!');
    const encoded = base64UrlEncode(original);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    const decoded = base64UrlDecode(encoded);
    expect(new TextDecoder().decode(decoded)).toBe('Hello TG Drive 2026!');
  });

  it('computes sha256 hex correctly', async () => {
    const hash = await sha256Hex('test-hardware-id-1234');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('performs timing safe comparison', () => {
    expect(timingSafeEqual('admin123', 'admin123')).toBe(true);
    expect(timingSafeEqual('admin123', 'wrong123')).toBe(false);
    expect(timingSafeEqual('admin123', 'admin12')).toBe(false);
  });

  it('issues and verifies cryptographic license tokens', async () => {
    const env = {
      DB: {} as D1Database,
      ADMIN_SECRET: 'test-admin-secret-999',
    };

    const claims = {
      sub: 'TGDRV-ABCD-EFGH-JKLM',
      hwid: 'hw-win-9988-aabb',
      plan: 'lifetime' as const,
      exp: null,
      iat: Math.floor(Date.now() / 1000),
      iss: 'tg-drive-licensing',
      name: 'Jupiter Bania',
    };

    const token = await issueLicenseToken(claims, env);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = await verifyLicenseToken(token, env);
    expect(verified.valid).toBe(true);
    expect(verified.claims?.sub).toBe('TGDRV-ABCD-EFGH-JKLM');
    expect(verified.claims?.hwid).toBe('hw-win-9988-aabb');
  });

  it('generates 6-digit numeric OTP code', () => {
    const otp = generateOtpCode();
    expect(otp).toHaveLength(6);
    expect(otp).toMatch(/^[1-9][0-9]{5}$/);
    expect(parseInt(otp, 10)).toBeGreaterThanOrEqual(100000);
    expect(parseInt(otp, 10)).toBeLessThanOrEqual(999999);
  });
});
