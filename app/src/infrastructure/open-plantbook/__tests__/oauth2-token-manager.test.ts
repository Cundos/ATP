/**
 * Tests for OAuth2TokenManager — Open Plantbook token manager.
 *
 * Covers cases A through M as defined in ATP-IMP-021:
 *
 *   A. Obtains token correctly.
 *   B. Reuses cached valid token (only 1 fetch).
 *   C. Renews expired token.
 *   D. Renews anticipatorily within the safety window.
 *   E. Multiple concurrent callers → only 1 HTTP refresh.
 *   F. Missing credentials → controlled error.
 *   G. HTTP 401 from provider → controlled error.
 *   H. HTTP 500 from provider → controlled error.
 *   I. Invalid JSON → controlled error.
 *   J. access_token absent → controlled error.
 *   K. expires_in invalid → controlled error.
 *   L. Timeout / AbortError → controlled error.
 *   M. No error message exposes client_secret or access_token.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import {
  OAuth2TokenManager,
  __resetForTest,
} from '../OAuth2TokenManager';
import { OpenPlantbookAuthenticationError } from '../../../core/domain/errors/OpenPlantbookAuthenticationError';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid token response body. */
function makeTokenBody(
  access_token = 'test-access-token-abc',
  token_type = 'Bearer',
  expires_in = 3600
): string {
  return JSON.stringify({ access_token, token_type, expires_in });
}

/** Create a Response that looks like a valid OAuth token response. */
function makeOkResponse(body = makeTokenBody()): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Create a Response with a given status and empty body. */
function makeErrorResponse(status: number, body = '{}'): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const VALID_ENV = {
  OPEN_PLANTBOOK_CLIENT_ID: 'test-client-id',
  OPEN_PLANTBOOK_CLIENT_SECRET: 'test-client-secret',
};

let fetchSpy: MockInstance;

beforeEach(() => {
  __resetForTest();
  // Inject environment credentials
  process.env.OPEN_PLANTBOOK_CLIENT_ID = VALID_ENV.OPEN_PLANTBOOK_CLIENT_ID;
  process.env.OPEN_PLANTBOOK_CLIENT_SECRET = VALID_ENV.OPEN_PLANTBOOK_CLIENT_SECRET;
  // Default fetch spy: returns a valid token
  fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(makeOkResponse());
});

