import { IPlantRepository, IPhotoRepository } from '@/core/domain/repositories';
import { PhotoEntity } from '@/core/domain/entities';
import { isValidStorageKey } from '@/core/domain/services';
import { isValidPermanentCode } from '@/core/domain/permanent-code';
import { PlantNotFoundError, PhotoValidationError } from '../errors';

export interface RegisterPlantPhotoCommand {
  plant_id?: string;
  permanent_code?: string;
  storage_key: string;
  file_name?: string;
  mime_type: string;
  width?: number;
  height?: number;
  file_size?: number | null;
  make_primary?: boolean;
  captured_at?: Date | null;
}

export class RegisterPlantPhotoUseCase {
  constructor(
    private readonly plantRepository: IPlantRepository,
    private readonly photoRepository: IPhotoRepository
  ) {}

  async execute(command: RegisterPlantPhotoCommand): Promise<PhotoEntity> {
    if (!command.storage_key || typeof command.storage_key !== 'string') {
      throw new PhotoValidationError('La clave de almacenamiento es obligatoria.');
    }

    const sanitizedKey = command.storage_key.trim();
    if (!isValidStorageKey(sanitizedKey)) {
      throw new PhotoValidationError('La clave de almacenamiento es inválida.');
    }

    if (!command.mime_type || typeof command.mime_type !== 'string') {
      throw new PhotoValidationError('El tipo MIME es obligatorio.');
    }

    const sanitizedMime = command.mime_type.trim().toLowerCase();
    if (sanitizedMime !== 'image/webp' && !sanitizedMime.startsWith('image/')) {
      throw new PhotoValidationError('Tipo MIME no soportado.');
    }

    if (command.width !== undefined && (typeof command.width !== 'number' || command.width <= 0)) {
      throw new PhotoValidationError('El ancho de la imagen debe ser un número positivo.');
    }

    if (command.height !== undefined && (typeof command.height !== 'number' || command.height <= 0)) {
      throw new PhotoValidationError('El alto de la imagen debe ser un número positivo.');
    }

    if (command.file_size !== undefined && command.file_size !== null && (typeof command.file_size !== 'number' || command.file_size <= 0)) {
      throw new PhotoValidationError('El tamaño del archivo debe ser un número positivo.');
    }

    let plant = null;
    if (command.plant_id) {
      plant = await this.plantRepository.findById(command.plant_id);
    } else if (command.permanent_code) {
      const trimmedCode = command.permanent_code.trim();
      if (!isValidPermanentCode(trimmedCode)) {
        throw new PhotoValidationError('Código permanente de planta inválido.');
      }
      plant = await this.plantRepository.findByPermanentCode(trimmedCode);
    } else {
      throw new PhotoValidationError('Debe especificarse plant_id o permanent_code para asociar la foto.');
    }

    if (!plant) {
      const identifier = command.plant_id || command.permanent_code || 'desconocido';
      throw new PlantNotFoundError(identifier);
    }

    let isPrimary = false;
    if (command.make_primary === true) {
      isPrimary = true;
    } else if (command.make_primary === false) {
      isPrimary = false;
    } else {
      const existingPrimary = await this.photoRepository.findPrimaryByPlant(plant.id);
      isPrimary = !existingPrimary;
    }

    const parts = sanitizedKey.split('/');
    const fileName = command.file_name?.trim() || parts[parts.length - 1] || 'photo.webp';

    return await this.photoRepository.create({
      plant_id: plant.id,
      file_path: sanitizedKey,
      file_name: fileName,
      mime_type: sanitizedMime,
      file_size: command.file_size ?? null,
      is_primary: isPrimary,
      captured_at: command.captured_at ?? null,
    });
  }
}
