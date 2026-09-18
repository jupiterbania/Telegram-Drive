import { describe, it, expect } from 'vitest';
import {
  generateToken,
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
} from '../src/crypto';

describe('Cloud Share Crypto', () => {
  it('generates random tokens of specified length', () => {
    const token = generateToken(24);
    expect(token).toHaveLength(24);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);

    const token2 = generateToken(24);
    expect(token).not.toBe(token2);
  });

  it('correctly hashes and verifies passwords', async () => {
    const password = 'mySecretPassword123!';
    const { hash, salt } = await hashPassword(password);

    expect(hash).toBeTruthy();
    expect(salt).toBeTruthy();

    const valid = await verifyPassword(password, hash, salt);
    expect(valid).toBe(true);

    const invalid = await verifyPassword('wrongPassword', hash, salt);
    expect(invalid).toBe(false);
  });

  it('signs and verifies session signatures', async () => {
    const token = generateToken(24);
    const secret = 'super-secret-key-12345';

    const sig = await signSession(token, secret);
    expect(sig).toBeTruthy();

    const valid = await verifySession(token, sig, secret);
    expect(valid).toBe(true);

    const tampered = await verifySession('different-token', sig, secret);
    expect(tampered).toBe(false);
  });
});
