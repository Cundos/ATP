import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HomeAssistantRestClient } from '../HomeAssistantRestClient';
import {
  HomeAssistantAuthenticationError,
  HomeAssistantConfigurationError,
  HomeAssistantEntityNotFoundError,
  HomeAssistantForbiddenError,
  HomeAssistantRateLimitError,
  HomeAssistantResponseError,
  HomeAssistantServiceUnavailableError,
} from '../../../core/domain/errors/HomeAssistantErrors';

const TEST_BASE_URL = 'https://nabu-test.ui.nabu.casa';
const TEST_TOKEN = 'secret-test-llat-token-value-12345';

describe('HomeAssistantRestClient (ATP-HA-001 Foundation)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // 1. Success with permitted attributes
  it('A. retrieves entity state and extracts only allowed attributes sanitizing raw payload', async () => {
    const mockPayload = {
      entity_id: 'sensor.humedad_suelo_palta',
      state: '80.1',
      last_changed: '2026-09-12T14:30:00.000Z',
      last_updated: '2026-09-12T14:35:00.000Z',
      attributes: {
        friendly_name: 'Humedad Suelo Palta',
        unit_of_measurement: '%',
        device_class: 'moisture',
        // Unapproved/internal properties that MUST be filtered out:
        context: { id: '01J7...', user_id: 'abc...' },
        access_token: 'should-never-be-leaked',
        arbitrary_internal_data: { nested: true },
        icon: 'mdi:sprout',
      },
    };

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);
    const result = await client.getState('sensor.humedad_suelo_palta');

    expect(result).toEqual({
      entityId: 'sensor.humedad_suelo_palta',
      state: '80.1',
      unit: '%',
      friendlyName: 'Humedad Suelo Palta',
      lastChanged: '2026-09-12T14:30:00.000Z',
      lastUpdated: '2026-09-12T14:35:00.000Z',
      attributes: {
        friendly_name: 'Humedad Suelo Palta',
        unit_of_measurement: '%',
        device_class: 'moisture',
      },
    });

    // Check fetch request headers
    expect(global.fetch).toHaveBeenCalledWith(
      'https://nabu-test.ui.nabu.casa/api/states/sensor.humedad_suelo_palta',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
    );
  });

  // 2. HTTP 401 Unauthorized (Verify token is never in error)
  it('B. throws HomeAssistantAuthenticationError on HTTP 401 without leaking token', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
    );

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);

    await expect(client.getState('sensor.humedad_suelo_palta')).rejects.toThrow(
      HomeAssistantAuthenticationError
    );

    try {
      await client.getState('sensor.humedad_suelo_palta');
    } catch (err: unknown) {
      const error = err as Error;
      expect(error.message).not.toContain(TEST_TOKEN);
      expect(JSON.stringify(error)).not.toContain(TEST_TOKEN);
    }
  });

  // 3. HTTP 403 Forbidden
  it('C. throws HomeAssistantForbiddenError on HTTP 403', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('Forbidden', { status: 403, statusText: 'Forbidden' })
    );

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);
    await expect(client.getState('sensor.humedad_suelo_palta')).rejects.toThrow(
      HomeAssistantForbiddenError
    );
  });

  // 4. HTTP 404 Entity Not Found
  it('D. throws HomeAssistantEntityNotFoundError on HTTP 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('Entity not found', { status: 404, statusText: 'Not Found' })
    );

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);
    await expect(client.getState('sensor.non_existent_entity')).rejects.toThrow(
      HomeAssistantEntityNotFoundError
    );
  });

  // 5. HTTP 429 Rate Limit
  it('E. throws HomeAssistantRateLimitError on HTTP 429', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('Too Many Requests', { status: 429, statusText: 'Too Many Requests' })
    );

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);
    await expect(client.getState('sensor.humedad_suelo_palta')).rejects.toThrow(
      HomeAssistantRateLimitError
    );
  });

  // 6. HTTP 500 / 502 / 503 Service Unavailable
  it('F. throws HomeAssistantServiceUnavailableError on HTTP 5xx server errors', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' })
    );

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);
    await expect(client.getState('sensor.humedad_suelo_palta')).rejects.toThrow(
      HomeAssistantServiceUnavailableError
    );
  });

  // 7. Request Timeout
  it('G. throws HomeAssistantServiceUnavailableError with timeout reason on request timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    global.fetch = vi.fn().mockRejectedValue(abortError);

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN, 50);
    await expect(client.getState('sensor.humedad_suelo_palta')).rejects.toThrow(
      HomeAssistantServiceUnavailableError
    );

    try {
      await client.getState('sensor.humedad_suelo_palta');
    } catch (err: unknown) {
      const haErr = err as HomeAssistantServiceUnavailableError;
      expect(haErr.reason).toBe('timeout');
      expect(haErr.code).toBe('TIMEOUT');
    }
  });

  // 8. Network Connection Failure
  it('H. throws HomeAssistantServiceUnavailableError with network reason on connection failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET socket hang up'));

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);
    await expect(client.getState('sensor.humedad_suelo_palta')).rejects.toThrow(
      HomeAssistantServiceUnavailableError
    );

    try {
      await client.getState('sensor.humedad_suelo_palta');
    } catch (err: unknown) {
      const haErr = err as HomeAssistantServiceUnavailableError;
      expect(haErr.reason).toBe('network');
      expect(haErr.code).toBe('NETWORK_ERROR');
    }
  });

  // 9. Malformed / Non-JSON Response
  it('I. throws HomeAssistantResponseError when response is not valid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('<html><body>Bad Gateway</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);
    await expect(client.getState('sensor.humedad_suelo_palta')).rejects.toThrow(
      HomeAssistantResponseError
    );
  });

  // 10. Missing configuration
  it('J. throws HomeAssistantConfigurationError when base URL or token is missing', async () => {
    const client = new HomeAssistantRestClient('', '');
    await expect(client.getState('sensor.humedad_suelo_palta')).rejects.toThrow(
      HomeAssistantConfigurationError
    );
  });

  // 11. Empty or whitespace entityId
  it('K. throws HomeAssistantEntityNotFoundError when entityId is empty or whitespace', async () => {
    const client = new HomeAssistantRestClient(TEST_BASE_URL, TEST_TOKEN);
    await expect(client.getState('   ')).rejects.toThrow(
      HomeAssistantEntityNotFoundError
    );
  });
});
