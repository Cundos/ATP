/**
 * Base class for Home Assistant integration errors.
 * Provides a structured `code` property for reliable downstream categorization.
 */
export abstract class HomeAssistantError extends Error {
  abstract readonly code:
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'RATE_LIMIT'
    | 'UNAVAILABLE'
    | 'TIMEOUT'
    | 'NETWORK_ERROR'
    | 'INVALID_RESPONSE'
    | 'CONFIG_ERROR';

  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when Home Assistant responds with HTTP 401 Unauthorized (Invalid or expired access token).
 * Note: Never includes token contents in the error message or serialized properties.
 */
export class HomeAssistantAuthenticationError extends HomeAssistantError {
  readonly code = 'UNAUTHORIZED' as const;

  constructor(
    message: string = 'Home Assistant authentication rejected (HTTP 401). Verify token validity.',
    cause?: unknown
  ) {
    super(message, 401, cause);
    this.name = 'HomeAssistantAuthenticationError';
  }
}

/**
 * Thrown when Home Assistant responds with HTTP 403 Forbidden (Insufficient permissions).
 */
export class HomeAssistantForbiddenError extends HomeAssistantError {
  readonly code = 'FORBIDDEN' as const;

  constructor(
    message: string = 'Home Assistant access forbidden (HTTP 403).',
    cause?: unknown
  ) {
    super(message, 403, cause);
    this.name = 'HomeAssistantForbiddenError';
  }
}

/**
 * Thrown when a specific entity ID is not found in Home Assistant (HTTP 404).
 */
export class HomeAssistantEntityNotFoundError extends HomeAssistantError {
  readonly code = 'NOT_FOUND' as const;

  constructor(public readonly entityId: string, cause?: unknown) {
    super(`Home Assistant entity "${entityId}" was not found (HTTP 404).`, 404, cause);
    this.name = 'HomeAssistantEntityNotFoundError';
  }
}

/**
 * Thrown when Home Assistant responds with HTTP 429 Too Many Requests (Rate limit exceeded).
 */
export class HomeAssistantRateLimitError extends HomeAssistantError {
  readonly code = 'RATE_LIMIT' as const;

  constructor(
    message: string = 'Home Assistant rate limit exceeded (HTTP 429).',
    cause?: unknown
  ) {
    super(message, 429, cause);
    this.name = 'HomeAssistantRateLimitError';
  }
}

/**
 * Thrown when Home Assistant is unreachable due to HTTP 5xx, timeout, or network disconnect.
 */
export class HomeAssistantServiceUnavailableError extends HomeAssistantError {
  readonly code: 'UNAVAILABLE' | 'TIMEOUT' | 'NETWORK_ERROR';

  constructor(
    message: string,
    public readonly reason: '5xx' | 'timeout' | 'network' = '5xx',
    statusCode?: number,
    cause?: unknown
  ) {
    super(message, statusCode, cause);
    this.name = 'HomeAssistantServiceUnavailableError';
    if (reason === 'timeout') {
      this.code = 'TIMEOUT';
    } else if (reason === 'network') {
      this.code = 'NETWORK_ERROR';
    } else {
      this.code = 'UNAVAILABLE';
    }
  }
}

/**
 * Thrown when Home Assistant returns an unexpected payload or malformed non-JSON data.
 */
export class HomeAssistantResponseError extends HomeAssistantError {
  readonly code = 'INVALID_RESPONSE' as const;

  constructor(
    message: string = 'Home Assistant returned an invalid or malformed response.',
    statusCode?: number,
    cause?: unknown
  ) {
    super(message, statusCode, cause);
    this.name = 'HomeAssistantResponseError';
  }
}

/**
 * Thrown when the Home Assistant base URL or Long-Lived Access Token is missing or invalid.
 */
export class HomeAssistantConfigurationError extends HomeAssistantError {
  readonly code = 'CONFIG_ERROR' as const;

  constructor(
    message: string = 'Home Assistant configuration is missing or invalid (HOME_ASSISTANT_BASE_URL / HOME_ASSISTANT_TOKEN).',
    cause?: unknown
  ) {
    super(message, undefined, cause);
    this.name = 'HomeAssistantConfigurationError';
  }
}
