import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  IPlantReferenceRepository,
  CreatePlantReferencePersistenceDTO,
} from '@/core/domain/repositories';
import { PlantReferenceEntity } from '@/core/domain/entities';
import { generateUUIDv7 } from '@/core/domain/uuid';

export class PrismaPlantReferenceRepository implements IPlantReferenceRepository {
  async findById(id: string): Promise<PlantReferenceEntity | null> {
    const record = await prisma.plantReference.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByProviderAndExternalId(
    provider: string,
    externalId: string
  ): Promise<PlantReferenceEntity | null> {
    const record = await prisma.plantReference.findUnique({
      where: {
        provider_external_id_unique: {
          provider: provider.trim(),
          external_id: externalId.trim(),
        },
      },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async create(dto: CreatePlantReferencePersistenceDTO): Promise<PlantReferenceEntity> {
    const id = dto.id || generateUUIDv7();
    const provider = dto.provider.trim();
    const external_id = dto.external_id.trim();
    const scientific_name = dto.scientific_name.trim();
    const common_names = dto.common_names
      ? (dto.common_names as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    const reference_care = dto.reference_care
      ? (dto.reference_care as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    const image_url = dto.image_url ?? null;
    const fetched_at = dto.fetched_at ?? new Date();
    const last_sync_at = dto.last_sync_at ?? new Date();
    const raw_data = dto.raw_data as unknown as Prisma.InputJsonValue;

    try {
      const record = await prisma.plantReference.create({
        data: {
          id,
          provider,
          external_id,
          scientific_name,
          common_names,
          reference_care,
          image_url,
          fetched_at,
          last_sync_at,
          raw_data,
        },
      });
      return this.toEntity(record);
    } catch (err: unknown) {
      // Concurrency protection: if a simultaneous request created the exact same (provider, external_id),
      // catch the unique constraint error (P2002) and return the existing record.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.findByProviderAndExternalId(provider, external_id);
        if (existing) {
          return existing;
        }
      }
      throw err;
    }
  }

  private toEntity(record: {
    id: string;
    provider: string;
    external_id: string;
    scientific_name: string;
    common_names: unknown;
    reference_care: unknown;
    image_url: string | null;
    fetched_at: Date;
    last_sync_at: Date;
    raw_data: unknown;
  }): PlantReferenceEntity {
    return {
      id: record.id,
      provider: record.provider,
      external_id: record.external_id,
      scientific_name: record.scientific_name,
      common_names: Array.isArray(record.common_names)
        ? (record.common_names as string[])
        : null,
      reference_care:
        typeof record.reference_care === 'object' && record.reference_care !== null
          ? (record.reference_care as Record<string, unknown>)
          : null,
      image_url: record.image_url,
      fetched_at: record.fetched_at,
      last_sync_at: record.last_sync_at,
      raw_data:
        typeof record.raw_data === 'object' && record.raw_data !== null
          ? (record.raw_data as Record<string, unknown>)
          : {},
    };
  }
}
