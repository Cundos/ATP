import { ILocationRepository } from '@/core/domain/repositories';
import { LocationEntity, LifecycleStatus } from '@/core/domain/entities';

export interface ListLocationsQuery {
  status?: LifecycleStatus;
}

/**
 * APPLICATION LAYER (ATP-IMP-009):
 * Lista las ubicaciones físicas administradas.
 * Permite filtrar por status (ej: solo 'ACTIVE' para el selector de formularios de alta de plantas,
 * o sin filtro para la vista de administración general).
 * Ordenadas por name ASC según contrato de repositorio.
 */
export class ListLocationsUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  async execute(query?: ListLocationsQuery): Promise<LocationEntity[]> {
    return this.locationRepository.findAll(query?.status);
  }
}