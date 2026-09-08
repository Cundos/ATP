import { prisma } from '../prisma';
import {
  IPlantRepository,
  CreatePlantDTO,
  UpdatePlantDTO,
  PlantFilterOptions,
} from '@/core/domain/repositories';
import { PlantEntity } from '@/core/domain/entities';
import { generateUUIDv7 } from '@/core/domain/uuid';

export class PrismaPlantRepository implements IPlantRepository {
  /**
   * Genera el siguiente código permanente atómico mediante la secuencia nativa de PostgreSQL (ADR-017)
   */
  async getNextPermanentCode(): Promise<string> {
    try {
      const result = await prisma.$queryRaw<Array<{ nextval: bigint }>>`SELECT nextval('plant_code_seq');`;
      const nextNum = Number(result[0].nextval);
      return `AT-PL-${nextNum.toString().padStart(3, '0')}`;
    } catch {
      // Fallback para entornos en memoria o pruebas sin secuencia creada
      const count = await prisma.plant.count();
      return `AT-PL-${(count + 1).toString().padStart(3, '0')}`;
    }
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
      orderBy: { created_at: 'desc' },
    });

    return records as unknown as PlantEntity[];
  }

  async create(dto: CreatePlantDTO): Promise<PlantEntity> {
    const id = generateUUIDv7();
    const permanent_code = await this.getNextPermanentCode();

    const record = await prisma.plant.create({
      data: {
        id,
        permanent_code,
        common_name: dto.common_name.trim(),
        scientific_name: dto.scientific_name?.trim() || null,
        cultivar: dto.cultivar?.trim() || null,
        health_status: dto.health_status || 'UNKNOWN',
        lifecycle_status: 'ACTIVE',
        acquisition_date: dto.acquisition_date || new Date(),
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
        acquisition_date: dto.acquisition_date,
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