import { prisma } from '../prisma';
import {
  ILocationRepository,
  CreateLocationDTO,
  UpdateLocationDTO,
} from '@/core/domain/repositories';
import { LocationEntity, LifecycleStatus } from '@/core/domain/entities';
import { generateUUIDv7 } from '@/core/domain/uuid';

export class PrismaLocationRepository implements ILocationRepository {
  async findById(id: string): Promise<LocationEntity | null> {
    const record = await prisma.location.findUnique({
      where: { id },
    });
    return record as LocationEntity | null;
  }

  async findByName(name: string): Promise<LocationEntity | null> {
    const trimmed = name.trim();
    const records = await prisma.location.findMany({
      where: {
        name: { equals: trimmed, mode: 'insensitive' },
        lifecycle_status: 'ACTIVE',
      },
      take: 1,
    });
    return (records[0] as LocationEntity) || null;
  }

  async findAll(status?: LifecycleStatus): Promise<LocationEntity[]> {
    const records = await prisma.location.findMany({
      where: status ? { lifecycle_status: status } : undefined,
      orderBy: { name: 'asc' },
    });
    return records as LocationEntity[];
  }

  async create(dto: CreateLocationDTO): Promise<LocationEntity> {
    const trimmed = dto.name.trim();

    try {
      const record = await prisma.location.create({
        data: {
          id: generateUUIDv7(),
          name: trimmed,
          lifecycle_status: 'ACTIVE',
        },
      });
      return record as LocationEntity;
    } catch (error: unknown) {
      // Si ocurre colisión en carrera concurrente contra locations_active_name_key
      const err = error as { code?: string; message?: string };
      if (err?.code === 'P2002' || err?.message?.includes('locations_active_name_key')) {
        throw new Error(`Colisión de nombre activo en persistencia: "${trimmed}"`);
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateLocationDTO): Promise<LocationEntity> {
    const trimmed = dto.name.trim();

    try {
      const record = await prisma.location.update({
        where: { id },
        data: {
          name: trimmed,
        },
      });
      return record as LocationEntity;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'P2002' || err?.message?.includes('locations_active_name_key')) {
        throw new Error(`Colisión de nombre activo en persistencia: "${trimmed}"`);
      }
      throw error;
    }
  }

  async archive(id: string): Promise<LocationEntity> {
    const record = await prisma.location.update({
      where: { id },
      data: {
        lifecycle_status: 'ARCHIVED',
      },
    });
    return record as LocationEntity;
  }

  async restore(id: string): Promise<LocationEntity> {
    const record = await prisma.location.update({
      where: { id },
      data: {
        lifecycle_status: 'ACTIVE',
      },
    });
    return record as LocationEntity;
  }
}