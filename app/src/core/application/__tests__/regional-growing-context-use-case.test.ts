import { describe, it, expect, vi } from 'vitest';
import { GetRegionalGrowingContextUseCase } from '../use-cases/GetRegionalGrowingContextUseCase';
import { IGrowingRegionRepository } from '@/core/domain/repositories';
import { GrowingRegionEntity } from '@/core/domain/entities';
import { RegionalFloraValidationError } from '../errors';

describe('ATP-ECO-001C: GetRegionalGrowingContextUseCase', () => {
  const mockGrowingRegion: GrowingRegionEntity = {
    id: 'gr-arroyito',
    code: 'ARROYITO_CBA',
    name: 'Arroyito y alrededores',
    country: 'Argentina',
    province: 'Córdoba',
    locality: 'Arroyito',
    latitude: -31.42,
    longitude: -63.05,
    description: 'Región semiárida templada del Espinal',
    created_at: new Date(),
    updated_at: new Date(),
    ecological_regions: [
      {
        growing_region_id: 'gr-arroyito',
        ecological_region_id: 'eco-espinal',
        is_primary: true,
        notes: null,
        created_at: new Date(),
        ecological_region: {
          id: 'eco-espinal',
          code: 'ESPINAL_ALGARROBO',
          name: 'Espinal (Distrito del Algarrobo)',
          biome: 'Bosque xerófilo caducifolio',
          description: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
    ],
  };

  it('retorna la región geográfica por defecto (ARROYITO_CBA) cuando no se pasa código', async () => {
    const mockRepo: IGrowingRegionRepository = {
      findById: vi.fn(),
      findByCode: vi.fn().mockResolvedValue(mockGrowingRegion),
      findAll: vi.fn(),
      create: vi.fn(),
      linkEcologicalRegion: vi.fn(),
    };

    const useCase = new GetRegionalGrowingContextUseCase(mockRepo);
    const result = await useCase.execute({});

    expect(mockRepo.findByCode).toHaveBeenCalledWith('ARROYITO_CBA');
    expect(result).toEqual(mockGrowingRegion);
  });

  it('permite buscar por growing_region_id si está provisto', async () => {
    const mockRepo: IGrowingRegionRepository = {
      findById: vi.fn().mockResolvedValue(mockGrowingRegion),
      findByCode: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      linkEcologicalRegion: vi.fn(),
    };

    const useCase = new GetRegionalGrowingContextUseCase(mockRepo);
    const result = await useCase.execute({ growing_region_id: 'gr-arroyito' });

    expect(mockRepo.findById).toHaveBeenCalledWith('gr-arroyito');
    expect(result).toEqual(mockGrowingRegion);
  });

  it('lanza error de validación si los parámetros son inválidos', async () => {
    const mockRepo: IGrowingRegionRepository = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      linkEcologicalRegion: vi.fn(),
    };

    const useCase = new GetRegionalGrowingContextUseCase(mockRepo);
    await expect(useCase.execute({ growing_region_code: '   ' })).rejects.toThrow(
      RegionalFloraValidationError
    );
  });
});
