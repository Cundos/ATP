/**
 * Contract for an OAuth2 Bearer Token Manager.
 *
 * Responsible for obtaining, caching, and renewing short-lived access tokens
 * using the OAuth2 Client Credentials Grant flow. Consumers receive only the
 * raw token string — they never see credential material, token_type, or
 * expiry details.
 *
 * Usage:
 *   const token = await tokenManager.getAccessToken();
 *   // Build header: `Authorization: Bearer ${token}`
 */
export interface IOAuth2TokenManager {
  /**
   * Returns a valid Bearer access token string.
   *
   * - If a cached token is still valid (beyond the safety window), returns it
   *   without performing a network request.
   * - If the token is absent or within the safety window before expiry, fetches
   *   a fresh token from the provider.
   * - Multiple concurrent callers share a single in-flight refresh promise;
   *   the provider is never called more than once per refresh cycle.
   *
   * @returns Resolves with the raw access_token string.
   * @throws {OpenPlantbookAuthenticationError} on any authentication failure.
   */
  getAccessToken(): Promise<string>;
}
