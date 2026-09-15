import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  verifyPasscode,
  getAuthSecret,
  isValidAuthSecret,
  MIN_AUTH_SECRET_LENGTH,
} from '../session';

describe('Session Authentication Engine (ATP-SEC-001)', () => {
  const testSecret = 'super_secret_auth_key_for_testing_1234567890';
  const testPasscode = 'atilio2026';
  const originalPasscode = process.env.APP_AUTH_PASSCODE;
  const originalSecret = process.env.AUTH_SECRET;
  const originalHaSecret = process.env.HOME_ASSISTANT_READ_API_SECRET;

  beforeEach(() => {
    process.env.APP_AUTH_PASSCODE = testPasscode;
    process.env.AUTH_SECRET = testSecret;
    delete process.env.HOME_ASSISTANT_READ_API_SECRET;
  });

  afterEach(() => {
    process.env.APP_AUTH_PASSCODE = originalPasscode;
    process.env.AUTH_SECRET = originalSecret;
    if (originalHaSecret !== undefined) {
      process.env.HOME_ASSISTANT_READ_API_SECRET = originalHaSecret;
    } else {
      delete process.env.HOME_ASSISTANT_READ_API_SECRET;
    }
    vi.restoreAllMocks();
  });

  describe('isValidAuthSecret', () => {
    it('returns true for secrets with sufficient length and entropy', () => {
      expect(isValidAuthSecret('a'.repeat(MIN_AUTH_SECRET_LENGTH))).toBe(true);
      expect(isValidAuthSecret(testSecret)).toBe(true);
    });

    it('returns false for null, undefined, or non-string values', () => {
      expect(isValidAuthSecret(null)).toBe(false);
      expect(isValidAuthSecret(undefined)).toBe(false);
      expect(isValidAuthSecret('')).toBe(false);
      expect(isValidAuthSecret('   ')).toBe(false);
    });

    it('returns false for secrets shorter than MIN_AUTH_SECRET_LENGTH (32 chars)', () => {
      expect(isValidAuthSecret('short_secret')).toBe(false);
      expect(isValidAuthSecret('a'.repeat(MIN_AUTH_SECRET_LENGTH - 1))).toBe(false);
    });

    it('returns false for known insecure placeholders', () => {
      expect(isValidAuthSecret('placeholder')).toBe(false);
      expect(isValidAuthSecret('changeme')).toBe(false);
      expect(isValidAuthSecret('your_auth_secret')).toBe(false);
      expect(isValidAuthSecret('your_auth_secret_here')).toBe(false);
      expect(isValidAuthSecret('atp_dev_auth_secret_fallback_do_not_use_in_prod')).toBe(false);
    });
  });

  describe('getAuthSecret (Fail-Closed)', () => {
    it('returns the secret when AUTH_SECRET is valid', () => {
      process.env.AUTH_SECRET = testSecret;
      expect(getAuthSecret()).toBe(testSecret);
    });

    it('throws error when AUTH_SECRET is absent (fail-closed)', () => {
      delete process.env.AUTH_SECRET;
      expect(() => getAuthSecret()).toThrow(/AUTH_SECRET is not configured/);
    });

    it('throws error when AUTH_SECRET is empty (fail-closed)', () => {
      process.env.AUTH_SECRET = '   ';
      expect(() => getAuthSecret()).toThrow(/AUTH_SECRET is not configured/);
    });

    it('throws error when AUTH_SECRET is too short (< 32 chars)', () => {
      process.env.AUTH_SECRET = 'too_short_secret_123';
      expect(() => getAuthSecret()).toThrow(/AUTH_SECRET is not configured/);
    });

    it('throws error when AUTH_SECRET is a known placeholder', () => {
      process.env.AUTH_SECRET = 'your_auth_secret_here';
      expect(() => getAuthSecret()).toThrow(/AUTH_SECRET is not configured/);
    });

    it('does NOT fallback to HOME_ASSISTANT_READ_API_SECRET when AUTH_SECRET is missing', () => {
      delete process.env.AUTH_SECRET;
      process.env.HOME_ASSISTANT_READ_API_SECRET = 'valid_ha_read_secret_with_more_than_32_characters_12345';
      expect(() => getAuthSecret()).toThrow(/AUTH_SECRET is not configured/);
    });
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

    it('uses process.env.AUTH_SECRET automatically when no secret parameter is passed', async () => {
      const token = await createSessionToken();
      expect(await verifySessionToken(token)).toBe(true);
    });

    it('fails closed when creating token without AUTH_SECRET configured', async () => {
      delete process.env.AUTH_SECRET;
      await expect(createSessionToken()).rejects.toThrow(/AUTH_SECRET is not configured|invalid or missing/);
    });

    it('fails closed when verifying token with missing AUTH_SECRET', async () => {
      const token = await createSessionToken(testSecret);
      delete process.env.AUTH_SECRET;
      const isValid = await verifySessionToken(token);
      expect(isValid).toBe(false);
    });

    it('fails closed when HOME_ASSISTANT_READ_API_SECRET is present but AUTH_SECRET is absent', async () => {
      process.env.HOME_ASSISTANT_READ_API_SECRET = 'a'.repeat(40);
      delete process.env.AUTH_SECRET;

      await expect(createSessionToken()).rejects.toThrow(/AUTH_SECRET is not configured/);
      expect(await verifySessionToken('dummy.token')).toBe(false);
    });

    it('rejects token when verified with a different secret', async () => {
      const token = await createSessionToken(testSecret);
      const isValid = await verifySessionToken(token, 'different_wrong_secret_1234567890_32chars');
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
      expect(await verifyPasscode(`  ${testPasscode}  `)).toBe(true);
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

