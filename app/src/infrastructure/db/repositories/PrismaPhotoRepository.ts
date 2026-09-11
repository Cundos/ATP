import { prisma } from '../prisma';
import { IPhotoRepository, CreatePhotoPersistenceDTO } from '@/core/domain/repositories';
import { PhotoEntity } from '@/core/domain/entities';
import { generateUUIDv7 } from '@/core/domain/uuid';

export class PrismaPhotoRepository implements IPhotoRepository {
  async findById(id: string): Promise<PhotoEntity | null> {
    const record = await prisma.photo.findUnique({
      where: { id },
    });
    return record as unknown as PhotoEntity | null;
  }

  async findByFilePath(filePath: string): Promise<PhotoEntity | null> {
    const record = await prisma.photo.findFirst({
      where: { file_path: filePath },
    });
    return record as unknown as PhotoEntity | null;
  }

  async listByPlant(plantId: string): Promise<PhotoEntity[]> {
    const records = await prisma.photo.findMany({
      where: { plant_id: plantId },
      orderBy: { created_at: 'desc' },
    });
    return records as unknown as PhotoEntity[];
  }

  async findPrimaryByPlant(plantId: string): Promise<PhotoEntity | null> {
    const record = await prisma.photo.findFirst({
      where: { plant_id: plantId, is_primary: true },
    });
    return record as unknown as PhotoEntity | null;
  }

  async create(dto: CreatePhotoPersistenceDTO): Promise<PhotoEntity> {
    const id = dto.id || generateUUIDv7();
    const isPrimary = Boolean(dto.is_primary);

    if (isPrimary) {
      // Transacción atómica: desmarcar primarias previas de la planta y crear la nueva como primaria
      return await prisma.$transaction(
        async (tx) => {
          await tx.photo.updateMany({
            where: { plant_id: dto.plant_id, is_primary: true },
            data: { is_primary: false },
          });

          const created = await tx.photo.create({
            data: {
              id,
              plant_id: dto.plant_id,
              file_path: dto.file_path,
              file_name: dto.file_name,
              mime_type: dto.mime_type,
              file_size: dto.file_size,
              is_primary: true,
              captured_at: dto.captured_at,
            },
          });
          return created as unknown as PhotoEntity;
        },
        { maxWait: 10000, timeout: 20000 }
      );
    }

    const created = await prisma.photo.create({
      data: {
        id,
        plant_id: dto.plant_id,
        file_path: dto.file_path,
        file_name: dto.file_name,
        mime_type: dto.mime_type,
        file_size: dto.file_size,
        is_primary: false,
        captured_at: dto.captured_at,
      },
    });
    return created as unknown as PhotoEntity;
  }

  async setPrimary(plantId: string, photoId: string): Promise<PhotoEntity> {
    return await prisma.$transaction(
      async (tx) => {
        // 1. Desmarcar todas las fotos primarias existentes de esta planta
        await tx.photo.updateMany({
          where: { plant_id: plantId, is_primary: true },
          data: { is_primary: false },
        });

        // 2. Establecer la foto seleccionada como primaria
        const updated = await tx.photo.update({
          where: { id: photoId, plant_id: plantId },
          data: { is_primary: true },
        });

        return updated as unknown as PhotoEntity;
      },
      { maxWait: 10000, timeout: 20000 }
    );
  }
}
