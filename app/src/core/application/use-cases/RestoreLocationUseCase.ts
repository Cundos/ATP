import { ILocationRepository } from '@/core/domain/repositories';
import { LocationEntity } from '@/core/domain/entities';
import {
  LocationNotFoundError,
  LocationValidationError,
  LocationAlreadyExistsError,
} from '../errors';

/**
 * APPLICATION LAYER (ATP-IMP-009):
 * Restaura una ubicación archivada (lifecycle_status = 'ACTIVE').
 * Reglas:
 * 1. Si ya está ACTIVE, devuelve la entidad sin mutación redundante.
 * 2. Antes de restaurar, comprueba si existe otra ubicación ACTIVE con el mismo nombre.
 * 3. Si existe colisión case-insensitive, rechaza la restauración con LocationAlreadyExistsError
 *    anticipando la restricción física de PostgreSQL locations_active_name_key.
 */
export class RestoreLocationUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  async execute(id: string): Promise<LocationEntity> {
    if (!id || id.trim().length === 0) {
      throw new LocationValidationError('El id de la ubicación es obligatorio.');
    }

    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new LocationNotFoundError(id);
    }

    // Idempotencia: si ya está activa, retornar sin mutar
    if (location.lifecycle_status === 'ACTIVE') {
      return location;
    }

    // Verificar si existe OTRA ubicación ACTIVE con el mismo nombre (case-insensitive)
    const activeWithSameName = await this.locationRepository.findByName(location.name);
    if (activeWithSameName && activeWithSameName.id !== id) {
      throw new LocationAlreadyExistsError(location.name);
    }

    return this.locationRepository.restore(id);
  }
}