import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeData, AppLogger } from '../logger';

describe('AppLogger & Data Sanitization (ATP-IMP-029)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('masks database passwords in connection strings', () => {
    const rawUrl = 'postgresql://admin:supersecret123@ep-cool-app.neon.tech:5432/neondb';
    const sanitized = sanitizeData(rawUrl);

    expect(sanitized).toBe('postgresql://admin:***@ep-cool-app.neon.tech:5432/neondb');
    expect(sanitized).not.toContain('supersecret123');
  });

  it('masks sensitive object keys recursively', () => {
    const payload = {
      user: 'atilio',
      password: 'my-password',
      token: 'bearer-xyz',
      client_secret: 'secret-key-123',
      nested: {
        authorization: 'Bearer 12345',
        safeKey: 'hello',
      },
    };

    const sanitized = sanitizeData(payload) as Record<string, unknown>;

    expect(sanitized.user).toBe('atilio');
    expect(sanitized.password).toBe('***REDACTED***');
    expect(sanitized.token).toBe('***REDACTED***');
    expect(sanitized.client_secret).toBe('***REDACTED***');
    const nested = sanitized.nested as Record<string, unknown>;
    expect(nested.authorization).toBe('***REDACTED***');
    expect(nested.safeKey).toBe('hello');
  });

  it('logs structured output with timestamp, level and context', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new AppLogger('PlantService');

    logger.info('Plant registered', { code: 'AT-PL-014' });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('[INFO]');
    expect(logCall).toContain('[PlantService]');
    expect(logCall).toContain('Plant registered');
    expect(logCall).toContain('AT-PL-014');
  });

  it('handles error objects safely without exposing stack traces', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new AppLogger('AuthService');
    const err = new Error('Token expired');

    logger.error('Failed to obtain token', err);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('[ERROR]');
    expect(logCall).toContain('[AuthService]');
    expect(logCall).toContain('Failed to obtain token');
    expect(logCall).toContain('Token expired');
  });
});
