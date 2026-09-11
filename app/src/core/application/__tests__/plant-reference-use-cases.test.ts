import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetOrCreatePlantReferenceUseCase,
} from '../use-cases/GetOrCreatePlantReferenceUseCase';
import {
  IPlantReferenceRepository,
  CreatePlantReferencePersistenceDTO,
} from '@/core/domain/repositories';
import { IOpenPlantbookClient } from '@/core/domain/services/IOpenPlantbookClient';
import { IPlantReferenceMapper } from '@/core/domain/services/IPlantReferenceMapper';
import { PlantReferenceEntity, OPEN_PLANTBOOK_PROVIDER } from '@/core/domain/entities';
import { PlantReferenceValidationError } from '../errors';
import { OpenPlantbookPlantNotFoundError } from '@/core/domain/errors';

describe('GetOrCreatePlantReferenceUseCase (ATP-IMP-023)', () => {
  const fixedDate = new Date('2026-09-10T15:00:00.000Z');

  let mockRepo: IPlantReferenceRepository;
  let mockClient: IOpenPlantbookClient;
  let mockMapper: IPlantReferenceMapper;
  let useCase: GetOrCreatePlantReferenceUseCase;

  const samplePersistenceDto: CreatePlantReferencePersistenceDTO = {
    provider: OPEN_PLANTBOOK_PROVIDER,
    external_id: 'monstera deliciosa',
    scientific_name: 'Monstera deliciosa',
    common_names: ['Costilla de Adán'],
    reference_care: { min_temp: 15, max_temp: 30 },
    image_url: 'https://open.plantbook.io/images/monstera.jpg',
    fetched_at: fixedDate,
    last_sync_at: fixedDate,
    raw_data: { pid: 'monstera deliciosa' },
  };

  const sampleEntity: PlantReferenceEntity = {
    id: '01918a00-1111-7000-8000-000000000001',
    provider: samplePersistenceDto.provider,
    external_id: samplePersistenceDto.external_id,
    scientific_name: samplePersistenceDto.scientific_name,
    common_names: samplePersistenceDto.common_names ?? null,
    reference_care: samplePersistenceDto.reference_care ?? null,
    image_url: samplePersistenceDto.image_url ?? null,
    fetched_at: samplePersistenceDto.fetched_at ?? fixedDate,
    last_sync_at: samplePersistenceDto.last_sync_at ?? fixedDate,
    raw_data: samplePersistenceDto.raw_data,
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

    mockMapper = {
      toPersistenceDTO: vi.fn(),
    };

    useCase = new GetOrCreatePlantReferenceUseCase(
      mockRepo,
      mockClient,
      mockMapper,
      () => fixedDate
    );
  });

  it('J. creates and persists a new reference when it does not exist locally (calls client + mapper + repo)', async () => {
    const detailResponse = {
      data: {
        pid: 'monstera deliciosa',
        display_pid: 'Monstera deliciosa',
        alias: 'Costilla de Adán',
        image_url: 'https://open.plantbook.io/images/monstera.jpg',
        min_temp: 15,
        max_temp: 30,
      },
      raw: { pid: 'monstera deliciosa', vendor: 'open_plantbook' },
    };

    vi.mocked(mockRepo.findByProviderAndExternalId).mockResolvedValue(null);
    vi.mocked(mockClient.getPlantDetail).mockResolvedValue(detailResponse);
    vi.mocked(mockMapper.toPersistenceDTO).mockReturnValue(samplePersistenceDto);
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
    expect(mockMapper.toPersistenceDTO).toHaveBeenCalledWith(detailResponse, fixedDate);
    expect(mockRepo.create).toHaveBeenCalledWith(samplePersistenceDto);
    expect(result).toBe(sampleEntity);
  });

  it('K. returns existing snapshot without calling client or mapper (Local-First)', async () => {
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
    expect(mockMapper.toPersistenceDTO).not.toHaveBeenCalled();
    expect(mockRepo.create).not.toHaveBeenCalled();
    expect(result).toBe(sampleEntity);
  });

  it('L. propagates external provider errors without calling mapper or persisting', async () => {
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

    expect(mockMapper.toPersistenceDTO).not.toHaveBeenCalled();
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('M. does not persist in repository if mapper throws an error', async () => {
    vi.mocked(mockRepo.findByProviderAndExternalId).mockResolvedValue(null);
    vi.mocked(mockClient.getPlantDetail).mockResolvedValue({
      data: { pid: 'corrupted-plant' },
      raw: {},
    });
    vi.mocked(mockMapper.toPersistenceDTO).mockImplementation(() => {
      throw new Error('Mapping failure');
    });

    await expect(
      useCase.execute({
        provider: 'OPEN_PLANTBOOK',
        external_id: 'corrupted-plant',
      })
    ).rejects.toThrow('Mapping failure');

    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('N. handles case-insensitive provider normalization', async () => {
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

  it('O. throws PlantReferenceValidationError on empty provider or external_id', async () => {
    await expect(
      useCase.execute({ provider: '', external_id: 'monstera' })
    ).rejects.toThrow(PlantReferenceValidationError);

    await expect(
      useCase.execute({ provider: 'OPEN_PLANTBOOK', external_id: '   ' })
    ).rejects.toThrow(PlantReferenceValidationError);
  });

  it('P. throws PlantReferenceValidationError on unsupported provider', async () => {
    vi.mocked(mockRepo.findByProviderAndExternalId).mockResolvedValue(null);

    await expect(
      useCase.execute({ provider: 'UNSUPPORTED_PROVIDER', external_id: 'pid-1' })
    ).rejects.toThrow(/Proveedor botánico no soportado/i);
  });
});

