/**
 * OAuth2TokenManager — Open Plantbook OAuth2 Client Credentials Token Manager
 *
 * Implements IOAuth2TokenManager for Open Plantbook using the standard
 * OAuth2 Client Credentials Grant:
 *
 *   POST https://open.plantbook.io/api/v1/token/
 *   Content-Type: application/x-www-form-urlencoded
 *   Body: grant_type=client_credentials&client_id=…&client_secret=…
 *
 * === Cache and Expiry Policy ===
 * Tokens are cached in-process (module-level singleton state).
 * A token is considered valid if:
 *   now < (expires_at - SAFETY_WINDOW_MS)
 * where SAFETY_WINDOW_MS = min(60_000 ms, 20% of total TTL).
 * This prevents using a token that expires mid-flight.
 *
 * === Concurrency ===
 * Only one refresh HTTP request is in-flight at any given time.
 * Concurrent callers that detect an expired/missing token all await the same
 * Promise<string>. The provider receives exactly one token request per
 * refresh cycle.
 *
 * === Serverless (Vercel) note ===
 * This cache is in-process memory. In a serverless/multi-instance environment
 * (Vercel), each function instance maintains its own independent cache.
 * This is an acceptable trade-off for v0.1: a cold instance will perform one
 * OAuth round-trip, then cache for the remaining token lifetime.
 * No external KV store (Redis, Vercel KV) is required.
 *
 * === Security ===
 * - Credentials are read exclusively from server-side environment variables.
 * - The access_token is never logged or exposed to client code.
 * - Errors do not include secret material.
 * - The module imports 'server-only' to prevent accidental client bundling.
 */

import 'server-only';
import { IOAuth2TokenManager } from '../../core/domain/services/IOAuth2TokenManager';
import { OpenPlantbookAuthenticationError } from '../../core/domain/errors/OpenPlantbookAuthenticationError';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TOKEN_ENDPOINT = 'https://open.plantbook.io/api/v1/token/';
const TIMEOUT_MS = 5_000;

/**
 * Safety window: renew the token this many ms before it actually expires.
 * Capped at 20% of the total TTL to avoid renewing immediately when the
 * provider returns very short-lived tokens.
 */
function computeSafetyWindow(ttlMs: number): number {
  return Math.min(60_000, Math.floor(ttlMs * 0.2));
}

// ---------------------------------------------------------------------------
// Clock abstraction (injectable for testing)
// ---------------------------------------------------------------------------

export type ClockFn = () => number;

const defaultClock: ClockFn = () => Date.now();

// ---------------------------------------------------------------------------
// Token cache (module-level singleton per process instance)
// ---------------------------------------------------------------------------

interface CachedToken {
  accessToken: string;
  /** Absolute epoch ms when the token expires (as reported by the provider). */
  expiresAt: number;
  /** Safety threshold: token is considered expired at this point. */
  safeExpiresAt: number;
}

/**
 * Internal mutable state. Exposed only for testing via __resetForTest().
 */
let cachedToken: CachedToken | null = null;
let refreshPromise: Promise<string> | null = null;

// ---------------------------------------------------------------------------
// Test-only reset
// ---------------------------------------------------------------------------

/**
 * Resets the module-level singleton cache and any in-flight refresh promise.
 * FOR TESTING ONLY — never called from production code.
 */
export function __resetForTest(): void {
  cachedToken = null;
  refreshPromise = null;
}



// OAuth2TokenManager
// ---------------------------------------------------------------------------

/**
 * Server-side OAuth2 Client Credentials token manager for Open Plantbook.
 *
 * Instantiate once (or use the module-level singleton via
 * getOpenPlantbookTokenManager()) and share across the application.
 *
 * The constructor accepts an optional clock function for deterministic testing.
 */
export class OAuth2TokenManager implements IOAuth2TokenManager {
  private readonly clock: ClockFn;

  constructor(clock: ClockFn = defaultClock) {
    this.clock = clock;
  }

  /**
   * Returns a valid Bearer access token string.
   *
   * - Returns the cached token if it is within its safe validity window.
   * - Otherwise fetches a fresh token. Concurrent callers share one request.
   *
   * @throws {OpenPlantbookAuthenticationError}
   */
  async getAccessToken(): Promise<string> {
    const now = this.clock();

    // Fast path: cached token is still valid
    if (cachedToken !== null && now < cachedToken.safeExpiresAt) {
      return cachedToken.accessToken;
    }

    // Slow path: need a refresh. Share the in-flight promise to avoid thundering herd.
    if (refreshPromise !== null) {
      return refreshPromise;
    }

    refreshPromise = this.fetchToken().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  }

