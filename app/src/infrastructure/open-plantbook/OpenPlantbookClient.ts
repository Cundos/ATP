/**
 * OpenPlantbookClient — Resilient server-side HTTP client for Open Plantbook API.
 *
 * Responsibilities:
 * - Search botanical species via GET /api/v1/plant/search/?alias={query}
 * - Retrieve species detail via GET /api/v1/plant/detail/{pid}/?include=*
 * - Authenticate transparently using IOAuth2TokenManager (Bearer token)
 * - Enforce request timeouts (5000ms AbortController)
 * - Handle HTTP 429 Rate Limits capturing optional Retry-After metadata
 * - Handle HTTP 5xx / 404 / Network / JSON parsing errors cleanly
 * - Preserve raw response payloads for audit and snapshot persistence (ATP-IMP-023)
 *
 * Security:
 * - Strict server-only execution via `import 'server-only'`.
 * - Tokens and headers are never logged or exposed in error messages.
 */

import 'server-only';
import { IOAuth2TokenManager } from '../../core/domain/services/IOAuth2TokenManager';
import {
  IOpenPlantbookClient,
  OpenPlantbookDetailData,
  OpenPlantbookDetailResponse,
  OpenPlantbookSearchResponse,
  OpenPlantbookSearchResultItem,
} from '../../core/domain/services/IOpenPlantbookClient';
import {
  OpenPlantbookAuthorizationError,
  OpenPlantbookError,
  OpenPlantbookPlantNotFoundError,
  OpenPlantbookRateLimitError,
  OpenPlantbookResponseError,
  OpenPlantbookServiceUnavailableError,
} from '../../core/domain/errors/OpenPlantbookClientErrors';


const DEFAULT_BASE_URL = 'https://open.plantbook.io';
const TIMEOUT_MS = 5_000;

export class OpenPlantbookClient implements IOpenPlantbookClient {
  private readonly baseUrl: string;
  private readonly tokenManager: IOAuth2TokenManager;

