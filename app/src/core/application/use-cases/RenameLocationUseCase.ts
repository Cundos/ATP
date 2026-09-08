import { ILocationRepository } from '@/core/domain/repositories';
import { LocationEntity } from '@/core/domain/entities';
import {
  LocationNotFoundError,
  LocationValidationError,
  LocationAlreadyExistsError,
} from '../errors';

export interface RenameLocationCommand {
  name: string;
}

/**
 * APPLICATION LAYER (ATP-IMP-009):
 * Renombra una ubicación existente. Valida id, comprueba existencia,
 * valida longitud 2..50 tras trim, comprueba colisión case-insensitive
 * con otra ubicación ACTIVE distinta y actualiza preservando el id y su lifecycle_status.
 */
export class RenameLocationUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  async execute(id: string, command: RenameLocationCommand): Promise<LocationEntity> {
    if (!id || id.trim().length === 0) {
      throw new LocationValidationError('El id de la ubicación es obligatorio.');
    }

    if (!command.name) {
      throw new LocationValidationError('El nombre de la ubicación es obligatorio.');
    }

    const trimmedName = command.name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      throw new LocationValidationError('El nombre de la ubicación debe tener entre 2 y 50 caracteres.');
    }

    // 1. Comprobar existencia
    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new LocationNotFoundError(id);
    }

    // 2. Si el nombre es idéntico al actual, retornar sin error
    if (location.name === trimmedName) {
      return location;
    }

    // 3. Comprobar si existe OTRA ubicación ACTIVE con el mismo nombre (case-insensitive)
    const existing = await this.locationRepository.findByName(trimmedName);
    if (existing && existing.id !== id) {
      throw new LocationAlreadyExistsError(trimmedName);
    }

    return this.locationRepository.update(id, {
      name: trimmedName,
    });
  }
}