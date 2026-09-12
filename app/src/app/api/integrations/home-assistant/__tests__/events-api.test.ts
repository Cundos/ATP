import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../events/route';
import * as serviceContainer from '@/infrastructure/services/serviceContainer';
import { IngestHomeAssistantEventUseCase } from '@/core/application/use-cases/IngestHomeAssistantEventUseCase';
import { PlantValidationError, PlantNotFoundError } from '@/core/application/errors';

describe('POST /api/integrations/home-assistant/events (ATP-HA-003)', () => {
  const originalEnv = process.env;
  const testSecret = 'secret_webhook_test_token_12345';

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, HOME_ASSISTANT_WEBHOOK_SECRET: testSecret };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  function createRequest(body: unknown, authHeader?: string): NextRequest {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (authHeader !== undefined) {
      headers['authorization'] = authHeader;
    }

    return new NextRequest('http://localhost:3000/api/integrations/home-assistant/events', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  it('rejects requests without authorization header with 401', async () => {
    const req = createRequest({ permanent_code: 'AT-PL-007' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('No autorizado');
  });

  it('rejects requests with invalid token with 401', async () => {
    const req = createRequest({ permanent_code: 'AT-PL-007' }, 'Bearer wrong-secret-token');
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('No autorizado');
  });

  it('rejects invalid JSON body with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/integrations/home-assistant/events', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${testSecret}`,
        'content-type': 'application/json',
      },
      body: '{ invalid-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 201 when event is successfully created', async () => {
    const mockUseCase = {
      execute: vi.fn().mockResolvedValue({
        status: 'CREATED',
        event: {
          id: 'event-uuid-1',
          plant_id: 'plant-uuid-007',
          source: 'HOME_ASSISTANT',
          event_type: 'SOIL_MOISTURE_LOW',
          event_key: 'home-assistant:ha-001',
          occurred_at: new Date('2026-09-12T20:00:00.000Z'),
          received_at: new Date('2026-09-12T20:00:00.000Z'),
          value_number: 14.2,
          value_text: null,
          unit: '%',
          metadata: { entity_id: 'sensor.humedad_suelo' },
          created_at: new Date(),
        },
      }),
    };

    vi.spyOn(serviceContainer, 'getIngestHomeAssistantEventUseCase').mockReturnValue(
      mockUseCase as unknown as IngestHomeAssistantEventUseCase
    );

    const payload = {
      event_id: 'ha-001',
      permanent_code: 'AT-PL-007',
      event_type: 'SOIL_MOISTURE_LOW',
      occurred_at: '2026-09-12T20:00:00.000Z',
      value: 14.2,
      unit: '%',
      metadata: { entity_id: 'sensor.humedad_suelo' },
    };

    const req = createRequest(payload, `Bearer ${testSecret}`);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('CREATED');
    expect(data.event.id).toBe('event-uuid-1');
  });

  it('returns 200 when event is already recorded (idempotent duplicate)', async () => {
    const mockUseCase = {
      execute: vi.fn().mockResolvedValue({
        status: 'DUPLICATE',
        event: {
          id: 'event-uuid-1',
          plant_id: 'plant-uuid-007',
          source: 'HOME_ASSISTANT',
          event_type: 'SOIL_MOISTURE_LOW',
          event_key: 'home-assistant:ha-001',
          occurred_at: new Date('2026-09-12T20:00:00.000Z'),
          received_at: new Date('2026-09-12T20:00:00.000Z'),
          value_number: 14.2,
          value_text: null,
          unit: '%',
          metadata: null,
          created_at: new Date(),
        },
      }),
    };

    vi.spyOn(serviceContainer, 'getIngestHomeAssistantEventUseCase').mockReturnValue(
      mockUseCase as unknown as IngestHomeAssistantEventUseCase
    );

    const payload = {
      event_id: 'ha-001',
      permanent_code: 'AT-PL-007',
      event_type: 'SOIL_MOISTURE_LOW',
      occurred_at: '2026-09-12T20:00:00.000Z',
    };

    const req = createRequest(payload, `Bearer ${testSecret}`);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('DUPLICATE');
  });

  it('returns 404 when plant does not exist', async () => {
    const mockUseCase = {
      execute: vi.fn().mockRejectedValue(new PlantNotFoundError('AT-PL-999')),
    };

    vi.spyOn(serviceContainer, 'getIngestHomeAssistantEventUseCase').mockReturnValue(
      mockUseCase as unknown as IngestHomeAssistantEventUseCase
    );

    const payload = {
      event_id: 'ha-001',
      permanent_code: 'AT-PL-999',
      event_type: 'SOIL_MOISTURE_LOW',
      occurred_at: '2026-09-12T20:00:00.000Z',
    };

    const req = createRequest(payload, `Bearer ${testSecret}`);
    const res = await POST(req);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 400 when validation fails', async () => {
    const mockUseCase = {
      execute: vi.fn().mockRejectedValue(new PlantValidationError('Tipo de evento no permitido')),
    };

    vi.spyOn(serviceContainer, 'getIngestHomeAssistantEventUseCase').mockReturnValue(
      mockUseCase as unknown as IngestHomeAssistantEventUseCase
    );

    const payload = {
      event_id: 'ha-001',
      permanent_code: 'AT-PL-007',
      event_type: 'INVALID_TYPE',
      occurred_at: '2026-09-12T20:00:00.000Z',
    };

    const req = createRequest(payload, `Bearer ${testSecret}`);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Tipo de evento no permitido');
  });
});
