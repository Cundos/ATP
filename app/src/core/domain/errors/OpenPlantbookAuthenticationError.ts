/**
 * Thrown when authentication with Open Plantbook OAuth2 fails for any reason:
 * - Missing credentials (OPEN_PLANTBOOK_CLIENT_ID / OPEN_PLANTBOOK_CLIENT_SECRET).
 * - HTTP 400 / 401 / 403 from the token endpoint.
 * - HTTP 5xx from the provider.
 * - Network timeout / AbortController signal.
 * - Invalid JSON in the response body.
 * - Missing or malformed fields in the token response.
 *
 * SECURITY: The error message MUST NOT contain the client_secret, the
 * access_token, raw response bodies, or any Authorization header value.
 */
export class OpenPlantbookAuthenticationError extends Error {
  constructor(
    message: string,
    /** HTTP status code if the error originated from an HTTP response. */
    public readonly statusCode?: number,
    /** Safe operational context (no secrets). */
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'OpenPlantbookAuthenticationError';
    Object.setPrototypeOf(this, OpenPlantbookAuthenticationError.prototype);
  }
}
