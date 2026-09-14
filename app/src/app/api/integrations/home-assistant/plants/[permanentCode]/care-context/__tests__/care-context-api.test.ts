import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET,
  verifyBearerToken,
  mapCareContextToResponseDTO,
} from '../route';
import { PlantCareContextDTO } from '@/core/domain/entities';
import * as serviceContainer from '@/infrastructure/services/serviceContainer';
import { PlantNotFoundError } from '@/core/application/errors';
import { GetPlantCareContextUseCase } from '@/core/application/use-cases/GetPlantCareContextUseCase';

describe('Home Assistant Plant Care Context API (ATP-VOICE-001A)', () => {
  const originalSecret = process.env.HOME_ASSISTANT_READ_API_SECRET;
  const testSecret = 'secret_test_read_api_key_12345';

  beforeEach(() => {
    process.env.HOME_ASSISTANT_READ_API_SECRET = testSecret;
  });

  afterEach(() => {
    process.env.HOME_ASSISTANT_READ_API_SECRET = originalSecret;
    vi.restoreAllMocks();
  });

  describe('verifyBearerToken', () => {
    it('returns false when authHeader is null or empty', () => {
      expect(verifyBearerToken(null, testSecret)).toBe(false);
      expect(verifyBearerToken('', testSecret)).toBe(false);
    });

    it('returns false when secret is missing or empty (fail closed)', () => {
      expect(verifyBearerToken(`Bearer ${testSecret}`, undefined)).toBe(false);
      expect(verifyBearerToken(`Bearer ${testSecret}`, '')).toBe(false);
      expect(verifyBearerToken(`Bearer ${testSecret}`, '   ')).toBe(false);
    });

    it('returns false when token scheme is not Bearer', () => {
      expect(verifyBearerToken(`Basic ${testSecret}`, testSecret)).toBe(false);
      expect(verifyBearerToken(`Token ${testSecret}`, testSecret)).toBe(false);
      expect(verifyBearerToken(testSecret, testSecret)).toBe(false);
    });

    it('returns false when token is incorrect', () => {
      expect(verifyBearerToken('Bearer wrong_token', testSecret)).toBe(false);
      expect(verifyBearerToken(`Bearer ${testSecret}_extra`, testSecret)).toBe(false);
    });

    it('returns true when valid Bearer token matches secret', () => {
      expect(verifyBearerToken(`Bearer ${testSecret}`, testSecret)).toBe(true);
      expect(verifyBearerToken(`bearer ${testSecret}`, testSecret)).toBe(true);
    });
  });

  describe('mapCareContextToResponseDTO', () => {
    const fullMockContext: PlantCareContextDTO = {
      plant_id: '0191e4f2-90ab-7000-8000-000000000001', // Should not be leaked
      permanent_code: 'AT-PL-007',
      evaluated_at: '2026-09-13T23:00:00.000Z',
      plant: {
        permanent_code: 'AT-PL-007',
        common_name: 'Zamioculca',
        scientific_name: 'Zamioculcas zamiifolia',
        health_status: 'HEALTHY',
      },
      data_quality: {
        has_telemetry: true,
        has_botanical_reference: true,
        has_recent_events: true,
        has_photos: true,
        warnings: [],
      },
      current_conditions: {
        soil_moisture: {
          value: 42.5,
          unit: '%',
          observed_at: '2026-09-13T22:55:00.000Z',
          min_reference: 30,
          max_reference: 60,
          classification: 'NORMAL',
        },
        sensor_status: 'ONLINE',
        battery: {
          value: 88,
          unit: '%',
          classification: 'NORMAL',
        },
      },
      recent_context: {
        last_operational_events: [],
        last_photo_at: '2026-09-10T12:00:00Z',
        recent_photo_caption: 'Brote nuevo',
      },
      assessment: {
        status: 'OK',
        headline: 'Condiciones de humedad en rango óptimo',
        summary: 'La humedad del sustrato se encuentra dentro del rango adecuado.',
        recommendations: [
          {
            code: 'BOTANICAL_WATERING_GUIDELINE',
            priority: 'LOW',
            title: 'Pauta de riego general',
            explanation: 'Regar cuando el sustrato se seque en los primeros centímetros.',
            evidence: ['Ficha botánica de referencia'],
          },
        ],
      },
    };

    it('maps context cleanly to sanitized public response schema without internal leakage', () => {
      const result = mapCareContextToResponseDTO(fullMockContext, 'AT-PL-007');

      expect(result.schema_version).toBe('1');
      expect(result.plant).toEqual({
        permanent_code: 'AT-PL-007',
        common_name: 'Zamioculca',
        scientific_name: 'Zamioculcas zamiifolia',
      });
      expect(result.care.status).toBe('OK');
      expect(result.care.headline).toBe('Condiciones de humedad en rango óptimo');
      expect(result.care.recommendations).toEqual([
        {
          priority: 'LOW',
          title: 'Pauta de riego general',
          explanation: 'Regar cuando el sustrato se seque en los primeros centímetros.',
        },
      ]);
      expect(result.conditions.soil_moisture).toEqual({
        value: 42.5,
        unit: '%',
        classification: 'NORMAL',
        observed_at: '2026-09-13T22:55:00.000Z',
      });
      expect(result.conditions.sensor_status).toBe('ONLINE');
      expect(result.conditions.battery).toEqual({
        value: 88,
        unit: '%',
      });
      expect(result.data_quality).toEqual({
        telemetry_available: true,
        telemetry_stale: false,
        reference_available: true,
      });

      // Verification: zero leaked internal fields
      const jsonStr = JSON.stringify(result);
      expect(jsonStr).not.toContain('0191e4f2-90ab-7000-8000-000000000001');
      expect(jsonStr).not.toContain('Brote nuevo');
      expect(jsonStr).not.toContain('last_operational_events');
      expect(jsonStr).not.toContain('min_reference');
    });

    it('preserves 0 values for moisture and battery without treating them as falsy or null', () => {
      const zeroContext: PlantCareContextDTO = {
        ...fullMockContext,
        current_conditions: {
          soil_moisture: {
            value: 0,
            unit: '%',
            observed_at: '2026-09-13T22:55:00.000Z',
            min_reference: 20,
            max_reference: 50,
            classification: 'LOW',
          },
          sensor_status: 'ONLINE',
          battery: {
            value: 0,
            unit: '%',
            classification: 'CRITICAL',
          },
        },
      };

      const result = mapCareContextToResponseDTO(zeroContext, 'AT-PL-007');

      expect(result.conditions.soil_moisture.value).toBe(0);
      expect(result.conditions.battery.value).toBe(0);
    });
  });

  describe('GET Route Handler', () => {
    function createRequest(options?: { auth?: string }): NextRequest {
      const headers = new Headers();
      if (options?.auth !== undefined) {
        headers.set('authorization', options.auth);
      }
      return new NextRequest('http://localhost:3000/api/integrations/home-assistant/plants/AT-PL-007/care-context', {
        method: 'GET',
        headers,
      });
    }

    it('returns 401 when authorization header is missing', async () => {
      const req = createRequest();
      const res = await GET(req, { params: Promise.resolve({ permanentCode: 'AT-PL-007' }) });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('No autorizado');
    });

    it('returns 401 when authorization token is invalid', async () => {
      const req = createRequest({ auth: 'Bearer wrong_token' });
      const res = await GET(req, { params: Promise.resolve({ permanentCode: 'AT-PL-007' }) });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('No autorizado');
    });

    it('returns 400 when permanentCode is not in AT-PL-XXX format', async () => {
      const req = createRequest({ auth: `Bearer ${testSecret}` });
      const res = await GET(req, { params: Promise.resolve({ permanentCode: 'INVALID-CODE' }) });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Código permanente inválido');
    });

    it('returns 400 when an internal UUID is provided instead of permanentCode', async () => {
      const req = createRequest({ auth: `Bearer ${testSecret}` });
      const res = await GET(req, {
        params: Promise.resolve({ permanentCode: '0191e4f2-90ab-7000-8000-000000000001' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Código permanente inválido');
    });

    it('returns 404 when plant does not exist', async () => {
      const mockUseCase = {
        executeByPermanentCode: vi.fn().mockRejectedValue(new PlantNotFoundError('AT-PL-999')),
      };
      vi.spyOn(serviceContainer, 'getPlantCareContextUseCase').mockReturnValue(mockUseCase as unknown as GetPlantCareContextUseCase);

      const req = createRequest({ auth: `Bearer ${testSecret}` });
      const res = await GET(req, { params: Promise.resolve({ permanentCode: 'AT-PL-999' }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Ejemplar no encontrado');
    });

    it('returns 200 with sanitized care context when permanentCode is valid and found', async () => {
      const mockCareContext: PlantCareContextDTO = {
        permanent_code: 'AT-PL-007',
        evaluated_at: '2026-09-13T23:00:00.000Z',
        plant: {
          permanent_code: 'AT-PL-007',
          common_name: 'Zamioculca',
          scientific_name: 'Zamioculcas zamiifolia',
          health_status: 'HEALTHY',
        },
        data_quality: {
          has_telemetry: true,
          has_botanical_reference: true,
          has_recent_events: false,
          has_photos: true,
          warnings: [],
        },
        current_conditions: {
          soil_moisture: {
            value: 45,
            unit: '%',
            observed_at: '2026-09-13T22:50:00.000Z',
            min_reference: 30,
            max_reference: 60,
            classification: 'NORMAL',
          },
          sensor_status: 'ONLINE',
          battery: {
            value: 90,
            unit: '%',
            classification: 'NORMAL',
          },
        },
        recent_context: {
          last_operational_events: [],
        },
        assessment: {
          status: 'OK',
          headline: 'Condiciones de humedad en rango óptimo',
          summary: 'La humedad está en rango.',
          recommendations: [],
        },
      };

      const mockUseCase = {
        executeByPermanentCode: vi.fn().mockResolvedValue(mockCareContext),
      };
      vi.spyOn(serviceContainer, 'getPlantCareContextUseCase').mockReturnValue(mockUseCase as unknown as GetPlantCareContextUseCase);

      const req = createRequest({ auth: `Bearer ${testSecret}` });
      const res = await GET(req, { params: Promise.resolve({ permanentCode: 'AT-PL-007' }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.schema_version).toBe('1');
      expect(data.plant.permanent_code).toBe('AT-PL-007');
      expect(data.care.status).toBe('OK');
      expect(data.conditions.soil_moisture.value).toBe(45);
      expect(data.data_quality.telemetry_available).toBe(true);
    });

    it('returns 200 with degraded status when telemetry is offline without failing the endpoint', async () => {
      const mockDegradedContext: PlantCareContextDTO = {
        permanent_code: 'AT-PL-007',
        evaluated_at: '2026-09-13T23:00:00.000Z',
        plant: {
          permanent_code: 'AT-PL-007',
          common_name: 'Zamioculca',
          scientific_name: 'Zamioculcas zamiifolia',
          health_status: 'HEALTHY',
        },
        data_quality: {
          has_telemetry: false,
          has_botanical_reference: true,
          has_recent_events: false,
          has_photos: false,
          warnings: ['Sensor fuera de línea'],
        },
        current_conditions: {
          soil_moisture: {
            value: null,
            unit: '%',
            observed_at: null,
            min_reference: 30,
            max_reference: 60,
            classification: 'UNKNOWN',
          },
          sensor_status: 'OFFLINE',
          battery: {
            value: null,
            unit: '%',
            classification: 'UNKNOWN',
          },
        },
        recent_context: {
          last_operational_events: [],
        },
        assessment: {
          status: 'WATCH',
          headline: 'Sensor de monitoreo fuera de línea',
          summary: 'No se reciben lecturas.',
          recommendations: [
            {
              code: 'CHECK_SENSOR_CONNECTIVITY',
              priority: 'HIGH',
              title: 'Verificar conexión del sensor',
              explanation: 'El sensor está fuera de línea.',
              evidence: ['Sensor OFFLINE'],
            },
          ],
        },
      };

      const mockUseCase = {
        executeByPermanentCode: vi.fn().mockResolvedValue(mockDegradedContext),
      };
      vi.spyOn(serviceContainer, 'getPlantCareContextUseCase').mockReturnValue(mockUseCase as unknown as GetPlantCareContextUseCase);

      const req = createRequest({ auth: `Bearer ${testSecret}` });
      const res = await GET(req, { params: Promise.resolve({ permanentCode: 'AT-PL-007' }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.care.status).toBe('WATCH');
      expect(data.conditions.sensor_status).toBe('OFFLINE');
      expect(data.data_quality.telemetry_available).toBe(false);
      expect(data.care.recommendations[0].title).toBe('Verificar conexión del sensor');
    });
  });
});