  // -------------------------------------------------------------------------
  // Private: fetch a fresh token from the provider
  // -------------------------------------------------------------------------

  private async fetchToken(): Promise<string> {
    const clientId = process.env.OPEN_PLANTBOOK_CLIENT_ID;
    const clientSecret = process.env.OPEN_PLANTBOOK_CLIENT_SECRET;

    // Validate credentials before making any network call
    if (!clientId || !clientSecret) {
      throw new OpenPlantbookAuthenticationError(
        'Open Plantbook credentials are not configured. ' +
        'Set OPEN_PLANTBOOK_CLIENT_ID and OPEN_PLANTBOOK_CLIENT_SECRET.'
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      });

      response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenPlantbookAuthenticationError(
          `Open Plantbook token request timed out after ${TIMEOUT_MS}ms.`,
          undefined,
          err
        );
      }

      throw new OpenPlantbookAuthenticationError(
        'Open Plantbook token request failed due to a network error.',
        undefined,
        err
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // HTTP error handling (no secret material in messages)
    if (!response.ok) {
      const status = response.status;

      if (status === 400 || status === 401 || status === 403) {
        throw new OpenPlantbookAuthenticationError(
          `Open Plantbook authentication rejected (HTTP ${status}). ` +
          'Verify that OPEN_PLANTBOOK_CLIENT_ID and OPEN_PLANTBOOK_CLIENT_SECRET are correct.',
          status
        );
      }

      throw new OpenPlantbookAuthenticationError(
        `Open Plantbook token endpoint returned an unexpected status (HTTP ${status}).`,
        status
      );
    }

    // Parse response body
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new OpenPlantbookAuthenticationError(
        'Open Plantbook token response contained invalid JSON.',
        response.status
      );
    }

    // Validate payload fields
    return this.validateAndCache(data);
  }

  // -------------------------------------------------------------------------
  // Private: validate token payload and store in cache
  // -------------------------------------------------------------------------

  private validateAndCache(data: unknown): string {
    if (typeof data !== 'object' || data === null) {
      throw new OpenPlantbookAuthenticationError(
        'Open Plantbook token response is not a JSON object.'
      );
    }

    const payload = data as Record<string, unknown>;

    // Validate access_token
    const accessToken = payload['access_token'];
    if (typeof accessToken !== 'string' || accessToken.trim() === '') {
      throw new OpenPlantbookAuthenticationError(
        'Open Plantbook token response is missing a valid access_token field.'
      );
    }

    // Validate token_type (case-insensitive, must be Bearer)
    const tokenType = payload['token_type'];
    if (typeof tokenType !== 'string' || tokenType.toLowerCase() !== 'bearer') {
      throw new OpenPlantbookAuthenticationError(
        `Open Plantbook token response has an unsupported token_type: "${String(tokenType)}".`
      );
    }

    // Validate expires_in
    const expiresIn = payload['expires_in'];
    if (
      typeof expiresIn !== 'number' ||
      !Number.isFinite(expiresIn) ||
      expiresIn <= 0
    ) {
      throw new OpenPlantbookAuthenticationError(
        'Open Plantbook token response is missing a valid expires_in field.'
      );
    }

    const now = this.clock();
    const ttlMs = expiresIn * 1_000;
    const expiresAt = now + ttlMs;
    const safeExpiresAt = expiresAt - computeSafetyWindow(ttlMs);

    // Store in module-level cache (do not cache partial/invalid responses)
    cachedToken = {
      accessToken: accessToken.trim(),
      expiresAt,
      safeExpiresAt,
    };

    return cachedToken.accessToken;
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton (lazy, per process instance)
// ---------------------------------------------------------------------------

let _tokenManager: OAuth2TokenManager | null = null;

/**
 * Returns the shared OAuth2TokenManager instance for this process.
 * Suitable for use in Server Actions, Route Handlers, and other server code.
 *
 * Do NOT import this from Client Components.
 */
export function getOpenPlantbookTokenManager(): OAuth2TokenManager {
  if (_tokenManager === null) {
    _tokenManager = new OAuth2TokenManager();
  }
  return _tokenManager;
}
