import { IPlantRepository, PlantFilterOptions } from '@/core/domain/repositories';
import { PlantEntity } from '@/core/domain/entities';

export type ListPlantsQuery = PlantFilterOptions;

/**
 * APPLICATION LAYER (ATP-IMP-008):
 * Obtiene la lista de ejemplares aplicando filtros de lifecycle_status, health_status,
 * location_id y search_query (common_name, scientific_name, permanent_code).
 * Mantiene el orden predeterminado permanent_code ASC.
 */
export class ListPlantsUseCase {
  constructor(private readonly plantRepository: IPlantRepository) {}

  async execute(query?: ListPlantsQuery): Promise<PlantEntity[]> {
    const filters: PlantFilterOptions = {
      lifecycle_status: query?.lifecycle_status,
      health_status: query?.health_status,
      location_id: query?.location_id,
      search_query: query?.search_query?.trim() || undefined,
      order_by: query?.order_by || 'permanent_code_asc',
    };

    return this.plantRepository.findAll(filters);
  }
}