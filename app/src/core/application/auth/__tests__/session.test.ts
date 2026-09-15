import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  verifyPasscode,
} from '../session';

describe('Session Authentication Engine (ATP-SEC-001)', () => {
  const testSecret = 'super_secret_auth_key_for_testing_1234567890';
  const testPasscode = 'atilio2026';
  const originalPasscode = process.env.APP_AUTH_PASSCODE;
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.APP_AUTH_PASSCODE = testPasscode;
    process.env.AUTH_SECRET = testSecret;
  });

  afterEach(() => {
    process.env.APP_AUTH_PASSCODE = originalPasscode;
    process.env.AUTH_SECRET = originalSecret;
    vi.restoreAllMocks();
  });

  describe('createSessionToken and verifySessionToken', () => {
    it('creates a valid token that verifies successfully with the same secret', async () => {
      const token = await createSessionToken(testSecret);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.includes('.')).toBe(true);

      const isValid = await verifySessionToken(token, testSecret);
      expect(isValid).toBe(true);
    });

    it('rejects token when verified with a different secret', async () => {
      const token = await createSessionToken(testSecret);
      const isValid = await verifySessionToken(token, 'different_wrong_secret_123456');
      expect(isValid).toBe(false);
    });

    it('rejects tampered token payload', async () => {
      const token = await createSessionToken(testSecret);
      const [, signature] = token.split('.');
      
      const tamperedPayload = Buffer.from(JSON.stringify({ authenticated: true, exp: 9999999999 })).toString('base64url');
      const tamperedToken = `${tamperedPayload}.${signature}`;

      expect(await verifySessionToken(tamperedToken, testSecret)).toBe(false);
    });

    it('rejects tampered token signature', async () => {
      const token = await createSessionToken(testSecret);
      const [payloadB64] = token.split('.');
      const tamperedToken = `${payloadB64}.invalidsignature12345`;

      expect(await verifySessionToken(tamperedToken, testSecret)).toBe(false);
    });

    it('rejects expired tokens', async () => {
      // Create token with negative maxAge (expired in the past)
      const expiredToken = await createSessionToken(testSecret, -10);
      expect(await verifySessionToken(expiredToken, testSecret)).toBe(false);
    });

    it('returns false for null, empty or invalid format tokens', async () => {
      expect(await verifySessionToken(null, testSecret)).toBe(false);
      expect(await verifySessionToken('', testSecret)).toBe(false);
      expect(await verifySessionToken('invalidformatwithnodots', testSecret)).toBe(false);
      expect(await verifySessionToken('one.two.three', testSecret)).toBe(false);
    });
  });

  describe('verifyPasscode', () => {
    it('returns true when passcode matches exactly', async () => {
      expect(await verifyPasscode(testPasscode)).toBe(true);
      expect(await verifyPasscode(`  ${testPasscode}  `)).toBe(true); // Trims whitespace
    });

    it('returns false when passcode does not match', async () => {
      expect(await verifyPasscode('wrongpassword')).toBe(false);
      expect(await verifyPasscode('atilio2025')).toBe(false);
    });

    it('fails closed when APP_AUTH_PASSCODE is undefined or empty', async () => {
      delete process.env.APP_AUTH_PASSCODE;
      expect(await verifyPasscode(testPasscode)).toBe(false);

      process.env.APP_AUTH_PASSCODE = '   ';
      expect(await verifyPasscode(testPasscode)).toBe(false);
    });
  });
});
