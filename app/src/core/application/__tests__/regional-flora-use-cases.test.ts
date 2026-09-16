import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetSeasonalRegionalFloraUseCase,
  GetNativeRegionalFloraUseCase,
} from '../index';
import { RegionalFloraValidationError } from '../errors';
import { IRegionalFloraRepository } from '@/core/domain/repositories';

describe('Regional Flora Use Cases (ATP-ECO-001A)', () => {
  let mockRepo: IRegionalFloraRepository;

  beforeEach(() => {
    mockRepo = {
      findSpeciesById: vi.fn(),
      findSpeciesByScientificNameAndRegion: vi.fn(),
      listSpeciesByRegion: vi.fn(),
      listSeasonalEvents: vi.fn(),
      createSpecies: vi.fn(),
      createPhenology: vi.fn(),
    };
  });

  describe('GetSeasonalRegionalFloraUseCase', () => {
    it('debe rechazar meses inválidos (< 1 o > 12 o no enteros)', async () => {
      const useCase = new GetSeasonalRegionalFloraUseCase(mockRepo);

      await expect(
        useCase.execute({ month: 0, growing_region_code: 'ARROYITO_CBA' })
      ).rejects.toThrow(RegionalFloraValidationError);

      await expect(
        useCase.execute({ month: 13, growing_region_code: 'ARROYITO_CBA' })
      ).rejects.toThrow(RegionalFloraValidationError);

      await expect(
        useCase.execute({ month: 9.5, growing_region_code: 'ARROYITO_CBA' })
      ).rejects.toThrow(RegionalFloraValidationError);
    });

    it('debe rechazar consultas sin región ecológica ni geográfica', async () => {
      const useCase = new GetSeasonalRegionalFloraUseCase(mockRepo);

      await expect(useCase.execute({ month: 9 })).rejects.toThrow(
        RegionalFloraValidationError
      );
    });

    it('debe consultar el repositorio con los filtros adecuados', async () => {
      const useCase = new GetSeasonalRegionalFloraUseCase(mockRepo);
      const mockResult = [
        {
          species: {
            id: 'spec-1',
            scientific_name: 'Prosopis alba',
            canonical_name: 'Prosopis alba',
            family: 'Fabaceae',
            common_names: ['Algarrobo blanco'],
            native_status: 'NATIVE' as const,
            ecological_region_id: 'eco-1',
            reference_id: null,
            growth_habit: 'Árbol',
            conservation_status: 'LC',
            notes: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          phenology: [
            {
              id: 'phen-1',
              species_id: 'spec-1',
              ecological_region_id: 'eco-1',
              event_type: 'SPROUTING' as const,
              month: 9,
              source_id: 'src-1',
              notes: 'Brotación',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          ecological_region: {
            id: 'eco-1',
            code: 'ESPINAL',
            name: 'Espinal',
            biome: 'Bosque xerófilo',
            description: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      ];

      vi.mocked(mockRepo.listSeasonalEvents).mockResolvedValue(mockResult);

      const result = await useCase.execute({
        month: 9,
        growing_region_code: 'ARROYITO_CBA',
        event_type: 'SPROUTING',
        native_status: 'NATIVE',
      });

      expect(mockRepo.listSeasonalEvents).toHaveBeenCalledWith({
        month: 9,
        growing_region_code: 'ARROYITO_CBA',
        ecological_region_id: undefined,
        event_type: 'SPROUTING',
        native_status: 'NATIVE',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('GetNativeRegionalFloraUseCase', () => {
    it('debe rechazar consultas sin región ecológica ni geográfica', async () => {
      const useCase = new GetNativeRegionalFloraUseCase(mockRepo);

      await expect(useCase.execute({})).rejects.toThrow(
        RegionalFloraValidationError
      );
    });

    it('debe listar especies regionales según región ecológica y filtros', async () => {
      const useCase = new GetNativeRegionalFloraUseCase(mockRepo);
      const mockSpecies = [
        {
          id: 'spec-1',
          scientific_name: 'Prosopis alba',
          canonical_name: 'Prosopis alba',
          family: 'Fabaceae',
          common_names: ['Algarrobo blanco'],
          native_status: 'NATIVE' as const,
          ecological_region_id: 'eco-1',
          reference_id: null,
          growth_habit: 'Árbol',
          conservation_status: 'LC',
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      vi.mocked(mockRepo.listSpeciesByRegion).mockResolvedValue(mockSpecies);

      const result = await useCase.execute({
        ecological_region_id: 'eco-1',
        growth_habit: 'Árbol',
        native_status: 'NATIVE',
      });

      expect(mockRepo.listSpeciesByRegion).toHaveBeenCalledWith({
        ecological_region_id: 'eco-1',
        growing_region_code: undefined,
        growth_habit: 'Árbol',
        native_status: 'NATIVE',
      });
      expect(result).toEqual(mockSpecies);
    });
  });
});
