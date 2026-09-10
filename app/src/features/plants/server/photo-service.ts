import { IFileStorageService, IImageProcessingService, buildPhotoStorageKey } from '@/core/domain/services';
import { IPhotoRepository, IPlantRepository } from '@/core/domain/repositories';
import { generateUUIDv7 } from '@/core/domain/uuid';
import { RegisterPlantPhotoUseCase } from '@/core/application/use-cases/RegisterPlantPhotoUseCase';
import { getImageProcessingService, getFileStorageService } from '@/infrastructure/services';
import { PrismaPhotoRepository } from '@/infrastructure/db/repositories/PrismaPhotoRepository';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { PhotoEntity } from '@/core/domain/entities';

export interface UploadAndRegisterPhotoParams {
  plantId: string;
  permanentCode: string;
  fileBuffer: Buffer;
  fileName?: string;
  makePrimary?: boolean;
}

export interface UploadAndRegisterPhotoResult {
  success: boolean;
  photo: PhotoEntity;
  storageKey: string;
  url: string;
}

export interface PhotoOrchestrationDependencies {
  imageProcessor?: IImageProcessingService;
  fileStorage?: IFileStorageService;
  photoRepo?: IPhotoRepository;
  plantRepo?: IPlantRepository;
}

/**
 * Server-side orchestration service that:
 * 1. Validates and preprocesses image binary into optimized WebP using sharp.
 * 2. Generates logical storageKey (photos/{permanent_code}/{uuid}.webp).
 * 3. Saves binary to configured persistent storage (Vercel Blob / Local).
 * 4. Atomically registers metadata in PostgreSQL via RegisterPlantPhotoUseCase.
 * 5. Applies compensatory cleanup to the newly created binary if registration fails (Requirement #4).
 */
export async function uploadAndRegisterPlantPhoto(
  params: UploadAndRegisterPhotoParams,
  deps?: PhotoOrchestrationDependencies
): Promise<UploadAndRegisterPhotoResult> {
  const { plantId, permanentCode, fileBuffer, fileName, makePrimary = true } = params;

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('El archivo de imagen no contiene datos válidos.');
  }

  const imageProcessor = deps?.imageProcessor || getImageProcessingService();
  const fileStorage = deps?.fileStorage || getFileStorageService();
  const photoRepo = deps?.photoRepo || new PrismaPhotoRepository();
  const plantRepo = deps?.plantRepo || new PrismaPlantRepository();

  // 1. Preprocesar imagen a WebP optimizado
  const processed = await imageProcessor.processImage(fileBuffer);

  // 2. Generar UUIDv7 y clave de almacenamiento lógica
  const fileId = generateUUIDv7();
  const storageKey = buildPhotoStorageKey(permanentCode, fileId, 'webp');

  // 3. Persistir binario en almacenamiento
  await fileStorage.saveFile(storageKey, processed.buffer);

  // 4. Registrar metadata en base de datos con rollback de compensación
  const registerUseCase = new RegisterPlantPhotoUseCase(plantRepo, photoRepo);

  try {
    const photo = await registerUseCase.execute({
      plant_id: plantId,
      permanent_code: permanentCode,
      storage_key: storageKey,
      file_name: fileName || `${fileId}.webp`,
      mime_type: 'image/webp',
      file_size: processed.size,
      width: processed.width,
      height: processed.height,
      make_primary: makePrimary,
    });

    const url = fileStorage.resolveUrl(storageKey);

    return {
      success: true,
      photo,
      storageKey,
      url,
    };
  } catch (error) {
    // Compensatory cleanup: eliminar exclusivamente el binario nuevo huérfano recién subido
    try {
      await fileStorage.deleteFile(storageKey);
    } catch (cleanupErr) {
      console.error('[uploadAndRegisterPlantPhoto] Error en cleanup compensatorio de storage:', cleanupErr);
    }
    throw error;
  }
}
