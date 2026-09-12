import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPlantLiveTelemetryUseCase } from '../use-cases/GetPlantLiveTelemetryUseCase';
import { IPlantRepository, IPlantHomeAssistantBindingRepository } from '@/core/domain/repositories';
import { IHomeAssistantClient, HomeAssistantState } from '@/core/domain/services';
import { PlantEntity, PlantHomeAssistantBindingEntity } from '@/core/domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';

describe('GetPlantLiveTelemetryUseCase (ATP-HA-002)', () => {
  let mockPlantRepo: IPlantRepository;
  let mockBindingRepo: IPlantHomeAssistantBindingRepository;
  let mockHaClient: IHomeAssistantClient;
  let useCase: GetPlantLiveTelemetryUseCase;

  const sampleBinding: PlantHomeAssistantBindingEntity = {
    id: '01a097c0-593f-77e2-96e6-4a61312faf4f',
    plant_id: 'plant-uuid-007',
    moisture_entity_id: 'sensor.humedad_suelo',
    battery_entity_id: 'sensor.bateria_sensor_humedad_beta',
    online_entity_id: 'binary_sensor.sensor_humedad_beta_online',
    stale_entity_id: 'binary_sensor.sensor_humedad_beta_lectura_desactualizada',
    visual_state_entity_id: 'sensor.humedad_suelo_estado_visual',
    created_at: new Date('2026-09-12T00:00:00.000Z'),
    updated_at: new Date('2026-09-12T00:00:00.000Z'),
  };

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
    ha_binding: sampleBinding,
  };

  beforeEach(() => {
    mockPlantRepo = {
      findById: vi.fn().mockResolvedValue(samplePlant),
      findByPermanentCode: vi.fn().mockResolvedValue(samplePlant),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      getNextSequenceValue: vi.fn(),
    };

    mockBindingRepo = {
      findByPlantId: vi.fn().mockResolvedValue(sampleBinding),
      findByPermanentCode: vi.fn().mockResolvedValue(sampleBinding),
      upsert: vi.fn(),
      deleteByPlantId: vi.fn(),
    };

    mockHaClient = {
      getState: vi.fn(),
    };

    useCase = new GetPlantLiveTelemetryUseCase(mockPlantRepo, mockHaClient, mockBindingRepo);
  });

  it('validates input and throws PlantValidationError for empty id/code', async () => {
    await expect(useCase.executeByPlantId('')).rejects.toThrow(PlantValidationError);
    await expect(useCase.executeByPermanentCode('   ')).rejects.toThrow(PlantValidationError);
  });

  it('throws PlantNotFoundError if plant does not exist', async () => {
    (mockPlantRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    (mockPlantRepo.findByPermanentCode as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    await expect(useCase.executeByPlantId('non-existent')).rejects.toThrow(PlantNotFoundError);
    await expect(useCase.executeByPermanentCode('AT-PL-999')).rejects.toThrow(PlantNotFoundError);
  });

  it('returns unconfigured telemetry when plant has no ha_binding', async () => {
    const unconfiguredPlant: PlantEntity = {
      ...samplePlant,
      id: 'plant-uuid-001',
      permanent_code: 'AT-PL-001',
      ha_binding: null,
    };
    (mockBindingRepo.findByPlantId as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const result = await useCase.execute(unconfiguredPlant);

    expect(result.binding_configured).toBe(false);
    expect(result.available).toBe(false);
    expect(result.moisture).toBeNull();
    expect(result.hardware).toBeNull();
  });

  it('successfully retrieves and transforms full live telemetry', async () => {
    (mockHaClient.getState as ReturnType<typeof vi.fn>).mockImplementation((entityId: string) => {
      switch (entityId) {
        case 'sensor.humedad_suelo':
          return Promise.resolve<HomeAssistantState>({
            entityId,
            state: '45.8',
            unit: '%',
            lastChanged: '2026-09-12T19:00:00.000Z',
            lastUpdated: '2026-09-12T19:00:00.000Z',
          });
        case 'sensor.humedad_suelo_estado_visual':
          return Promise.resolve<HomeAssistantState>({
            entityId,
            state: 'Óptimo',
            lastChanged: '2026-09-12T19:00:00.000Z',
            lastUpdated: '2026-09-12T19:00:00.000Z',
          });
        case 'sensor.bateria_sensor_humedad_beta':
          return Promise.resolve<HomeAssistantState>({
            entityId,
            state: '88',
            unit: '%',
            lastChanged: '2026-09-12T19:00:00.000Z',
            lastUpdated: '2026-09-12T19:00:00.000Z',
          });
        case 'binary_sensor.sensor_humedad_beta_online':
          return Promise.resolve<HomeAssistantState>({
            entityId,
            state: 'on',
            lastChanged: '2026-09-12T19:00:00.000Z',
            lastUpdated: '2026-09-12T19:00:00.000Z',
          });
        case 'binary_sensor.sensor_humedad_beta_lectura_desactualizada':
          return Promise.resolve<HomeAssistantState>({
            entityId,
            state: 'off',
            lastChanged: '2026-09-12T19:00:00.000Z',
            lastUpdated: '2026-09-12T19:00:00.000Z',
          });
        default:
          return Promise.reject(new Error(`Unknown entity: ${entityId}`));
      }
    });

    const result = await useCase.execute(samplePlant);

    expect(result.binding_configured).toBe(true);
    expect(result.available).toBe(true);
    expect(result.error_reason).toBeNull();

    // Moisture assertions
    expect(result.moisture).toBeDefined();
    expect(result.moisture?.value).toBe(45.8);
    expect(result.moisture?.unit).toBe('%');
    expect(result.moisture?.visual_state).toBe('Óptimo');
    expect(result.moisture?.available).toBe(true);

    // Hardware assertions
    expect(result.hardware).toBeDefined();
    expect(result.hardware?.battery).toBe(88);
    expect(result.hardware?.online).toBe(true);
    expect(result.hardware?.stale).toBe(false);
    expect(result.hardware?.available).toBe(true);
  });

  it('correctly handles zero (0) moisture value and preserves it as valid numeric state', async () => {
    (mockHaClient.getState as ReturnType<typeof vi.fn>).mockImplementation((entityId: string) => {
      if (entityId === 'sensor.humedad_suelo') {
        return Promise.resolve<HomeAssistantState>({
          entityId,
          state: '0',
          unit: '%',
          lastChanged: '2026-09-12T19:00:00.000Z',
          lastUpdated: '2026-09-12T19:00:00.000Z',
        });
      }
      return Promise.reject(new Error('unavailable'));
    });

    const result = await useCase.execute(samplePlant);

    expect(result.binding_configured).toBe(true);
    expect(result.available).toBe(true);
    expect(result.moisture?.value).toBe(0);
    expect(result.moisture?.available).toBe(true);
  });

  it('degrades gracefully when Home Assistant is entirely offline or errors out', async () => {
    (mockHaClient.getState as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection refused / 503 Service Unavailable')
    );

    const result = await useCase.execute(samplePlant);

    expect(result.binding_configured).toBe(true);
    expect(result.available).toBe(false);
    expect(result.moisture).toBeNull();
    expect(result.hardware).toBeNull();
    expect(result.error_reason).toBe('Home Assistant no disponible');
  });

  it('handles partial telemetry availability when some sensors fail', async () => {
    (mockHaClient.getState as ReturnType<typeof vi.fn>).mockImplementation((entityId: string) => {
      if (entityId === 'sensor.humedad_suelo') {
        return Promise.resolve<HomeAssistantState>({
          entityId,
          state: '52.1',
          unit: '%',
          lastChanged: '2026-09-12T19:00:00.000Z',
          lastUpdated: '2026-09-12T19:00:00.000Z',
        });
      }
      return Promise.reject(new Error('Entity not found'));
    });

    const result = await useCase.execute(samplePlant);

    expect(result.binding_configured).toBe(true);
    expect(result.available).toBe(true);
    expect(result.moisture?.value).toBe(52.1);
    expect(result.hardware?.battery).toBeNull();
  });
});
