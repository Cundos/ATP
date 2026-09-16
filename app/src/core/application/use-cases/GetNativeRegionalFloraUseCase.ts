import {
  IRegionalFloraRepository,
  NativeFloraFilterOptions,
} from '@/core/domain/repositories';
import { RegionalPlantSpeciesEntity, NativeStatus } from '@/core/domain/entities';
import { RegionalFloraValidationError } from '../errors';

export interface GetNativeRegionalFloraQuery {
  growing_region_code?: string;
  ecological_region_id?: string;
  growth_habit?: string;
  native_status?: NativeStatus;
}

/**
 * APPLICATION LAYER (ATP-ECO-001A):
 * Retorna las especies regionales para una ecorregión o región geográfica dada,
 * permitiendo filtrar por hábito de crecimiento (árbol, arbusto, etc.) o estado nativo.
 */
export class GetNativeRegionalFloraUseCase {
  constructor(private readonly regionalFloraRepository: IRegionalFloraRepository) {}

  async execute(query: GetNativeRegionalFloraQuery): Promise<RegionalPlantSpeciesEntity[]> {
    if (!query.ecological_region_id && !query.growing_region_code) {
      throw new RegionalFloraValidationError(
        'Debe especificarse al menos una región ecológica (ecological_region_id) o una región geográfica (growing_region_code).'
      );
    }

    const options: NativeFloraFilterOptions = {
      ecological_region_id: query.ecological_region_id,
      growing_region_code: query.growing_region_code,
      growth_habit: query.growth_habit,
      native_status: query.native_status,
    };

    return this.regionalFloraRepository.listSpeciesByRegion(options);
  }
}
