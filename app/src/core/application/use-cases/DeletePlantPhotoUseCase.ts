import { IPlantRepository, IPhotoRepository } from '@/core/domain/repositories';
import { IFileStorageService } from '@/core/domain/services';
import {
  PlantNotFoundError,
  PhotoNotFoundError,
  PhotoOwnershipError,
  PhotoValidationError,
} from '../errors';

export interface DeletePlantPhotoCommand {
  plant_id: string;
  photo_id: string;
}

export interface DeletePlantPhotoResult {
  success: boolean;
  deleted_photo_id: string;
  new_primary_photo_id?: string | null;
}

export class DeletePlantPhotoUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly photoRepository: IPhotoRepository,
    private readonly fileStorageService: IFileStorageService
  ) {}

  async execute(command: DeletePlantPhotoCommand): Promise<DeletePlantPhotoResult> {
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

    let newPrimaryPhotoId: string | null = null;

    // Si la foto a eliminar es la primaria, reasignamos la primaria a la foto más reciente restante
    if (photo.is_primary) {
      const allPhotos = await this.photoRepository.listByPlant(plant.id);
      const remainingPhotos = allPhotos.filter((p) => p.id !== photo.id);

      if (remainingPhotos.length > 0) {
        // La lista ya está ordenada cronológicamente desc; la primera es la más reciente
        const nextPrimary = remainingPhotos[0];
        await this.photoRepository.setPrimary(plant.id, nextPrimary.id);
        newPrimaryPhotoId = nextPrimary.id;
      }
    }

    // 1. Eliminar registro en base de datos
    await this.photoRepository.delete(photo.id);

    // 2. Eliminar binario en almacenamiento de archivos
    try {
      await this.fileStorageService.deleteFile(photo.file_path);
    } catch (storageErr) {
      console.error(
        `[DeletePlantPhotoUseCase] Advertencia: No se pudo eliminar el archivo físico ${photo.file_path}:`,
        storageErr
      );
    }

    return {
      success: true,
      deleted_photo_id: photo.id,
      new_primary_photo_id: newPrimaryPhotoId,
    };
  }
}
