import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  IRegionalFloraRepository,
  IEcologicalRegionRepository,
  IDataSourceRepository,
  IGrowingRegionRepository,
  CreateDataSourceDTO,
  CreateEcologicalRegionDTO,
  CreateGrowingRegionDTO,
  LinkGrowingRegionEcologicalRegionDTO,
  CreateRegionalSpeciesDTO,
  CreatePlantPhenologyDTO,
  SeasonalFloraFilterOptions,
  NativeFloraFilterOptions,
  SeasonalFloraItem,
} from '@/core/domain/repositories';
import {
  DataSourceEntity,
  EcologicalRegionEntity,
  GrowingRegionEntity,
  RegionalPlantSpeciesEntity,
  PlantPhenologyEntity,
  NativeStatus,
  PhenologyEventType,
  SourceType,
} from '@/core/domain/entities';
import { generateUUIDv7 } from '@/core/domain/uuid';

export class PrismaDataSourceRepository implements IDataSourceRepository {
  async findById(id: string): Promise<DataSourceEntity | null> {
    const record = await prisma.dataSource.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByName(name: string): Promise<DataSourceEntity | null> {
    const record = await prisma.dataSource.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findAll(): Promise<DataSourceEntity[]> {
    const records = await prisma.dataSource.findMany({
      orderBy: { name: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async create(dto: CreateDataSourceDTO): Promise<DataSourceEntity> {
    const id = dto.id || generateUUIDv7();
    const record = await prisma.dataSource.create({
      data: {
        id,
        name: dto.name.trim(),
        type: dto.type,
        url: dto.url ?? null,
        description: dto.description ?? null,
        version: dto.version ?? null,
      },
    });
    return this.toEntity(record);
  }

  private toEntity(record: {
    id: string;
    name: string;
    type: SourceType;
    url: string | null;
    description: string | null;
    version: string | null;
    created_at: Date;
    updated_at: Date;
  }): DataSourceEntity {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      url: record.url,
      description: record.description,
      version: record.version,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }
}

export class PrismaEcologicalRegionRepository implements IEcologicalRegionRepository {
  async findById(id: string): Promise<EcologicalRegionEntity | null> {
    const record = await prisma.ecologicalRegion.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByCode(code: string): Promise<EcologicalRegionEntity | null> {
    const record = await prisma.ecologicalRegion.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findAll(): Promise<EcologicalRegionEntity[]> {
    const records = await prisma.ecologicalRegion.findMany({
      orderBy: { name: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async create(dto: CreateEcologicalRegionDTO): Promise<EcologicalRegionEntity> {
    const id = dto.id || generateUUIDv7();
    const record = await prisma.ecologicalRegion.create({
      data: {
        id,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        biome: dto.biome.trim(),
        description: dto.description ?? null,
      },
    });
    return this.toEntity(record);
  }

  private toEntity(record: {
    id: string;
    code: string;
    name: string;
    biome: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
  }): EcologicalRegionEntity {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      biome: record.biome,
      description: record.description,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }
}

export class PrismaGrowingRegionRepository implements IGrowingRegionRepository {
  async findById(id: string): Promise<GrowingRegionEntity | null> {
    const record = await prisma.growingRegion.findUnique({
      where: { id },
      include: {
        ecological_regions: {
          include: { ecological_region: true },
        },
      },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findByCode(code: string): Promise<GrowingRegionEntity | null> {
    const record = await prisma.growingRegion.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        ecological_regions: {
          include: { ecological_region: true },
        },
      },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findAll(): Promise<GrowingRegionEntity[]> {
    const records = await prisma.growingRegion.findMany({
      orderBy: { name: 'asc' },
      include: {
        ecological_regions: {
          include: { ecological_region: true },
        },
      },
    });
    return records.map((r) => this.toEntity(r));
  }

  async create(dto: CreateGrowingRegionDTO): Promise<GrowingRegionEntity> {
    const id = dto.id || generateUUIDv7();
    const record = await prisma.growingRegion.create({
      data: {
        id,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        country: dto.country.trim(),
        province: dto.province.trim(),
        locality: dto.locality?.trim() ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        description: dto.description ?? null,
      },
      include: {
        ecological_regions: {
          include: { ecological_region: true },
        },
      },
    });
    return this.toEntity(record);
  }

  async linkEcologicalRegion(dto: LinkGrowingRegionEcologicalRegionDTO): Promise<void> {
    await prisma.growingRegionEcologicalRegion.upsert({
      where: {
        growing_region_id_ecological_region_id: {
          growing_region_id: dto.growing_region_id,
          ecological_region_id: dto.ecological_region_id,
        },
      },
      update: {
        is_primary: dto.is_primary ?? false,
        notes: dto.notes ?? null,
      },
      create: {
        growing_region_id: dto.growing_region_id,
        ecological_region_id: dto.ecological_region_id,
        is_primary: dto.is_primary ?? false,
        notes: dto.notes ?? null,
      },
    });
  }

  private toEntity(record: {
    id: string;
    code: string;
    name: string;
    country: string;
    province: string;
    locality: string | null;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    ecological_regions?: Array<{
      growing_region_id: string;
      ecological_region_id: string;
      is_primary: boolean;
      notes: string | null;
      created_at: Date;
      ecological_region?: {
        id: string;
        code: string;
        name: string;
        biome: string;
        description: string | null;
        created_at: Date;
        updated_at: Date;
      };
    }>;
  }): GrowingRegionEntity {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      country: record.country,
      province: record.province,
      locality: record.locality,
      latitude: record.latitude,
      longitude: record.longitude,
      description: record.description,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ecological_regions: record.ecological_regions?.map((er) => ({
        growing_region_id: er.growing_region_id,
        ecological_region_id: er.ecological_region_id,
        is_primary: er.is_primary,
        notes: er.notes,
        created_at: er.created_at,
        ecological_region: er.ecological_region
          ? {
              id: er.ecological_region.id,
              code: er.ecological_region.code,
              name: er.ecological_region.name,
              biome: er.ecological_region.biome,
              description: er.ecological_region.description,
              created_at: er.ecological_region.created_at,
              updated_at: er.ecological_region.updated_at,
            }
          : undefined,
      })),
    };
  }
}

export class PrismaRegionalFloraRepository implements IRegionalFloraRepository {
  async findSpeciesById(id: string): Promise<RegionalPlantSpeciesEntity | null> {
    const record = await prisma.regionalPlantSpecies.findUnique({
      where: { id },
      include: {
        ecological_region: true,
        reference: true,
        phenology_records: {
          include: { source: true },
        },
      },
    });
    if (!record) return null;
    return this.speciesToEntity(record);
  }

  async findSpeciesByScientificNameAndRegion(
    scientificName: string,
    ecologicalRegionId: string
  ): Promise<RegionalPlantSpeciesEntity | null> {
    const record = await prisma.regionalPlantSpecies.findUnique({
      where: {
        species_ecological_region_unique: {
          scientific_name: scientificName.trim(),
          ecological_region_id: ecologicalRegionId,
        },
      },
      include: {
        ecological_region: true,
        reference: true,
        phenology_records: {
          include: { source: true },
        },
      },
    });
    if (!record) return null;
    return this.speciesToEntity(record);
  }

  async listSpeciesByRegion(options: NativeFloraFilterOptions): Promise<RegionalPlantSpeciesEntity[]> {
    let targetEcologicalRegionIds: string[] = [];

    if (options.ecological_region_id) {
      targetEcologicalRegionIds = [options.ecological_region_id];
    } else if (options.growing_region_code) {
      const growingRegion = await prisma.growingRegion.findUnique({
        where: { code: options.growing_region_code.trim().toUpperCase() },
        include: { ecological_regions: true },
      });
      if (growingRegion) {
        targetEcologicalRegionIds = growingRegion.ecological_regions.map((er) => er.ecological_region_id);
      }
    }

    const whereClause: Prisma.RegionalPlantSpeciesWhereInput = {};

    if (targetEcologicalRegionIds.length > 0) {
      whereClause.ecological_region_id = { in: targetEcologicalRegionIds };
    }
    if (options.growth_habit) {
      whereClause.growth_habit = { equals: options.growth_habit.trim(), mode: 'insensitive' };
    }
    if (options.native_status) {
      whereClause.native_status = options.native_status;
    }

    const records = await prisma.regionalPlantSpecies.findMany({
      where: whereClause,
      include: {
        ecological_region: true,
        reference: true,
        phenology_records: {
          include: { source: true },
          orderBy: [{ event_type: 'asc' }, { month: 'asc' }],
        },
      },
      orderBy: { scientific_name: 'asc' },
    });

    return records.map((r) => this.speciesToEntity(r));
  }

  async listSeasonalEvents(options: SeasonalFloraFilterOptions): Promise<SeasonalFloraItem[]> {
    let targetEcologicalRegionIds: string[] = [];

    if (options.ecological_region_id) {
      targetEcologicalRegionIds = [options.ecological_region_id];
    } else if (options.growing_region_code) {
      const growingRegion = await prisma.growingRegion.findUnique({
        where: { code: options.growing_region_code.trim().toUpperCase() },
        include: { ecological_regions: true },
      });
      if (growingRegion) {
        targetEcologicalRegionIds = growingRegion.ecological_regions.map((er) => er.ecological_region_id);
      }
    }

    const phenologyWhere: Prisma.PlantPhenologyWhereInput = {
      month: options.month,
    };

    if (targetEcologicalRegionIds.length > 0) {
      phenologyWhere.ecological_region_id = { in: targetEcologicalRegionIds };
    }
    if (options.event_type) {
      phenologyWhere.event_type = options.event_type;
    }
    if (options.native_status) {
      phenologyWhere.species = {
        native_status: options.native_status,
      };
    }

    const phenologyRecords = await prisma.plantPhenology.findMany({
      where: phenologyWhere,
      include: {
        source: true,
        ecological_region: true,
        species: {
          include: {
            ecological_region: true,
            reference: true,
          },
        },
      },
      orderBy: [
        { species: { scientific_name: 'asc' } },
        { event_type: 'asc' },
      ],
    });

    // Agrupamos por (species_id, ecological_region_id)
    const grouped = new Map<string, SeasonalFloraItem>();

    for (const record of phenologyRecords) {
      const key = `${record.species_id}_${record.ecological_region_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          species: this.speciesToEntity(record.species),
          phenology: [],
          ecological_region: {
            id: record.ecological_region.id,
            code: record.ecological_region.code,
            name: record.ecological_region.name,
            biome: record.ecological_region.biome,
            description: record.ecological_region.description,
            created_at: record.ecological_region.created_at,
            updated_at: record.ecological_region.updated_at,
          },
        });
      }

      const item = grouped.get(key)!;
      item.phenology.push(this.phenologyToEntity(record));
    }

    return Array.from(grouped.values());
  }

  async createSpecies(dto: CreateRegionalSpeciesDTO): Promise<RegionalPlantSpeciesEntity> {
    const id = dto.id || generateUUIDv7();
    const common_names = dto.common_names
      ? (dto.common_names as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

    try {
      const record = await prisma.regionalPlantSpecies.create({
        data: {
          id,
          scientific_name: dto.scientific_name.trim(),
          canonical_name: dto.canonical_name?.trim() ?? null,
          family: dto.family?.trim() ?? null,
          common_names,
          native_status: dto.native_status ?? 'NATIVE',
          ecological_region_id: dto.ecological_region_id,
          reference_id: dto.reference_id ?? null,
          growth_habit: dto.growth_habit?.trim() ?? null,
          conservation_status: dto.conservation_status?.trim() ?? null,
          notes: dto.notes ?? null,
        },
        include: {
          ecological_region: true,
          reference: true,
          phenology_records: {
            include: { source: true },
          },
        },
      });
      return this.speciesToEntity(record);
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.findSpeciesByScientificNameAndRegion(
          dto.scientific_name,
          dto.ecological_region_id
        );
        if (existing) return existing;
      }
      throw err;
    }
  }

  async createPhenology(dto: CreatePlantPhenologyDTO): Promise<PlantPhenologyEntity> {
    const id = dto.id || generateUUIDv7();

    const record = await prisma.plantPhenology.create({
      data: {
        id,
        species_id: dto.species_id,
        ecological_region_id: dto.ecological_region_id,
        event_type: dto.event_type,
        month: dto.month,
        source_id: dto.source_id,
        notes: dto.notes ?? null,
      },
      include: {
        source: true,
        ecological_region: true,
      },
    });

    return this.phenologyToEntity(record);
  }

  private speciesToEntity(record: {
    id: string;
    scientific_name: string;
    canonical_name: string | null;
    family: string | null;
    common_names: unknown;
    native_status: NativeStatus;
    ecological_region_id: string;
    reference_id: string | null;
    growth_habit: string | null;
    conservation_status: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    ecological_region?: {
      id: string;
      code: string;
      name: string;
      biome: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
    } | null;
    reference?: {
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
    } | null;
    phenology_records?: Array<{
      id: string;
      species_id: string;
      ecological_region_id: string;
      event_type: PhenologyEventType;
      month: number;
      source_id: string;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      source?: {
        id: string;
        name: string;
        type: SourceType;
        url: string | null;
        description: string | null;
        version: string | null;
        created_at: Date;
        updated_at: Date;
      } | null;
    }>;
  }): RegionalPlantSpeciesEntity {
    return {
      id: record.id,
      scientific_name: record.scientific_name,
      canonical_name: record.canonical_name,
      family: record.family,
      common_names: Array.isArray(record.common_names) ? (record.common_names as string[]) : null,
      native_status: record.native_status,
      ecological_region_id: record.ecological_region_id,
      reference_id: record.reference_id,
      growth_habit: record.growth_habit,
      conservation_status: record.conservation_status,
      notes: record.notes,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ecological_region: record.ecological_region
        ? {
            id: record.ecological_region.id,
            code: record.ecological_region.code,
            name: record.ecological_region.name,
            biome: record.ecological_region.biome,
            description: record.ecological_region.description,
            created_at: record.ecological_region.created_at,
            updated_at: record.ecological_region.updated_at,
          }
        : undefined,
      reference: record.reference
        ? {
            id: record.reference.id,
            provider: record.reference.provider,
            external_id: record.reference.external_id,
            scientific_name: record.reference.scientific_name,
            common_names: Array.isArray(record.reference.common_names)
              ? (record.reference.common_names as string[])
              : null,
            reference_care:
              typeof record.reference.reference_care === 'object' && record.reference.reference_care !== null
                ? (record.reference.reference_care as Record<string, unknown>)
                : null,
            image_url: record.reference.image_url,
            fetched_at: record.reference.fetched_at,
            last_sync_at: record.reference.last_sync_at,
            raw_data:
              typeof record.reference.raw_data === 'object' && record.reference.raw_data !== null
                ? (record.reference.raw_data as Record<string, unknown>)
                : {},
          }
        : null,
      phenology_records: record.phenology_records?.map((pr) => this.phenologyToEntity(pr)),
    };
  }

  private phenologyToEntity(record: {
    id: string;
    species_id: string;
    ecological_region_id: string;
    event_type: PhenologyEventType;
    month: number;
    source_id: string;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    source?: {
      id: string;
      name: string;
      type: SourceType;
      url: string | null;
      description: string | null;
      version: string | null;
      created_at: Date;
      updated_at: Date;
    } | null;
    ecological_region?: {
      id: string;
      code: string;
      name: string;
      biome: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
    } | null;
  }): PlantPhenologyEntity {
    return {
      id: record.id,
      species_id: record.species_id,
      ecological_region_id: record.ecological_region_id,
      event_type: record.event_type,
      month: record.month,
      source_id: record.source_id,
      notes: record.notes,
      created_at: record.created_at,
      updated_at: record.updated_at,
      source: record.source
        ? {
            id: record.source.id,
            name: record.source.name,
            type: record.source.type,
            url: record.source.url,
            description: record.source.description,
            version: record.source.version,
            created_at: record.source.created_at,
            updated_at: record.source.updated_at,
          }
        : undefined,
      ecological_region: record.ecological_region
        ? {
            id: record.ecological_region.id,
            code: record.ecological_region.code,
            name: record.ecological_region.name,
            biome: record.ecological_region.biome,
            description: record.ecological_region.description,
            created_at: record.ecological_region.created_at,
            updated_at: record.ecological_region.updated_at,
          }
        : undefined,
    };
  }
}
