import type { Env, LicenseClaims } from './types';

// Encodes uint8 array to base64url string
export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Decodes base64url string to Uint8Array
export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generates a clean, readable license key: TGDRV-XXXX-XXXX-XXXX
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit easily confused chars: 0, 1, I, O
  const randomBytes = crypto.getRandomValues(new Uint8Array(12));
  let result = 'TGDRV-';
  
  for (let i = 0; i < 12; i++) {
    const byte = randomBytes[i] ?? 0;
    result += chars[byte % chars.length];
    if (i === 3 || i === 7) {
      result += '-';
    }
  }
  return result;
}

// Generates a cryptographically secure 6-digit numeric OTP code
export function generateOtpCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = ((array[0] ?? 0) % 900000) + 100000;
  return code.toString();
}


// SHA-256 helper
export async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(data));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generates a signed cryptographic license token (JWT format: header.payload.signature)
export async function issueLicenseToken(claims: LicenseClaims, env: Env): Promise<string> {
  const header = {
    alg: 'EdDSA',
    typ: 'JWT',
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const dataToSign = `${headerB64}.${payloadB64}`;

  let signature: Uint8Array;

  if (env.SIGNING_PRIVATE_KEY) {
    try {
      // Import Ed25519 JWK / PKCS8
      if (env.SIGNING_PRIVATE_KEY.startsWith('{')) {
        const keyData = JSON.parse(env.SIGNING_PRIVATE_KEY) as JsonWebKey;
        const key = await crypto.subtle.importKey(
          'jwk',
          keyData,
          { name: 'Ed25519' },
          false,
          ['sign']
        );
        const sigBuf = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(dataToSign));
        signature = new Uint8Array(sigBuf);
      } else {
        // Fallback to HMAC with raw secret if provided as string
        const enc = new TextEncoder();
        const hmacKey = await crypto.subtle.importKey(
          'raw',
          enc.encode(env.SIGNING_PRIVATE_KEY),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(dataToSign));
        signature = new Uint8Array(sigBuf);
      }
    } catch {
      signature = await defaultSign(dataToSign, env.ADMIN_SECRET || 'tg-drive-master-secret-2026');
    }
  } else {
    // Default HMAC signing using ADMIN_SECRET or fallback in dev
    signature = await defaultSign(dataToSign, env.ADMIN_SECRET || 'tg-drive-master-secret-2026');
  }

  const signatureB64 = base64UrlEncode(signature);
  return `${dataToSign}.${signatureB64}`;
}

async function defaultSign(data: string, secret: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return new Uint8Array(sig);
}

// Verifies a cryptographic license token
export async function verifyLicenseToken(token: string, env: Env): Promise<{ valid: boolean; claims?: LicenseClaims }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const headerB64 = parts[0] ?? '';
    const payloadB64 = parts[1] ?? '';
    const signatureB64 = parts[2] ?? '';
    const dataToSign = `${headerB64}.${payloadB64}`;
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const claims = JSON.parse(payloadJson) as LicenseClaims;

    // Check expiration if set
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }

    const expectedSig = await defaultSign(dataToSign, env.ADMIN_SECRET || 'tg-drive-master-secret-2026');
    const providedSig = base64UrlDecode(signatureB64);

    if (expectedSig.length !== providedSig.length) {
      // Try Ed25519 if public key is configured
      if (env.SIGNING_PUBLIC_KEY && env.SIGNING_PUBLIC_KEY.startsWith('{')) {
        const pubKeyData = JSON.parse(env.SIGNING_PUBLIC_KEY) as JsonWebKey;
        const pubKey = await crypto.subtle.importKey(
          'jwk',
          pubKeyData,
          { name: 'Ed25519' },
          false,
          ['verify']
        );
        const ok = await crypto.subtle.verify('Ed25519', pubKey, providedSig, new TextEncoder().encode(dataToSign));
        return { valid: ok, claims: ok ? claims : undefined };
      }
      return { valid: false };
    }

    // Constant-time equality check
    let diff = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      const expByte = expectedSig[i] ?? 0;
      const provByte = providedSig[i] ?? 0;
      diff |= expByte ^ provByte;
    }

    return { valid: diff === 0, claims: diff === 0 ? claims : undefined };
  } catch {
    return { valid: false };
  }
}

// Constant time string comparison for Admin Password
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
