/**
 * Comprehensive MSW test suite for OpenPlantbookClient (ATP-IMP-022).
 *
 * Covers cases A through R:
 * - A. search exitoso
 * - B. search encodea correctamente query con espacios, acentos y caracteres especiales
 * - C. detail exitoso
 * - D. pid se encodea correctamente
 * - E. Authorization Bearer presente
 * - F. token manager llamado
 * - G. timeout search
 * - H. timeout detail
 * - I. network error
 * - J. 429 con Retry-After
 * - K. 500
 * - L. 503
 * - M. 404 detail
 * - N. JSON inválido
 * - O. respuesta search malformada
 * - P. detalle con campos opcionales faltantes sigue siendo aceptable
 * - Q. query vacía no hace fetch
 * - R. ningún error expone access token
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import { OpenPlantbookClient } from '../OpenPlantbookClient';
import { IOAuth2TokenManager } from '../../../core/domain/services/IOAuth2TokenManager';
import {
  OpenPlantbookAuthorizationError,
  OpenPlantbookPlantNotFoundError,
  OpenPlantbookRateLimitError,
  OpenPlantbookResponseError,
  OpenPlantbookServiceUnavailableError,
} from '../../../core/domain/errors/OpenPlantbookClientErrors';


const TEST_BASE_URL = 'https://open.plantbook.io';
const TEST_TOKEN = 'secret-test-bearer-token-xyz-123';

const mockTokenManager: IOAuth2TokenManager = {
  getAccessToken: vi.fn().mockResolvedValue(TEST_TOKEN),
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('OpenPlantbookClient (ATP-IMP-022)', () => {
  // ---------------------------------------------------------------------------
  // A. Search Exitoso
  // ---------------------------------------------------------------------------
  describe('A. Search Exitoso', () => {
    it('returns formatted search response with matching species', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          return HttpResponse.json({
            count: 2,
            next: null,
            previous: null,
            results: [
              {
                pid: 'monstera deliciosa',
                display_pid: 'Monstera deliciosa',
                alias: 'Cerimán, Costilla de Adán',
                image_url: 'https://open.plantbook.io/images/monstera.jpg',
              },
              {
                pid: 'monstera adansonii',
                display_pid: 'Monstera adansonii',
                alias: 'Monstera Monkey Mask',
                image_url: null,
              },
            ],
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const res = await client.searchPlants('monstera');

      expect(res.count).toBe(2);
      expect(res.results).toHaveLength(2);
      expect(res.results[0]?.pid).toBe('monstera deliciosa');
      expect(res.results[0]?.display_pid).toBe('Monstera deliciosa');
      expect(res.results[0]?.alias).toBe('Cerimán, Costilla de Adán');
      expect(res.results[0]?.image_url).toBe('https://open.plantbook.io/images/monstera.jpg');
      expect(res.results[1]?.pid).toBe('monstera adansonii');
      expect(res.results[1]?.image_url).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // B. Search Query Encoding
  // ---------------------------------------------------------------------------
  describe('B. Search Encoding (spaces, accents, special characters)', () => {
    it('encodes query parameters correctly with special characters and accents', async () => {
      let interceptedUrl: string | null = null;

      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, ({ request }) => {
          interceptedUrl = request.url;
          return HttpResponse.json({
            count: 1,
            results: [{ pid: 'ficus benjamina', display_pid: 'Ficus benjamina' }],
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      await client.searchPlants('ficus gomero / árbol & limón');

      expect(interceptedUrl).not.toBeNull();
      const url = new URL(interceptedUrl!);
      expect(url.searchParams.get('alias')).toBe('ficus gomero / árbol & limón');
    });
  });

  // ---------------------------------------------------------------------------
  // C. Detail Exitoso
  // ---------------------------------------------------------------------------
  describe('C. Detail Exitoso', () => {
    it('returns full botanical detail data and preserves raw payload', async () => {
      const mockRawPayload = {
        pid: 'monstera deliciosa',
        display_pid: 'Monstera deliciosa',
        alias: 'Costilla de Adán',
        image_url: 'https://open.plantbook.io/images/monstera.jpg',
        min_temp: 15,
        max_temp: 30,
        min_light_lux: 1500,
        max_light_lux: 3000,
        min_soil_moist: 15,
        max_soil_moist: 60,
        min_soil_ec: 350,
        max_soil_ec: 2000,
        min_env_humid: 50,
        max_env_humid: 80,
        watering: 'Regar cuando los primeros 3cm de sustrato estén secos.',
        sunlight: 'Luz indirecta brillante.',
        soil: 'Sustrato aireado con perlita y corteza.',
        pruning: 'Retirar hojas amarillentas o dañadas.',
        fertilization: 'Fertilizar mensualmente en primavera/verano.',
        custom_extra_field: 'should be preserved in raw payload',
      };

      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return HttpResponse.json(mockRawPayload);
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const detail = await client.getPlantDetail('monstera deliciosa');

      expect(detail.data.pid).toBe('monstera deliciosa');
      expect(detail.data.display_pid).toBe('Monstera deliciosa');
      expect(detail.data.min_temp).toBe(15);
      expect(detail.data.max_temp).toBe(30);
      expect(detail.data.min_light_lux).toBe(1500);
      expect(detail.data.watering).toBe('Regar cuando los primeros 3cm de sustrato estén secos.');
      expect(detail.raw).toEqual(mockRawPayload);
    });
  });

  // ---------------------------------------------------------------------------
  // D. PID Encoding
  // ---------------------------------------------------------------------------
  describe('D. PID Encoding', () => {
    it('encodes species pid in URL path safely', async () => {
      let interceptedUrl: string | null = null;

      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, ({ request }) => {
          interceptedUrl = request.url;
          return HttpResponse.json({ pid: 'epipremnum aureum (var. neon)' });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      await client.getPlantDetail('epipremnum aureum (var. neon)');

      expect(interceptedUrl).not.toBeNull();
      expect(interceptedUrl).toContain(
        encodeURIComponent('epipremnum aureum (var. neon)')
      );
    });
  });

  // ---------------------------------------------------------------------------
  // E & F. Authorization Header & Token Manager Invocation
  // ---------------------------------------------------------------------------
  describe('E & F. Authorization Header & Token Manager', () => {
    it('attaches Bearer token in Authorization header and calls tokenManager', async () => {
      let authHeader: string | null = null;

      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, ({ request }) => {
          authHeader = request.headers.get('Authorization');
          return HttpResponse.json({ count: 0, results: [] });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      await client.searchPlants('pothos');

      expect(mockTokenManager.getAccessToken).toHaveBeenCalledOnce();
      expect(authHeader).toBe(`Bearer ${TEST_TOKEN}`);
    });
  });

  // ---------------------------------------------------------------------------
  // G. Timeout Search
  // ---------------------------------------------------------------------------
  describe('G. Timeout Search', () => {
    it('throws OpenPlantbookServiceUnavailableError with timeout reason on search timeout', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, async () => {
          await delay(6_000);
          return HttpResponse.json({ count: 0, results: [] });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.searchPlants('slow').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookServiceUnavailableError);
      expect((err as OpenPlantbookServiceUnavailableError).reason).toBe('timeout');
      expect((err as OpenPlantbookServiceUnavailableError).code).toBe('TIMEOUT');
    }, 10_000);
  });

  // ---------------------------------------------------------------------------
  // H. Timeout Detail
  // ---------------------------------------------------------------------------
  describe('H. Timeout Detail', () => {
    it('throws OpenPlantbookServiceUnavailableError with timeout reason on detail timeout', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, async () => {
          await delay(6_000);
          return HttpResponse.json({ pid: 'slow-plant' });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.getPlantDetail('slow-plant').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookServiceUnavailableError);
      expect((err as OpenPlantbookServiceUnavailableError).reason).toBe('timeout');
      expect((err as OpenPlantbookServiceUnavailableError).code).toBe('TIMEOUT');
    }, 10_000);
  });

  // ---------------------------------------------------------------------------
  // I. Network Error
  // ---------------------------------------------------------------------------
  describe('I. Network Error', () => {
    it('throws OpenPlantbookServiceUnavailableError with network reason on connection failure', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          return HttpResponse.error();
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.searchPlants('ficus').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookServiceUnavailableError);
      expect((err as OpenPlantbookServiceUnavailableError).reason).toBe('network');
      expect((err as OpenPlantbookServiceUnavailableError).code).toBe('NETWORK_ERROR');
    });
  });

  // ---------------------------------------------------------------------------
  // J. HTTP 429 con Retry-After
  // ---------------------------------------------------------------------------
  describe('J. HTTP 429 Rate Limit con Retry-After', () => {
    it('throws OpenPlantbookRateLimitError and captures Retry-After header', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          return new HttpResponse(
            JSON.stringify({ detail: 'Request was throttled.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '120',
              },
            }
          );
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.searchPlants('monstera').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookRateLimitError);
      expect((err as OpenPlantbookRateLimitError).code).toBe('RATE_LIMIT');
      expect((err as OpenPlantbookRateLimitError).statusCode).toBe(429);
      expect((err as OpenPlantbookRateLimitError).retryAfterSeconds).toBe(120);
    });
  });

  // ---------------------------------------------------------------------------
  // K. HTTP 500
  // ---------------------------------------------------------------------------
  describe('K. HTTP 500 Internal Server Error', () => {
    it('throws OpenPlantbookServiceUnavailableError on HTTP 500', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          return new HttpResponse('Internal Server Error', { status: 500 });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.searchPlants('monstera').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookServiceUnavailableError);
      expect((err as OpenPlantbookServiceUnavailableError).reason).toBe('5xx');
      expect((err as OpenPlantbookServiceUnavailableError).statusCode).toBe(500);
      expect((err as OpenPlantbookServiceUnavailableError).code).toBe('UNAVAILABLE');
    });
  });

  // ---------------------------------------------------------------------------
  // L. HTTP 503
  // ---------------------------------------------------------------------------
  describe('L. HTTP 503 Service Unavailable', () => {
    it('throws OpenPlantbookServiceUnavailableError on HTTP 503', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return new HttpResponse('Service Unavailable', { status: 503 });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.getPlantDetail('monstera').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookServiceUnavailableError);
      expect((err as OpenPlantbookServiceUnavailableError).reason).toBe('5xx');
      expect((err as OpenPlantbookServiceUnavailableError).statusCode).toBe(503);
    });
  });

  // ---------------------------------------------------------------------------
  // M. HTTP 404 Detail
  // ---------------------------------------------------------------------------
  describe('M. HTTP 404 Species Not Found', () => {
    it('throws OpenPlantbookPlantNotFoundError when species does not exist', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return new HttpResponse(JSON.stringify({ detail: 'Not found.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.getPlantDetail('non-existent-species-123').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookPlantNotFoundError);
      expect((err as OpenPlantbookPlantNotFoundError).code).toBe('NOT_FOUND');
      expect((err as OpenPlantbookPlantNotFoundError).pid).toBe('non-existent-species-123');
      expect((err as OpenPlantbookPlantNotFoundError).statusCode).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // N. Invalid JSON
  // ---------------------------------------------------------------------------
  describe('N. Invalid JSON Response', () => {
    it('throws OpenPlantbookResponseError when HTTP 200 body is not JSON', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          return new HttpResponse('<html><body>Gateway Error</body></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.searchPlants('monstera').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookResponseError);
      expect((err as OpenPlantbookResponseError).code).toBe('INVALID_RESPONSE');
    });
  });

  // ---------------------------------------------------------------------------
  // O. Malformed Search Response
  // ---------------------------------------------------------------------------
  describe('O. Malformed Search Response', () => {
    it('throws OpenPlantbookResponseError when results is not an array', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          return HttpResponse.json({ count: 1, results: 'not-an-array' });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.searchPlants('monstera').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookResponseError);
      expect((err as OpenPlantbookResponseError).code).toBe('INVALID_RESPONSE');
    });
  });

  // ---------------------------------------------------------------------------
  // P. Detail with Optional Fields Missing
  // ---------------------------------------------------------------------------
  describe('P. Detail with Optional Fields Missing', () => {
    it('accepts minimal detail response with missing botanical care fields', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return HttpResponse.json({
            pid: 'minimal plant',
            display_pid: 'Minimal Plant',
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const detail = await client.getPlantDetail('minimal plant');

      expect(detail.data.pid).toBe('minimal plant');
      expect(detail.data.display_pid).toBe('Minimal Plant');
      expect(detail.data.alias).toBeUndefined();
      expect(detail.data.image_url).toBeNull();
      expect(detail.data.min_temp).toBeNull();
      expect(detail.data.watering).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Q. Empty Query Search
  // ---------------------------------------------------------------------------
  describe('Q. Empty Query Search', () => {
    it('does not perform fetch and returns empty results array on empty or whitespace query', async () => {
      let fetchTriggered = false;

      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          fetchTriggered = true;
          return HttpResponse.json({ count: 0, results: [] });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);

      const res1 = await client.searchPlants('');
      const res2 = await client.searchPlants('   ');

      expect(fetchTriggered).toBe(false);
      expect(res1.results).toEqual([]);
      expect(res1.count).toBe(0);
      expect(res2.results).toEqual([]);
      expect(res2.count).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // R. Secret Sanitization
  // ---------------------------------------------------------------------------
  describe('R. Secret Sanitization', () => {
    it('does not expose access token in any error messages', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          return new HttpResponse('Unauthorized', { status: 401 });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.searchPlants('ficus').catch((e) => e);

      expect((err as Error).message).not.toContain(TEST_TOKEN);
    });
  });

  // ---------------------------------------------------------------------------
  // S. Authorization Error (401 & 403 -> AUTH_ERROR)
  // ---------------------------------------------------------------------------
  describe('S. Authorization Error (HTTP 401 & 403 -> AUTH_ERROR)', () => {
    it('throws OpenPlantbookAuthorizationError with code AUTH_ERROR on HTTP 401', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/search`, () => {
          return new HttpResponse(JSON.stringify({ detail: 'Invalid token.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.searchPlants('monstera').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookAuthorizationError);
      expect((err as OpenPlantbookAuthorizationError).code).toBe('AUTH_ERROR');
      expect((err as OpenPlantbookAuthorizationError).statusCode).toBe(401);
      expect((err as Error).message).not.toContain(TEST_TOKEN);
    });

    it('throws OpenPlantbookAuthorizationError with code AUTH_ERROR on HTTP 403', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return new HttpResponse(JSON.stringify({ detail: 'Forbidden.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.getPlantDetail('monstera deliciosa').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookAuthorizationError);
      expect((err as OpenPlantbookAuthorizationError).code).toBe('AUTH_ERROR');
      expect((err as OpenPlantbookAuthorizationError).statusCode).toBe(403);
      expect((err as Error).message).not.toContain(TEST_TOKEN);
    });
  });

  // ---------------------------------------------------------------------------
  // T. Detail PID Mandatory Validation
  // ---------------------------------------------------------------------------
  describe('T. Detail PID Mandatory Validation', () => {
    it('throws OpenPlantbookResponseError when detail response 200 is missing pid field', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return HttpResponse.json({
            display_pid: 'Monstera deliciosa',
            min_temp: 15,
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.getPlantDetail('monstera deliciosa').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookResponseError);
      expect((err as OpenPlantbookResponseError).code).toBe('INVALID_RESPONSE');
      expect((err as Error).message).toContain('pid');
    });

    it('throws OpenPlantbookResponseError when pid is null', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return HttpResponse.json({
            pid: null,
            display_pid: 'Monstera deliciosa',
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.getPlantDetail('monstera deliciosa').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookResponseError);
      expect((err as OpenPlantbookResponseError).code).toBe('INVALID_RESPONSE');
    });

    it('throws OpenPlantbookResponseError when pid is an empty string', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return HttpResponse.json({
            pid: '   ',
            display_pid: 'Monstera deliciosa',
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.getPlantDetail('monstera deliciosa').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookResponseError);
      expect((err as OpenPlantbookResponseError).code).toBe('INVALID_RESPONSE');
    });

    it('throws OpenPlantbookResponseError when pid is not a string (e.g. number)', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return HttpResponse.json({
            pid: 12345,
            display_pid: 'Monstera deliciosa',
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const err = await client.getPlantDetail('monstera deliciosa').catch((e) => e);

      expect(err).toBeInstanceOf(OpenPlantbookResponseError);
      expect((err as OpenPlantbookResponseError).code).toBe('INVALID_RESPONSE');
    });

    it('succeeds when detail response contains only pid', async () => {
      server.use(
        http.get(`${TEST_BASE_URL}/api/v1/plant/detail/:pid/`, () => {
          return HttpResponse.json({
            pid: 'monstera deliciosa',
          });
        })
      );

      const client = new OpenPlantbookClient(mockTokenManager, TEST_BASE_URL);
      const detail = await client.getPlantDetail('monstera deliciosa');

      expect(detail.data.pid).toBe('monstera deliciosa');
      expect(detail.data.display_pid).toBeUndefined();
      expect(detail.data.alias).toBeUndefined();
      expect(detail.data.image_url).toBeNull();
    });
  });
});
