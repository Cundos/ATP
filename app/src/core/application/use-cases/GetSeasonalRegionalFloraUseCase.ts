import {
  IRegionalFloraRepository,
  SeasonalFloraFilterOptions,
  SeasonalFloraItem,
} from '@/core/domain/repositories';
import { PhenologyEventType, NativeStatus } from '@/core/domain/entities';
import { RegionalFloraValidationError } from '../errors';

export interface GetSeasonalRegionalFloraQuery {
  month: number;
  growing_region_code?: string;
  ecological_region_id?: string;
  event_type?: PhenologyEventType;
  native_status?: NativeStatus;
}

/**
 * APPLICATION LAYER (ATP-ECO-001A):
 * Retorna las especies regionales y sus eventos fenológicos (brotación, floración,
 * fructificación, siembra, plantación) para un mes específico y una región dada.
 */
export class GetSeasonalRegionalFloraUseCase {
  constructor(private readonly regionalFloraRepository: IRegionalFloraRepository) {}

  async execute(query: GetSeasonalRegionalFloraQuery): Promise<SeasonalFloraItem[]> {
    if (
      query.month === undefined ||
      query.month === null ||
      !Number.isInteger(query.month) ||
      query.month < 1 ||
      query.month > 12
    ) {
      throw new RegionalFloraValidationError('El mes consultado debe ser un número entero entre 1 y 12.');
    }

    if (!query.ecological_region_id && !query.growing_region_code) {
      throw new RegionalFloraValidationError(
        'Debe especificarse al menos una región ecológica (ecological_region_id) o una región geográfica (growing_region_code).'
      );
    }

    const options: SeasonalFloraFilterOptions = {
      month: query.month,
      ecological_region_id: query.ecological_region_id,
      growing_region_code: query.growing_region_code,
      event_type: query.event_type,
      native_status: query.native_status,
    };

    return this.regionalFloraRepository.listSeasonalEvents(options);
  }
}
