import { IPlantRepository, IPhotoRepository } from '@/core/domain/repositories';
import { PhotoEntity } from '@/core/domain/entities';
import { isValidPermanentCode } from '@/core/domain/permanent-code';
import { PlantNotFoundError, PhotoValidationError } from '../errors';

export class GetPrimaryPhotoUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly photoRepository: IPhotoRepository
  ) {}

  async execute(plantIdOrCode: string): Promise<PhotoEntity | null> {
    if (!plantIdOrCode || typeof plantIdOrCode !== 'string') {
      throw new PhotoValidationError('El identificador o código de planta es obligatorio.');
    }

    const trimmed = plantIdOrCode.trim();
    let plant = null;

    if (isValidPermanentCode(trimmed)) {
      plant = await this.plantRepository.findByPermanentCode(trimmed);
    } else {
      plant = await this.plantRepository.findById(trimmed);
    }

    if (!plant) {
      throw new PlantNotFoundError(trimmed);
    }

    return await this.photoRepository.findPrimaryByPlant(plant.id);
  }
}
