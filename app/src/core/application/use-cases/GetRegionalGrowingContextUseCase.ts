import { IGrowingRegionRepository } from '@/core/domain/repositories';
import { GrowingRegionEntity } from '@/core/domain/entities';
import { RegionalFloraValidationError } from '../errors';

export interface GetRegionalGrowingContextQuery {
  growing_region_code?: string;
  growing_region_id?: string;
}

/**
 * APPLICATION LAYER (ATP-ECO-001C):
 * Retorna la información contextual de una región de cultivo y sus ecorregiones
 * asociadas (por ejemplo: Arroyito / Espinal).
 */
export class GetRegionalGrowingContextUseCase {
  constructor(private readonly growingRegionRepository: IGrowingRegionRepository) {}

  async execute(query: GetRegionalGrowingContextQuery = {}): Promise<GrowingRegionEntity | null> {
    if (query.growing_region_code !== undefined && query.growing_region_code.trim() === '') {
      throw new RegionalFloraValidationError('El código de región geográfica no puede ser vacío.');
    }

    if (query.growing_region_id !== undefined && query.growing_region_id.trim() === '') {
      throw new RegionalFloraValidationError('El id de región geográfica no puede ser vacío.');
    }

    if (query.growing_region_id) {
      return this.growingRegionRepository.findById(query.growing_region_id);
    }

    const code = query.growing_region_code?.trim().toUpperCase() || 'ARROYITO_CBA';
    return this.growingRegionRepository.findByCode(code);
  }
}
