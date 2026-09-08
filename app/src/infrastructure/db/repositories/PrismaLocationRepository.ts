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

  async findAll(status?: LifecycleStatus): Promise<LocationEntity[]> {
    const records = await prisma.location.findMany({
      where: status ? { lifecycle_status: status } : undefined,
      orderBy: { name: 'asc' },
    });
    return records as LocationEntity[];
  }

  async create(dto: CreateLocationDTO): Promise<LocationEntity> {
    const record = await prisma.location.create({
      data: {
        id: generateUUIDv7(),
        name: dto.name.trim(),
        lifecycle_status: 'ACTIVE',
      },
    });
    return record as LocationEntity;
  }

  async update(id: string, dto: UpdateLocationDTO): Promise<LocationEntity> {
    const record = await prisma.location.update({
      where: { id },
      data: {
        name: dto.name.trim(),
      },
    });
    return record as LocationEntity;
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