import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPlantCareContextUseCase } from '../use-cases/GetPlantCareContextUseCase';
import { IPlantRepository, IPlantOperationalEventRepository, IPhotoRepository } from '../../domain/repositories';
import { PlantEntity, PlantReferenceEntity } from '../../domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';
import { GetPlantLiveTelemetryUseCase } from '../use-cases/GetPlantLiveTelemetryUseCase';

describe('GetPlantCareContextUseCase (ATP-CARE-001)', () => {
  let mockPlantRepo: Partial<IPlantRepository>;
  let mockLiveTelemetryUseCase: Partial<GetPlantLiveTelemetryUseCase>;
  let mockEventRepo: Partial<IPlantOperationalEventRepository>;
  let mockPhotoRepo: Partial<IPhotoRepository>;

  const samplePlant: PlantEntity = {
    id: '0191e4f2-90ab-7000-8000-000000000001',
    permanent_code: 'AT-PL-007',
    common_name: 'Ficus Lyrata',
    scientific_name: 'Ficus lyrata',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    reference: {
      id: 'ref-001',
      provider: 'open_plantbook',
      external_id: 'ficus-lyrata',
      scientific_name: 'Ficus lyrata',
      common_names: ['Fiddle Leaf Fig'],
      reference_care: {
        min_soil_moist: 30,
        max_soil_moist: 60,
      },
      image_url: null,
      raw_data: {},
      fetched_at: new Date(),
      last_sync_at: new Date(),
    } as PlantReferenceEntity,
  };

  beforeEach(() => {
    mockPlantRepo = {
      findById: vi.fn().mockResolvedValue(samplePlant),
      findByPermanentCode: vi.fn().mockResolvedValue(samplePlant),
    };
    mockLiveTelemetryUseCase = {
      execute: vi.fn().mockResolvedValue({
        plant_id: samplePlant.id,
        permanent_code: samplePlant.permanent_code,
        binding_configured: true,
        available: true,
        moisture: {
          value: 45,
          unit: '%',
          visual_state: 'normal',
          last_updated: '2026-09-13T12:00:00Z',
          available: true,
        },
        hardware: {
          battery: 90,
          online: true,
          stale: false,
          last_seen: '2026-09-13T12:00:00Z',
          available: true,
        },
      }),
    };
    mockEventRepo = {
      findRecentByPlantId: vi.fn().mockResolvedValue([
        {
          id: 'ev-1',
          plant_id: samplePlant.id,
          source: 'HOME_ASSISTANT',
          event_type: 'SOIL_MOISTURE_LOW',
          event_key: 'ev-key-1',
          occurred_at: new Date('2026-09-12T10:00:00Z'),
          received_at: new Date('2026-09-12T10:00:00Z'),
          value_number: 18,
          value_text: null,
          unit: '%',
          metadata: null,
          created_at: new Date('2026-09-12T10:00:00Z'),
        },
      ]),
    };
    mockPhotoRepo = {
      findPrimaryByPlant: vi.fn().mockResolvedValue({
        id: 'photo-1',
        plant_id: samplePlant.id,
        file_path: '/photos/at-pl-007.webp',
        file_name: 'ficus.webp',
        mime_type: 'image/webp',
        file_size: 1024,
        is_primary: true,
        caption: 'Nueva hoja en desarrollo',
        created_at: new Date('2026-09-10T12:00:00Z'),
      }),
    };
  });

  it('validates plantId and throws PlantValidationError when empty', async () => {
    const useCase = new GetPlantCareContextUseCase(mockPlantRepo as IPlantRepository);
    await expect(useCase.executeByPlantId('')).rejects.toThrow(PlantValidationError);
  });

  it('validates permanentCode and throws PlantValidationError when empty', async () => {
    const useCase = new GetPlantCareContextUseCase(mockPlantRepo as IPlantRepository);
    await expect(useCase.executeByPermanentCode('   ')).rejects.toThrow(PlantValidationError);
  });

  it('throws PlantNotFoundError when plant is not found', async () => {
    mockPlantRepo.findById = vi.fn().mockResolvedValue(null);
    const useCase = new GetPlantCareContextUseCase(mockPlantRepo as IPlantRepository);
    await expect(useCase.executeByPlantId('non-existent')).rejects.toThrow(PlantNotFoundError);
  });

  it('executes successfully by plantId aggregating telemetry, events, and photo context', async () => {
    const useCase = new GetPlantCareContextUseCase(
      mockPlantRepo as IPlantRepository,
      mockLiveTelemetryUseCase as GetPlantLiveTelemetryUseCase,
      mockEventRepo as IPlantOperationalEventRepository,
      mockPhotoRepo as IPhotoRepository
    );

    const result = await useCase.executeByPlantId(samplePlant.id);

    expect(result.plant_id).toBe(samplePlant.id);
    expect(result.permanent_code).toBe(samplePlant.permanent_code);
    expect(result.assessment.status).toBe('OK');
    expect(result.current_conditions.soil_moisture.value).toBe(45);
    expect(result.recent_context.last_operational_events).toHaveLength(1);
    expect(result.recent_context.recent_photo_caption).toBe('Nueva hoja en desarrollo');
  });

  it('executes successfully by permanentCode', async () => {
    const useCase = new GetPlantCareContextUseCase(
      mockPlantRepo as IPlantRepository,
      mockLiveTelemetryUseCase as GetPlantLiveTelemetryUseCase,
      mockEventRepo as IPlantOperationalEventRepository,
      mockPhotoRepo as IPhotoRepository
    );

    const result = await useCase.executeByPermanentCode('AT-PL-007');

    expect(result.plant_id).toBe(samplePlant.id);
    expect(result.permanent_code).toBe('AT-PL-007');
  });

  it('resiliently handles telemetry fetch errors without failing the use case', async () => {
    mockLiveTelemetryUseCase.execute = vi.fn().mockRejectedValue(new Error('HA Network timeout'));

    const useCase = new GetPlantCareContextUseCase(
      mockPlantRepo as IPlantRepository,
      mockLiveTelemetryUseCase as GetPlantLiveTelemetryUseCase,
      mockEventRepo as IPlantOperationalEventRepository,
      mockPhotoRepo as IPhotoRepository
    );

    const result = await useCase.executeByPlantId(samplePlant.id);

    expect(result.assessment.status).toBe('OK');
    expect(result.data_quality.has_telemetry).toBe(false);
  });
});
