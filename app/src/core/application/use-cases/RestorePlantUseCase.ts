import { IPlantRepository } from '@/core/domain/repositories';
import { PlantEntity } from '@/core/domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';

/**
 * APPLICATION LAYER (ATP-IMP-008):
 * Restaura un ejemplar archivado (lifecycle_status = 'ACTIVE').
 * Preserva permanent_code y toda la identidad. Es idempotente ante plantas ya activas.
 */
export class RestorePlantUseCase {
  constructor(private readonly plantRepository: IPlantRepository) {}

  async execute(id: string): Promise<PlantEntity> {
    if (!id || id.trim().length === 0) {
      throw new PlantValidationError('El id del ejemplar es obligatorio.');
    }

    const plant = await this.plantRepository.findById(id);
    if (!plant) {
      throw new PlantNotFoundError(id);
    }

    // Idempotencia: si ya se encuentra activa, la retorna sin corromper estado
    if (plant.lifecycle_status === 'ACTIVE') {
      return plant;
    }

    return this.plantRepository.restore(id);
  }
}