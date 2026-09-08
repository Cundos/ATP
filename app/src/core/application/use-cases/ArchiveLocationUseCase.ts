import { ILocationRepository } from '@/core/domain/repositories';
import { LocationEntity } from '@/core/domain/entities';
import { LocationNotFoundError, LocationValidationError } from '../errors';

/**
 * APPLICATION LAYER (ATP-IMP-009):
 * Archiva una ubicación (soft delete: lifecycle_status = 'ARCHIVED').
 * Las plantas existentes que la referencian conservan su location_id (no se desasignan).
 * Una ubicación archivada no debe ofrecerse para nuevas asignaciones.
 * Es idempotente si ya está archivada.
 */
export class ArchiveLocationUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  async execute(id: string): Promise<LocationEntity> {
    if (!id || id.trim().length === 0) {
      throw new LocationValidationError('El id de la ubicación es obligatorio.');
    }

    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new LocationNotFoundError(id);
    }

    // Idempotencia: si ya está archivada, devolver sin mutación
    if (location.lifecycle_status === 'ARCHIVED') {
      return location;
    }

    return this.locationRepository.archive(id);
  }
}