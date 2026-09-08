import { prisma } from '../prisma';
import {
  IPlantRepository,
  CreatePlantPersistenceDTO,
  UpdatePlantDTO,
  PlantFilterOptions,
} from '@/core/domain/repositories';
import { PlantEntity } from '@/core/domain/entities';
import { generateUUIDv7 } from '@/core/domain/uuid';

export class PrismaPlantRepository implements IPlantRepository {
  /**
   * PERSISTENCIA PURA: Obtiene atómicamente el siguiente valor numérico de la secuencia PostgreSQL plant_code_seq (ADR-017).
   * Lanza una excepción explícita si la secuencia no responde. CERO fallbacks count/max.
   */
  async getNextSequenceValue(): Promise<number> {
    const result = await prisma.$queryRaw<Array<{ nextval: bigint }>>`SELECT nextval('plant_code_seq');`;
    if (!result || result.length === 0 || result[0].nextval === undefined) {
      throw new Error('Error al invocar nextval sobre plant_code_seq: resultado vacío del motor PostgreSQL');
    }
    return Number(result[0].nextval);
  }

  async findById(id: string): Promise<PlantEntity | null> {
    const record = await prisma.plant.findUnique({
      where: { id },
      include: {
        location: true,
        reference: true,
        profile: true,
        photos: {
          orderBy: [{ is_primary: 'desc' }, { created_at: 'desc' }],
        },
      },
    });
    return record as unknown as PlantEntity | null;
  }

  async findByPermanentCode(permanent_code: string): Promise<PlantEntity | null> {
    const record = await prisma.plant.findUnique({
      where: { permanent_code },
      include: {
        location: true,
        reference: true,
        profile: true,
        photos: {
          orderBy: [{ is_primary: 'desc' }, { created_at: 'desc' }],
        },
      },
    });
    return record as unknown as PlantEntity | null;
  }

  async findAll(filters?: PlantFilterOptions): Promise<PlantEntity[]> {
    const whereClause: Record<string, unknown> = {};

    if (filters?.lifecycle_status) {
      whereClause.lifecycle_status = filters.lifecycle_status;
    }
    if (filters?.health_status) {
      whereClause.health_status = filters.health_status;
    }
    if (filters?.location_id) {
      whereClause.location_id = filters.location_id;
    }
    if (filters?.search_query) {
      const query = filters.search_query.trim();
      whereClause.OR = [
        { common_name: { contains: query, mode: 'insensitive' } },
        { scientific_name: { contains: query, mode: 'insensitive' } },
        { permanent_code: { contains: query, mode: 'insensitive' } },
      ];
    }

    const orderByClause = filters?.order_by === 'created_at_desc'
      ? { created_at: 'desc' as const }
      : { permanent_code: 'asc' as const };

    const records = await prisma.plant.findMany({
      where: whereClause,
      include: {
        location: true,
        reference: true,
        profile: true,
        photos: {
          where: { is_primary: true },
          take: 1,
        },
      },
      orderBy: orderByClause,
    });

    return records as unknown as PlantEntity[];
  }

  /**
   * PERSISTENCIA PURA: Persiste la planta recibiendo el permanent_code ya formateado desde la capa Application/Domain.
   * El repositorio NO formatea ni coordina el código.
   */
  async create(dto: CreatePlantPersistenceDTO): Promise<PlantEntity> {
    const id = generateUUIDv7();

    const record = await prisma.plant.create({
      data: {
        id,
        permanent_code: dto.permanent_code,
        common_name: dto.common_name.trim(),
        scientific_name: dto.scientific_name?.trim() || null,
        cultivar: dto.cultivar?.trim() || null,
        health_status: dto.health_status || 'UNKNOWN',
        lifecycle_status: 'ACTIVE',
        acquisition_date: dto.acquisition_date !== undefined ? dto.acquisition_date : null,
        notes: dto.notes?.trim() || null,
        location_id: dto.location_id || null,
        reference_id: dto.reference_id || null,
        profile:
          dto.pot_info || dto.substrate_info || dto.light_conditions || dto.watering_notes
            ? {
                create: {
                  id: generateUUIDv7(),
                  pot_info: dto.pot_info?.trim() || null,
                  substrate_info: dto.substrate_info?.trim() || null,
                  light_conditions: dto.light_conditions?.trim() || null,
                  watering_notes: dto.watering_notes?.trim() || null,
                },
              }
            : undefined,
      },
      include: {
        location: true,
        reference: true,
        profile: true,
        photos: true,
      },
    });

    return record as unknown as PlantEntity;
  }

  async update(id: string, dto: UpdatePlantDTO): Promise<PlantEntity> {
    const record = await prisma.plant.update({
      where: { id },
      data: {
        common_name: dto.common_name?.trim(),
        scientific_name: dto.scientific_name !== undefined ? dto.scientific_name?.trim() || null : undefined,
        cultivar: dto.cultivar !== undefined ? dto.cultivar?.trim() || null : undefined,
        health_status: dto.health_status,
        acquisition_date: dto.acquisition_date !== undefined ? dto.acquisition_date : undefined,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
        location_id: dto.location_id !== undefined ? dto.location_id : undefined,
        reference_id: dto.reference_id !== undefined ? dto.reference_id : undefined,
        profile:
          dto.pot_info !== undefined ||
          dto.substrate_info !== undefined ||
          dto.light_conditions !== undefined ||
          dto.watering_notes !== undefined
            ? {
                upsert: {
                  create: {
                    id: generateUUIDv7(),
                    pot_info: dto.pot_info?.trim() || null,
                    substrate_info: dto.substrate_info?.trim() || null,
                    light_conditions: dto.light_conditions?.trim() || null,
                    watering_notes: dto.watering_notes?.trim() || null,
                  },
                  update: {
                    pot_info: dto.pot_info?.trim() || null,
                    substrate_info: dto.substrate_info?.trim() || null,
                    light_conditions: dto.light_conditions?.trim() || null,
                    watering_notes: dto.watering_notes?.trim() || null,
                  },
                },
              }
            : undefined,
      },
      include: {
        location: true,
        reference: true,
        profile: true,
        photos: true,
      },
    });

    return record as unknown as PlantEntity;
  }

  async archive(id: string): Promise<PlantEntity> {
    const record = await prisma.plant.update({
      where: { id },
      data: { lifecycle_status: 'ARCHIVED' },
      include: {
        location: true,
        reference: true,
        profile: true,
        photos: true,
      },
    });
    return record as unknown as PlantEntity;
  }

  async restore(id: string): Promise<PlantEntity> {
    const record = await prisma.plant.update({
      where: { id },
      data: { lifecycle_status: 'ACTIVE' },
      include: {
        location: true,
        reference: true,
        profile: true,
        photos: true,
      },
    });
    return record as unknown as PlantEntity;
  }
}