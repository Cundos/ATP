import { IPlantRepository } from '@/core/domain/repositories';
import { PlantEntity } from '@/core/domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';

/**
 * APPLICATION LAYER (ATP-IMP-008):
 * Realiza el archivo de un ejemplar (soft delete: lifecycle_status = 'ARCHIVED').
 * Preserva permanent_code e histórico completo. Es idempotente ante plantas ya archivadas.
 */
export class ArchivePlantUseCase {
  constructor(private readonly plantRepository: IPlantRepository) {}

  async execute(id: string): Promise<PlantEntity> {
    if (!id || id.trim().length === 0) {
      throw new PlantValidationError('El id del ejemplar es obligatorio.');
    }

    const plant = await this.plantRepository.findById(id);
    if (!plant) {
      throw new PlantNotFoundError(id);
    }

    // Idempotencia: si ya se encuentra archivada, la retorna sin corromper estado
    if (plant.lifecycle_status === 'ARCHIVED') {
      return plant;
    }

    return this.plantRepository.archive(id);
  }
}