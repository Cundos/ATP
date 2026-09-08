import { IPlantRepository } from '@/core/domain/repositories';
import { PlantEntity } from '@/core/domain/entities';
import { PlantNotFoundError, PlantValidationError } from '../errors';

/**
 * APPLICATION LAYER (ATP-IMP-008):
 * Obtiene la ficha completa de un ejemplar por su ID técnico UUIDv7
 * o por su permanent_code (AT-PL-XXX).
 * Lanza PlantNotFoundError si no existe.
 */
export class GetPlantUseCase {
  constructor(private readonly plantRepository: IPlantRepository) {}

  async executeById(id: string): Promise<PlantEntity> {
    if (!id || id.trim().length === 0) {
      throw new PlantValidationError('El id del ejemplar es obligatorio.');
    }

    const plant = await this.plantRepository.findById(id);
    if (!plant) {
      throw new PlantNotFoundError(id);
    }
    return plant;
  }

  async executeByPermanentCode(permanentCode: string): Promise<PlantEntity> {
    if (!permanentCode || permanentCode.trim().length === 0) {
      throw new PlantValidationError('El código permanente es obligatorio.');
    }

    const plant = await this.plantRepository.findByPermanentCode(permanentCode.trim());
    if (!plant) {
      throw new PlantNotFoundError(permanentCode);
    }
    return plant;
  }
}