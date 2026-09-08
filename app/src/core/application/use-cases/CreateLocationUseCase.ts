import { ILocationRepository } from '@/core/domain/repositories';
import { LocationEntity } from '@/core/domain/entities';
import { LocationValidationError, LocationAlreadyExistsError } from '../errors';

export interface CreateLocationCommand {
  name: string;
}

/**
 * APPLICATION LAYER (ATP-IMP-009):
 * Valida el nombre de la ubicación (2..50 caracteres, no vacío tras trim),
 * verifica que no exista otra ubicación ACTIVE con el mismo nombre (case-insensitive)
 * y persiste con lifecycle_status = ACTIVE.
 */
export class CreateLocationUseCase {
  constructor(private readonly locationRepository: ILocationRepository) {}

  async execute(command: CreateLocationCommand): Promise<LocationEntity> {
    if (!command.name) {
      throw new LocationValidationError('El nombre de la ubicación es obligatorio.');
    }

    const trimmedName = command.name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      throw new LocationValidationError('El nombre de la ubicación debe tener entre 2 y 50 caracteres.');
    }

    // Comprobar colisión case-insensitive entre ubicaciones ACTIVE
    const existing = await this.locationRepository.findByName(trimmedName);
    if (existing) {
      throw new LocationAlreadyExistsError(trimmedName);
    }

    return this.locationRepository.create({
      name: trimmedName,
    });
  }
}