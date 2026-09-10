import { IPlantRepository, IPhotoRepository } from '@/core/domain/repositories';
import { PhotoEntity } from '@/core/domain/entities';
import { PlantNotFoundError, PhotoNotFoundError, PhotoOwnershipError, PhotoValidationError } from '../errors';

export interface SetPrimaryPhotoCommand {
  plant_id: string;
  photo_id: string;
}

export class SetPrimaryPhotoUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly photoRepository: IPhotoRepository
  ) {}

  async execute(command: SetPrimaryPhotoCommand): Promise<PhotoEntity> {
    if (!command.plant_id || typeof command.plant_id !== 'string') {
      throw new PhotoValidationError('El identificador de planta (plant_id) es obligatorio.');
    }

    if (!command.photo_id || typeof command.photo_id !== 'string') {
      throw new PhotoValidationError('El identificador de foto (photo_id) es obligatorio.');
    }

    const plantId = command.plant_id.trim();
    const photoId = command.photo_id.trim();

    const plant = await this.plantRepository.findById(plantId);
    if (!plant) {
      throw new PlantNotFoundError(plantId);
    }

    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new PhotoNotFoundError(photoId);
    }

    if (photo.plant_id !== plant.id) {
      throw new PhotoOwnershipError(photoId, plant.id);
    }

    return await this.photoRepository.setPrimary(plant.id, photo.id);
  }
}
