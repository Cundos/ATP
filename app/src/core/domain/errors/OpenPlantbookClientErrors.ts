/**
 * Base class for Open Plantbook integration errors.
 * Provides a structured `code` / `kind` field to simplify downstream error mapping.
 */
export abstract class OpenPlantbookError extends Error {
  abstract readonly code:
    | 'RATE_LIMIT'
    | 'UNAVAILABLE'
    | 'NOT_FOUND'
    | 'INVALID_RESPONSE'
    | 'AUTH_ERROR'
    | 'NETWORK_ERROR'
    | 'TIMEOUT';

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
 * Thrown when Open Plantbook responds with HTTP 429 Too Many Requests (Rate Limit Exceeded).
 */
export class OpenPlantbookRateLimitError extends OpenPlantbookError {
  readonly code = 'RATE_LIMIT' as const;

  constructor(
    message: string = 'Open Plantbook rate limit exceeded (HTTP 429).',
    public readonly retryAfterSeconds?: number,
    cause?: unknown
  ) {
    super(message, 429, cause);
    this.name = 'OpenPlantbookRateLimitError';
  }
}

/**
 * Thrown when Open Plantbook is unavailable due to HTTP 5xx, network failure, or timeout.
 */
export class OpenPlantbookServiceUnavailableError extends OpenPlantbookError {
  readonly code: 'UNAVAILABLE' | 'NETWORK_ERROR' | 'TIMEOUT';

  constructor(
    message: string,
    public readonly reason: '5xx' | 'network' | 'timeout' = '5xx',
    statusCode?: number,
    cause?: unknown
  ) {
    super(message, statusCode, cause);
    this.name = 'OpenPlantbookServiceUnavailableError';
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
 * Thrown when a specific plant species PID is not found in Open Plantbook (HTTP 404).
 */
export class OpenPlantbookPlantNotFoundError extends OpenPlantbookError {
  readonly code = 'NOT_FOUND' as const;

  constructor(public readonly pid: string, cause?: unknown) {
    super(`Open Plantbook species "${pid}" was not found (HTTP 404).`, 404, cause);
    this.name = 'OpenPlantbookPlantNotFoundError';
  }
}

/**
 * Thrown when Open Plantbook returns a malformed or invalid response (e.g. invalid JSON, missing required structure).
 */
export class OpenPlantbookResponseError extends OpenPlantbookError {
  readonly code = 'INVALID_RESPONSE' as const;

  constructor(
    message: string = 'Open Plantbook returned an invalid or malformed response.',
    statusCode?: number,
    cause?: unknown
  ) {
    super(message, statusCode, cause);
    this.name = 'OpenPlantbookResponseError';
  }
}
