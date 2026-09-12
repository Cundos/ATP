/**
 * HomeAssistantRestClient — Resilient server-side HTTP client for Home Assistant REST API.
 *
 * Responsibilities:
 * - Read-only query of entity states via GET /api/states/{entity_id}
 * - Authenticate using Long-Lived Access Token (Bearer token)
 * - Request timeout enforcement via AbortController (default 7000ms)
 * - Strict error classification (401, 403, 404, 429, 5xx, timeout, network failure, malformed JSON)
 * - Attribute sanitization (whitelist only friendly_name, unit_of_measurement, device_class)
 *
 * Security:
 * - Strict server-only execution via `import 'server-only'`.
 * - Tokens and authorization headers are NEVER logged, serialized, or exposed in error messages.
 */

import 'server-only';
import {
  HomeAssistantState,
  IHomeAssistantClient,
} from '../../core/domain/services/IHomeAssistantClient';
import {
  HomeAssistantAuthenticationError,
  HomeAssistantConfigurationError,
  HomeAssistantEntityNotFoundError,
  HomeAssistantForbiddenError,
  HomeAssistantRateLimitError,
  HomeAssistantResponseError,
  HomeAssistantServiceUnavailableError,
} from '../../core/domain/errors/HomeAssistantErrors';

const DEFAULT_TIMEOUT_MS = 7_000;

export class HomeAssistantRestClient implements IHomeAssistantClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(
    baseUrl?: string,
    token?: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ) {
    const rawUrl = (baseUrl ?? process.env.HOME_ASSISTANT_BASE_URL ?? '').trim();
    const rawToken = (token ?? process.env.HOME_ASSISTANT_TOKEN ?? '').trim();

    if (!rawUrl || !rawToken) {
      this.baseUrl = '';
      this.token = '';
    } else {
      this.baseUrl = rawUrl.replace(/\/+$/, '');
      this.token = rawToken;
    }

    this.timeoutMs = timeoutMs;
  }

  /**
   * Retrieves the current state and sanitized attributes for a specific entity ID.
   */
  async getState(entityId: string): Promise<HomeAssistantState> {
    const trimmedEntityId = (entityId || '').trim();
    if (!trimmedEntityId) {
      throw new HomeAssistantEntityNotFoundError(entityId);
    }

    if (!this.baseUrl || !this.token) {
      throw new HomeAssistantConfigurationError(
        'Home Assistant configuration is missing or invalid. Set HOME_ASSISTANT_BASE_URL and HOME_ASSISTANT_TOKEN.'
      );
    }

    const encodedEntityId = encodeURIComponent(trimmedEntityId);
    const url = `${this.baseUrl}/api/states/${encodedEntityId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        throw new HomeAssistantServiceUnavailableError(
          `Home Assistant request for entity "${trimmedEntityId}" timed out after ${this.timeoutMs}ms.`,
          'timeout',
          undefined,
          err
        );
      }

      throw new HomeAssistantServiceUnavailableError(
        `Home Assistant request for entity "${trimmedEntityId}" failed due to a network connection error.`,
        'network',
        undefined,
        err
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const status = response.status;

      if (status === 401) {
        throw new HomeAssistantAuthenticationError(
          'Home Assistant authentication rejected (HTTP 401). Verify token validity.'
        );
      }

      if (status === 403) {
        throw new HomeAssistantForbiddenError(
          `Home Assistant access forbidden (HTTP 403) for entity "${trimmedEntityId}".`
        );
      }

      if (status === 404) {
        throw new HomeAssistantEntityNotFoundError(trimmedEntityId);
      }

      if (status === 429) {
        throw new HomeAssistantRateLimitError(
          'Home Assistant rate limit exceeded (HTTP 429).'
        );
      }

      if (status >= 500 && status <= 599) {
        throw new HomeAssistantServiceUnavailableError(
          `Home Assistant service is currently unavailable (HTTP ${status}).`,
          '5xx',
          status
        );
      }

      throw new HomeAssistantResponseError(
        `Home Assistant request failed with HTTP ${status}.`,
        status
      );
    }

    let rawData: unknown;
    try {
      rawData = await response.json();
    } catch (err: unknown) {
      throw new HomeAssistantResponseError(
        `Home Assistant returned an invalid or non-JSON response for entity "${trimmedEntityId}".`,
        response.status,
        err
      );
    }

    if (typeof rawData !== 'object' || rawData === null) {
      throw new HomeAssistantResponseError(
        `Home Assistant response payload is not a valid JSON object for entity "${trimmedEntityId}".`,
        response.status
      );
    }

    const dataObj = rawData as Record<string, unknown>;
    const returnedEntityId =
      typeof dataObj['entity_id'] === 'string' && dataObj['entity_id'].trim().length > 0
        ? dataObj['entity_id'].trim()
        : trimmedEntityId;

    const state = typeof dataObj['state'] === 'string' ? dataObj['state'] : String(dataObj['state'] ?? '');
    const lastChanged = typeof dataObj['last_changed'] === 'string' ? dataObj['last_changed'] : '';
    const lastUpdated = typeof dataObj['last_updated'] === 'string' ? dataObj['last_updated'] : '';

    const rawAttributes =
      typeof dataObj['attributes'] === 'object' && dataObj['attributes'] !== null
        ? (dataObj['attributes'] as Record<string, unknown>)
        : {};

    const friendlyName =
      typeof rawAttributes['friendly_name'] === 'string' && rawAttributes['friendly_name'].trim().length > 0
        ? rawAttributes['friendly_name'].trim()
        : undefined;

    const unit =
      typeof rawAttributes['unit_of_measurement'] === 'string' && rawAttributes['unit_of_measurement'].trim().length > 0
        ? rawAttributes['unit_of_measurement'].trim()
        : undefined;

    // Strict allowlist: friendly_name, unit_of_measurement, device_class
    const sanitizedAttributes: Record<string, string | number | boolean | null> = {};
    if (friendlyName !== undefined) {
      sanitizedAttributes['friendly_name'] = friendlyName;
    }
    if (unit !== undefined) {
      sanitizedAttributes['unit_of_measurement'] = unit;
    }
    if (typeof rawAttributes['device_class'] === 'string' && rawAttributes['device_class'].trim().length > 0) {
      sanitizedAttributes['device_class'] = rawAttributes['device_class'].trim();
    }

    return {
      entityId: returnedEntityId,
      state,
      unit,
      friendlyName,
      lastChanged,
      lastUpdated,
      attributes: Object.keys(sanitizedAttributes).length > 0 ? sanitizedAttributes : undefined,
    };
  }
}
