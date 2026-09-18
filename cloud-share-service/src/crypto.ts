/**
 * WebCrypto-based cryptographic helpers for Telegram Drive Cloud Share.
 * Runs natively in Cloudflare Workers with zero external dependencies.
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LEN = 256; // 32 bytes

export function generateToken(length = 24): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(
  password: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  const salt = saltHex || generateSalt();
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBytes = new Uint8Array(
    salt.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LEN
  );

  const hash = Array.from(new Uint8Array(derivedKey))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return { hash, salt };
}

export async function verifyPassword(
  password: string,
  expectedHash: string,
  salt: string
): Promise<boolean> {
  try {
    const { hash } = await hashPassword(password, salt);
    return timingSafeEqual(hash, expectedHash);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function signSession(
  token: string,
  secretKey: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(token)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifySession(
  token: string,
  signature: string,
  secretKey: string
): Promise<boolean> {
  const expected = await signSession(token, secretKey);
  return timingSafeEqual(signature, expected);
}
