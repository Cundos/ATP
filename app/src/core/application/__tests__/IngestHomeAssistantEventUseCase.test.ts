import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestHomeAssistantEventUseCase } from '../use-cases/IngestHomeAssistantEventUseCase';
import { IPlantRepository, IPlantOperationalEventRepository } from '@/core/domain/repositories';
import { PlantEntity, PlantOperationalEventEntity } from '@/core/domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';

describe('IngestHomeAssistantEventUseCase (ATP-HA-003)', () => {
  let mockPlantRepo: IPlantRepository;
  let mockEventRepo: IPlantOperationalEventRepository;
  let useCase: IngestHomeAssistantEventUseCase;

  const samplePlant: PlantEntity = {
    id: 'plant-uuid-007',
    permanent_code: 'AT-PL-007',
    common_name: 'Zamioculca',
    scientific_name: 'Zamioculcas zamiifolia',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-09-12T00:00:00.000Z'),
    updated_at: new Date('2026-09-12T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockPlantRepo = {
      findById: vi.fn(),
      findByPermanentCode: vi.fn().mockResolvedValue(samplePlant),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      getNextSequenceValue: vi.fn(),
    };

    mockEventRepo = {
      findByEventKey: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((dto) =>
        Promise.resolve<PlantOperationalEventEntity>({
          id: 'event-uuid-1',
          plant_id: dto.plant_id,
          source: dto.source || 'HOME_ASSISTANT',
          event_type: dto.event_type,
          event_key: dto.event_key,
          occurred_at: dto.occurred_at,
          received_at: dto.received_at || new Date(),
          value_number: dto.value_number ?? null,
          value_text: dto.value_text ?? null,
          unit: dto.unit ?? null,
          metadata: dto.metadata ?? null,
          created_at: new Date(),
        })
      ),
      findRecentByPlantId: vi.fn(),
    };

    useCase = new IngestHomeAssistantEventUseCase(mockPlantRepo, mockEventRepo);
  });

  it('successfully creates an operational event from Home Assistant', async () => {
    const result = await useCase.execute({
      event_id: 'ha-evt-001',
      permanent_code: 'AT-PL-007',
      event_type: 'SOIL_MOISTURE_LOW',
      occurred_at: '2026-09-12T20:00:00.000Z',
      value: 14.5,
      unit: '%',
      metadata: {
        entity_id: 'sensor.humedad_suelo',
        state: '14.5',
        automation_id: 'soil_moisture_alert',
        trigger: 'numeric_state',
        unauthorized_key: 'sensitive_internal_token',
      },
    });

    expect(result.status).toBe('CREATED');
    expect(result.event).toBeDefined();
    expect(result.event.event_key).toBe('home-assistant:ha-evt-001');
    expect(result.event.event_type).toBe('SOIL_MOISTURE_LOW');
    expect(result.event.value_number).toBe(14.5);
    expect(result.event.unit).toBe('%');

    // Verify metadata sanitization allowlist
    expect(result.event.metadata).toEqual({
      entity_id: 'sensor.humedad_suelo',
      state: '14.5',
      automation_id: 'soil_moisture_alert',
      trigger: 'numeric_state',
    });
    expect((result.event.metadata as Record<string, unknown>).unauthorized_key).toBeUndefined();
  });

  it('handles duplicate delivery idempotently without creating a second record', async () => {
    const existingEvent: PlantOperationalEventEntity = {
      id: 'existing-event-id',
      plant_id: 'plant-uuid-007',
      source: 'HOME_ASSISTANT',
      event_type: 'SENSOR_ONLINE',
      event_key: 'home-assistant:ha-evt-002',
      occurred_at: new Date('2026-09-12T20:00:00.000Z'),
      received_at: new Date('2026-09-12T20:00:00.000Z'),
      value_number: null,
      value_text: null,
      unit: null,
      metadata: null,
      created_at: new Date('2026-09-12T20:00:00.000Z'),
    };

    (mockEventRepo.findByEventKey as ReturnType<typeof vi.fn>).mockResolvedValueOnce(existingEvent);

    const result = await useCase.execute({
      event_id: 'ha-evt-002',
      permanent_code: 'AT-PL-007',
      event_type: 'SENSOR_ONLINE',
      occurred_at: '2026-09-12T20:00:00.000Z',
    });

    expect(result.status).toBe('DUPLICATE');
    expect(result.event.id).toBe('existing-event-id');
    expect(mockEventRepo.create).not.toHaveBeenCalled();
  });

  it('correctly handles numeric 0 value and preserves it', async () => {
    const result = await useCase.execute({
      event_id: 'ha-evt-003',
      permanent_code: 'AT-PL-007',
      event_type: 'SOIL_MOISTURE_LOW',
      occurred_at: '2026-09-12T20:00:00.000Z',
      value: 0,
      unit: '%',
    });

    expect(result.status).toBe('CREATED');
    expect(result.event.value_number).toBe(0);
  });

  it('throws PlantNotFoundError if permanent code is not found in catalog', async () => {
    (mockPlantRepo.findByPermanentCode as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        event_id: 'ha-evt-004',
        permanent_code: 'AT-PL-999',
        event_type: 'SENSOR_ONLINE',
        occurred_at: '2026-09-12T20:00:00.000Z',
      })
    ).rejects.toThrow(PlantNotFoundError);
  });

  it('throws PlantValidationError for missing required fields', async () => {
    await expect(
      useCase.execute({
        event_id: '',
        permanent_code: 'AT-PL-007',
        event_type: 'SENSOR_ONLINE',
        occurred_at: '2026-09-12T20:00:00.000Z',
      })
    ).rejects.toThrow(PlantValidationError);

    await expect(
      useCase.execute({
        event_id: 'ha-evt-005',
        permanent_code: '',
        event_type: 'SENSOR_ONLINE',
        occurred_at: '2026-09-12T20:00:00.000Z',
      })
    ).rejects.toThrow(PlantValidationError);
  });

  it('throws PlantValidationError for unsupported event_type', async () => {
    await expect(
      useCase.execute({
        event_id: 'ha-evt-006',
        permanent_code: 'AT-PL-007',
        event_type: 'UNKNOWN_CUSTOM_EVENT_TYPE',
        occurred_at: '2026-09-12T20:00:00.000Z',
      })
    ).rejects.toThrow(/Tipo de evento no permitido/);
  });

  it('throws PlantValidationError for invalid timestamp', async () => {
    await expect(
      useCase.execute({
        event_id: 'ha-evt-007',
        permanent_code: 'AT-PL-007',
        event_type: 'SENSOR_ONLINE',
        occurred_at: 'not-a-valid-date-string',
      })
    ).rejects.toThrow(/no es una fecha válida/);
  });
});
