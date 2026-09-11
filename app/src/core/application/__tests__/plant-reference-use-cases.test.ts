import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetOrCreatePlantReferenceUseCase,
} from '../use-cases/GetOrCreatePlantReferenceUseCase';
import {
  IPlantReferenceRepository,
  CreatePlantReferencePersistenceDTO,
} from '@/core/domain/repositories';
import { IOpenPlantbookClient } from '@/core/domain/services/IOpenPlantbookClient';
import { PlantReferenceEntity } from '@/core/domain/entities';
import { PlantReferenceValidationError } from '../errors';
import { OpenPlantbookPlantNotFoundError } from '@/core/domain/errors';

describe('GetOrCreatePlantReferenceUseCase (ATP-IMP-023)', () => {
  const fixedDate = new Date('2026-09-10T15:00:00.000Z');

  let mockRepo: IPlantReferenceRepository;
  let mockClient: IOpenPlantbookClient;
  let useCase: GetOrCreatePlantReferenceUseCase;

  const sampleEntity: PlantReferenceEntity = {
    id: '01918a00-1111-7000-8000-000000000001',
    provider: 'OPEN_PLANTBOOK',
    external_id: 'monstera deliciosa',
    scientific_name: 'Monstera deliciosa',
    common_names: ['Costilla de Adán'],
    reference_care: { min_temp: 15, max_temp: 30 },
    image_url: 'https://open.plantbook.io/images/monstera.jpg',
    fetched_at: fixedDate,
    last_sync_at: fixedDate,
    raw_data: { pid: 'monstera deliciosa' },
  };

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByProviderAndExternalId: vi.fn(),
      create: vi.fn(),
    };

    mockClient = {
      searchPlants: vi.fn(),
      getPlantDetail: vi.fn(),
    };

    useCase = new GetOrCreatePlantReferenceUseCase(
      mockRepo,
      mockClient,
      () => fixedDate
    );
  });

  it('J. creates and persists a new reference when it does not exist locally', async () => {
    vi.mocked(mockRepo.findByProviderAndExternalId).mockResolvedValue(null);
    vi.mocked(mockClient.getPlantDetail).mockResolvedValue({
      data: {
        pid: 'monstera deliciosa',
        display_pid: 'Monstera deliciosa',
        alias: 'Costilla de Adán',
        image_url: 'https://open.plantbook.io/images/monstera.jpg',
        min_temp: 15,
        max_temp: 30,
      },
      raw: { pid: 'monstera deliciosa', vendor: 'open_plantbook' },
    });
    vi.mocked(mockRepo.create).mockResolvedValue(sampleEntity);

    const result = await useCase.execute({
      provider: 'OPEN_PLANTBOOK',
      external_id: 'monstera deliciosa',
    });

    expect(mockRepo.findByProviderAndExternalId).toHaveBeenCalledWith(
      'OPEN_PLANTBOOK',
      'monstera deliciosa'
    );
    expect(mockClient.getPlantDetail).toHaveBeenCalledWith('monstera deliciosa');
    expect(mockRepo.create).toHaveBeenCalledOnce();
    const createCallArg = vi.mocked(mockRepo.create).mock.calls[0]![0] as CreatePlantReferencePersistenceDTO;
    expect(createCallArg.provider).toBe('OPEN_PLANTBOOK');
    expect(createCallArg.external_id).toBe('monstera deliciosa');
    expect(createCallArg.scientific_name).toBe('Monstera deliciosa');
    expect(createCallArg.common_names).toEqual(['Costilla de Adán']);
    expect(createCallArg.fetched_at).toEqual(fixedDate);
    expect(result).toBe(sampleEntity);
  });

  it('K. returns existing snapshot without calling external client (Local-First)', async () => {
    vi.mocked(mockRepo.findByProviderAndExternalId).mockResolvedValue(sampleEntity);

    const result = await useCase.execute({
      provider: 'OPEN_PLANTBOOK',
      external_id: 'monstera deliciosa',
    });

    expect(mockRepo.findByProviderAndExternalId).toHaveBeenCalledWith(
      'OPEN_PLANTBOOK',
      'monstera deliciosa'
    );
    expect(mockClient.getPlantDetail).not.toHaveBeenCalled();
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(result).toBe(sampleEntity);
  });

  it('L. propagates external provider errors without persisting partial data', async () => {
    vi.mocked(mockRepo.findByProviderAndExternalId).mockResolvedValue(null);
    vi.mocked(mockClient.getPlantDetail).mockRejectedValue(
      new OpenPlantbookPlantNotFoundError('unknown species')
    );

    await expect(
      useCase.execute({
        provider: 'OPEN_PLANTBOOK',
        external_id: 'unknown species',
      })
    ).rejects.toThrow(OpenPlantbookPlantNotFoundError);

    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('M. handles case-insensitive provider normalization', async () => {
    vi.mocked(mockRepo.findByProviderAndExternalId).mockResolvedValue(sampleEntity);

    await useCase.execute({
      provider: '  open_plantbook  ',
      external_id: 'monstera deliciosa',
    });

    expect(mockRepo.findByProviderAndExternalId).toHaveBeenCalledWith(
      'OPEN_PLANTBOOK',
      'monstera deliciosa'
    );
  });

  it('N. throws PlantReferenceValidationError on empty provider or external_id', async () => {
    await expect(
      useCase.execute({ provider: '', external_id: 'monstera' })
    ).rejects.toThrow(PlantReferenceValidationError);

    await expect(
      useCase.execute({ provider: 'OPEN_PLANTBOOK', external_id: '   ' })
    ).rejects.toThrow(PlantReferenceValidationError);
  });

  it('O. throws PlantReferenceValidationError on unsupported provider', async () => {
    vi.mocked(mockRepo.findByProviderAndExternalId).mockResolvedValue(null);

    await expect(
      useCase.execute({ provider: 'UNSUPPORTED_PROVIDER', external_id: 'pid-1' })
    ).rejects.toThrow(/Proveedor botánico no soportado/i);
  });
});