afterEach(() => {
  __resetForTest();
  delete process.env.OPEN_PLANTBOOK_CLIENT_ID;
  delete process.env.OPEN_PLANTBOOK_CLIENT_SECRET;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// A. Obtains token correctly
// ---------------------------------------------------------------------------

describe('A. Obtains token correctly', () => {
  it('returns access_token string on successful request', async () => {
    const manager = new OAuth2TokenManager();
    const token = await manager.getAccessToken();
    expect(token).toBe('test-access-token-abc');
  });

  it('calls the correct endpoint with correct method and content-type', async () => {
    const manager = new OAuth2TokenManager();
    await manager.getAccessToken();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://open.plantbook.io/api/v1/token/');
    expect(options.method).toBe('POST');
    expect((options.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded'
    );
  });

  it('sends grant_type, client_id and client_secret in the body', async () => {
    const manager = new OAuth2TokenManager();
    await manager.getAccessToken();

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(options.body as string);
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe(VALID_ENV.OPEN_PLANTBOOK_CLIENT_ID);
    expect(body.get('client_secret')).toBe(VALID_ENV.OPEN_PLANTBOOK_CLIENT_SECRET);
  });
});

// ---------------------------------------------------------------------------
// B. Reuses cached valid token (only 1 fetch)
// ---------------------------------------------------------------------------

describe('B. Reuses cached valid token', () => {
  it('returns cached token on second call without fetching again', async () => {
    const manager = new OAuth2TokenManager();

    const t1 = await manager.getAccessToken();
    const t2 = await manager.getAccessToken();

    expect(t1).toBe('test-access-token-abc');
    expect(t2).toBe('test-access-token-abc');
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// C. Renews expired token
// ---------------------------------------------------------------------------

describe('C. Renews expired token', () => {
  it('fetches a new token when the cached one has expired', async () => {
    // Start at t=0
    let now = 0;
    const clock = () => now;
    const manager = new OAuth2TokenManager(clock);

    // First token: expires_in = 60 (60 s TTL)
    fetchSpy.mockResolvedValueOnce(
      new Response(makeTokenBody('first-token', 'Bearer', 60), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const t1 = await manager.getAccessToken();
    expect(t1).toBe('first-token');
    expect(fetchSpy).toHaveBeenCalledOnce();

    // Advance time past expiry (60_000 ms + 1 ms)
    now = 60_001;

    fetchSpy.mockResolvedValueOnce(
      new Response(makeTokenBody('second-token', 'Bearer', 60), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const t2 = await manager.getAccessToken();
    expect(t2).toBe('second-token');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// D. Renews anticipatorily within the safety window
// ---------------------------------------------------------------------------

describe('D. Renews within safety window', () => {
  it('fetches a new token when inside the safety window', async () => {
    let now = 0;
    const clock = () => now;
    const manager = new OAuth2TokenManager(clock);

    // expires_in = 300 s → TTL = 300_000 ms
    // Safety window = min(60_000, 20% of 300_000) = min(60_000, 60_000) = 60_000 ms
    // safeExpiresAt = 300_000 - 60_000 = 240_000 ms

    fetchSpy.mockResolvedValueOnce(
      new Response(makeTokenBody('token-v1', 'Bearer', 300), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const t1 = await manager.getAccessToken();
    expect(t1).toBe('token-v1');

    // Advance to just inside safety window: 241_000 ms (past safeExpiresAt=240_000)
    now = 241_000;

    fetchSpy.mockResolvedValueOnce(
      new Response(makeTokenBody('token-v2', 'Bearer', 300), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const t2 = await manager.getAccessToken();
    expect(t2).toBe('token-v2');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does NOT renew when still outside the safety window', async () => {
    let now = 0;
    const clock = () => now;
    const manager = new OAuth2TokenManager(clock);

    // expires_in = 300 s → safeExpiresAt = 240_000 ms
    await manager.getAccessToken(); // fetches once

    // Advance to just before safety window: 239_999 ms
    now = 239_999;

    const t2 = await manager.getAccessToken();
    expect(t2).toBe('test-access-token-abc');
    expect(fetchSpy).toHaveBeenCalledOnce(); // still only 1 fetch
  });
});

// ---------------------------------------------------------------------------
// E. Multiple concurrent callers → only 1 HTTP refresh
// ---------------------------------------------------------------------------

describe('E. Concurrent callers share one refresh', () => {
  it('sends only 1 HTTP request when 10 callers detect an expired token simultaneously', async () => {
    // Let the first call succeed; then expire the token
    let now = 0;
    const clock = () => now;
    const manager = new OAuth2TokenManager(clock);

    // Fetch initial token
    await manager.getAccessToken();
    expect(fetchSpy).toHaveBeenCalledOnce();

    // Expire token
    now = 7_200_001; // well past the 3600s expiry

    // Prepare second response
    fetchSpy.mockResolvedValueOnce(
      new Response(makeTokenBody('refreshed-token', 'Bearer', 3600), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // Fire 10 concurrent calls
    const results = await Promise.all(
      Array.from({ length: 10 }, () => manager.getAccessToken())
    );

    // Exactly 2 total fetches: the first call + one shared refresh
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // All 10 callers receive the refreshed token
    for (const token of results) {
      expect(token).toBe('refreshed-token');
    }
  });
});

// ---------------------------------------------------------------------------
// F. Missing credentials → controlled error
// ---------------------------------------------------------------------------

describe('F. Missing credentials', () => {
  it('throws OpenPlantbookAuthenticationError when CLIENT_ID is missing', async () => {
    delete process.env.OPEN_PLANTBOOK_CLIENT_ID;
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
    await expect(manager.getAccessToken()).rejects.toThrow(
      /credentials are not configured/i
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws OpenPlantbookAuthenticationError when CLIENT_SECRET is missing', async () => {
    delete process.env.OPEN_PLANTBOOK_CLIENT_SECRET;
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws OpenPlantbookAuthenticationError when both credentials are missing', async () => {
    delete process.env.OPEN_PLANTBOOK_CLIENT_ID;
    delete process.env.OPEN_PLANTBOOK_CLIENT_SECRET;
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// G. HTTP 401 from provider → controlled error
// ---------------------------------------------------------------------------

describe('G. HTTP 401 from provider', () => {
  it('throws OpenPlantbookAuthenticationError with statusCode 401', async () => {
    fetchSpy.mockResolvedValueOnce(makeErrorResponse(401));
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );

    try {
      await manager.getAccessToken();
    } catch (err) {
      expect(err).toBeInstanceOf(OpenPlantbookAuthenticationError);
      expect((err as OpenPlantbookAuthenticationError).statusCode).toBe(401);
    }
  });

  it('throws for HTTP 400 (bad request)', async () => {
    fetchSpy.mockResolvedValueOnce(makeErrorResponse(400));
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
  });

  it('throws for HTTP 403 (forbidden)', async () => {
    fetchSpy.mockResolvedValueOnce(makeErrorResponse(403));
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
  });
});

// ---------------------------------------------------------------------------
// H. HTTP 500 from provider → controlled error
// ---------------------------------------------------------------------------

describe('H. HTTP 500 from provider', () => {
  it('throws OpenPlantbookAuthenticationError with statusCode 500', async () => {
    fetchSpy.mockResolvedValueOnce(makeErrorResponse(500));
    const manager = new OAuth2TokenManager();

    try {
      await manager.getAccessToken();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OpenPlantbookAuthenticationError);
      expect((err as OpenPlantbookAuthenticationError).statusCode).toBe(500);
    }
  });

  it('throws for HTTP 503 (service unavailable)', async () => {
    fetchSpy.mockResolvedValueOnce(makeErrorResponse(503));
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
  });
});

// ---------------------------------------------------------------------------
// I. Invalid JSON → controlled error
// ---------------------------------------------------------------------------

describe('I. Invalid JSON response', () => {
  it('throws OpenPlantbookAuthenticationError when response body is not JSON', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('not-json<!>', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );
    const manager = new OAuth2TokenManager();

    const err = await manager.getAccessToken().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenPlantbookAuthenticationError);
    expect((err as Error).message).toMatch(/invalid JSON/i);
  });
});

// ---------------------------------------------------------------------------
// J. access_token missing → controlled error
// ---------------------------------------------------------------------------

describe('J. access_token missing', () => {
  it('throws when access_token field is absent', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ token_type: 'Bearer', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const manager = new OAuth2TokenManager();

    const err = await manager.getAccessToken().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenPlantbookAuthenticationError);
    expect((err as Error).message).toMatch(/access_token/i);
  });

  it('throws when access_token is an empty string', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: '   ', token_type: 'Bearer', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
  });

  it('throws when access_token is not a string', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 12345, token_type: 'Bearer', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
  });
});

// ---------------------------------------------------------------------------
// K. expires_in invalid → controlled error
// ---------------------------------------------------------------------------

describe('K. expires_in invalid', () => {
  it('throws when expires_in is missing', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'tok', token_type: 'Bearer' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const manager = new OAuth2TokenManager();

    const err = await manager.getAccessToken().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenPlantbookAuthenticationError);
    expect((err as Error).message).toMatch(/expires_in/i);
  });

  it('throws when expires_in is zero', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'tok', token_type: 'Bearer', expires_in: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
  });

  it('throws when expires_in is negative', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'tok', token_type: 'Bearer', expires_in: -1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
  });

  it('throws when expires_in is a string', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'tok', token_type: 'Bearer', expires_in: '3600' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const manager = new OAuth2TokenManager();

    await expect(manager.getAccessToken()).rejects.toThrow(
      OpenPlantbookAuthenticationError
    );
  });
});

// ---------------------------------------------------------------------------
// L. Timeout → controlled error
// ---------------------------------------------------------------------------

describe('L. Timeout (AbortError)', () => {
  it('throws OpenPlantbookAuthenticationError when fetch is aborted', async () => {
    fetchSpy.mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    );
    const manager = new OAuth2TokenManager();

    const err = await manager.getAccessToken().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenPlantbookAuthenticationError);
    expect((err as Error).message).toMatch(/timed out/i);
  });

  it('throws for generic network errors (non-AbortError)', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const manager = new OAuth2TokenManager();

    const err = await manager.getAccessToken().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenPlantbookAuthenticationError);
    expect((err as Error).message).toMatch(/network error/i);
  });
});

// ---------------------------------------------------------------------------
// M. No error message exposes secret / token
// ---------------------------------------------------------------------------

describe('M. Error messages do not expose secrets', () => {
  const SECRET = VALID_ENV.OPEN_PLANTBOOK_CLIENT_SECRET;
  const TOKEN = 'test-access-token-abc';

  it('401 error message does not contain the client_secret', async () => {
    fetchSpy.mockResolvedValueOnce(makeErrorResponse(401));
    const manager = new OAuth2TokenManager();

    try {
      await manager.getAccessToken();
    } catch (err) {
      expect((err as Error).message).not.toContain(SECRET);
    }
  });

  it('network error message does not contain the client_secret', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const manager = new OAuth2TokenManager();

    try {
      await manager.getAccessToken();
    } catch (err) {
      expect((err as Error).message).not.toContain(SECRET);
    }
  });

  it('token_type error message does not contain the access_token', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: TOKEN, token_type: 'mac', expires_in: 3600 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const manager = new OAuth2TokenManager();

    try {
      await manager.getAccessToken();
    } catch (err) {
      expect((err as Error).message).not.toContain(TOKEN);
    }
  });

  it('missing credentials error does not mention what the secret value is', async () => {
    delete process.env.OPEN_PLANTBOOK_CLIENT_SECRET;
    const manager = new OAuth2TokenManager();

    try {
      await manager.getAccessToken();
    } catch (err) {
      // Message should not inadvertently contain any real secret
      expect((err as Error).message).not.toContain(SECRET);
    }
  });
});