  constructor(
    tokenManager: IOAuth2TokenManager,
    baseUrl: string = DEFAULT_BASE_URL
  ) {
    this.tokenManager = tokenManager;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Searches botanical species by alias/common/scientific name.
   */
  async searchPlants(query: string): Promise<OpenPlantbookSearchResponse> {
    const trimmedQuery = (query || '').trim();
    if (trimmedQuery.length === 0) {
      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
    }

    const url = new URL(`${this.baseUrl}/api/v1/plant/search/`);
    url.searchParams.set('alias', trimmedQuery);

    const data = await this.executeRequest<Record<string, unknown>>(url, 'search');

    if (typeof data !== 'object' || data === null) {
      throw new OpenPlantbookResponseError(
        'Open Plantbook search response is not a valid JSON object.'
      );
    }

    const rawResults = data['results'];
    if (!Array.isArray(rawResults)) {
      throw new OpenPlantbookResponseError(
        'Open Plantbook search response is missing a valid "results" array.'
      );
    }

    const results: OpenPlantbookSearchResultItem[] = [];
    for (const item of rawResults) {
      if (typeof item === 'object' && item !== null) {
        const itemObj = item as Record<string, unknown>;
        const pid = typeof itemObj['pid'] === 'string' ? itemObj['pid'].trim() : '';
        if (pid.length > 0) {
          results.push({
            pid,
            display_pid:
              typeof itemObj['display_pid'] === 'string'
                ? itemObj['display_pid'].trim()
                : undefined,
            alias:
              typeof itemObj['alias'] === 'string'
                ? itemObj['alias'].trim()
                : undefined,
            image_url:
              typeof itemObj['image_url'] === 'string'
                ? itemObj['image_url'].trim()
                : null,
          });
        }
      }
    }

    const count =
      typeof data['count'] === 'number' && Number.isFinite(data['count'])
        ? data['count']
        : results.length;

    const next = typeof data['next'] === 'string' ? data['next'] : null;
    const previous = typeof data['previous'] === 'string' ? data['previous'] : null;

    return {
      count,
      next,
      previous,
      results,
    };
  }

  /**
   * Retrieves full species detail and theoretical care guidelines by PID.
   */
  async getPlantDetail(pid: string): Promise<OpenPlantbookDetailResponse> {
    const trimmedPid = (pid || '').trim();
    if (trimmedPid.length === 0) {
      throw new OpenPlantbookPlantNotFoundError(pid);
    }

    const encodedPid = encodeURIComponent(trimmedPid);
    const url = new URL(`${this.baseUrl}/api/v1/plant/detail/${encodedPid}/`);
    url.searchParams.set('include', '*');

    const rawData = await this.executeRequest<Record<string, unknown>>(
      url,
      'detail',
      trimmedPid
    );

    if (typeof rawData !== 'object' || rawData === null) {
      throw new OpenPlantbookResponseError(
        'Open Plantbook detail response is not a valid JSON object.'
      );
    }

    const rawPid = rawData['pid'];
    if (typeof rawPid !== 'string' || rawPid.trim().length === 0) {
      throw new OpenPlantbookResponseError(
        'Open Plantbook detail response is missing a valid "pid" field.'
      );
    }

    const responsePid = rawPid.trim();

    const parsedData: OpenPlantbookDetailData = {
      pid: responsePid,
      display_pid:
        typeof rawData['display_pid'] === 'string'
          ? rawData['display_pid'].trim()
          : undefined,
      alias:
        typeof rawData['alias'] === 'string' ? rawData['alias'].trim() : undefined,
      image_url:
        typeof rawData['image_url'] === 'string'
          ? rawData['image_url'].trim()
          : null,

      min_temp: this.parseOptionalNumber(rawData['min_temp']),
      max_temp: this.parseOptionalNumber(rawData['max_temp']),

      min_light_lux: this.parseOptionalNumber(rawData['min_light_lux']),
      max_light_lux: this.parseOptionalNumber(rawData['max_light_lux']),

      min_soil_moist: this.parseOptionalNumber(rawData['min_soil_moist']),
      max_soil_moist: this.parseOptionalNumber(rawData['max_soil_moist']),

      min_soil_ec: this.parseOptionalNumber(rawData['min_soil_ec']),
      max_soil_ec: this.parseOptionalNumber(rawData['max_soil_ec']),

      min_env_humid: this.parseOptionalNumber(rawData['min_env_humid']),
      max_env_humid: this.parseOptionalNumber(rawData['max_env_humid']),

      watering: this.parseOptionalString(rawData['watering']),
      sunlight: this.parseOptionalString(rawData['sunlight']),
      soil: this.parseOptionalString(rawData['soil']),
      pruning: this.parseOptionalString(rawData['pruning']),
      fertilization: this.parseOptionalString(rawData['fertilization']),
    };

    return {
      data: parsedData,
      raw: rawData,
    };
  }

  // ---------------------------------------------------------------------------
  // Private Request Execution Helper
  // ---------------------------------------------------------------------------

  private async executeRequest<T>(
    url: URL,
    operation: 'search' | 'detail',
    contextPid?: string
  ): Promise<T> {
    const token = await this.tokenManager.getAccessToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof OpenPlantbookError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenPlantbookServiceUnavailableError(
          `Open Plantbook ${operation} request timed out after ${TIMEOUT_MS}ms.`,
          'timeout',
          undefined,
          err
        );
      }

      throw new OpenPlantbookServiceUnavailableError(
        `Open Plantbook ${operation} request failed due to a network error.`,
        'network',
        undefined,
        err
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const status = response.status;

      if (status === 401 || status === 403) {
        throw new OpenPlantbookAuthorizationError(
          `Open Plantbook authorization rejected (HTTP ${status}).`,
          status
        );
      }

      if (status === 404 && operation === 'detail' && contextPid) {
        throw new OpenPlantbookPlantNotFoundError(contextPid);
      }

      if (status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        let retryAfterSeconds: number | undefined;
        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            retryAfterSeconds = parsed;
          }
        }
        throw new OpenPlantbookRateLimitError(
          'Open Plantbook rate limit exceeded (HTTP 429).',
          retryAfterSeconds
        );
      }

      if (status >= 500 && status <= 599) {
        throw new OpenPlantbookServiceUnavailableError(
          `Open Plantbook service is currently unavailable (HTTP ${status}).`,
          '5xx',
          status
        );
      }

      throw new OpenPlantbookResponseError(
        `Open Plantbook ${operation} failed with HTTP ${status}.`,
        status
      );
    }

    // Parse JSON
    let data: unknown;
    try {
      data = await response.json();
    } catch (err: unknown) {
      throw new OpenPlantbookResponseError(
        `Open Plantbook ${operation} response contained invalid JSON.`,
        response.status,
        err
      );
    }

    return data as T;
  }

  private parseOptionalNumber(val: unknown): number | null {
    if (typeof val === 'number' && Number.isFinite(val)) {
      return val;
    }
    return null;
  }

  private parseOptionalString(val: unknown): string | null {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  }
}
