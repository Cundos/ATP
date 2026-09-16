import {
  PlantEntity,
  LocationEntity,
  PhotoEntity,
  PlantReferenceEntity,
  HealthStatus,
  LifecycleStatus,
} from '../entities';


export interface CreatePlantPersistenceDTO {
  permanent_code: string;
  common_name: string;
  scientific_name?: string | null;
  cultivar?: string | null;
  health_status?: HealthStatus;
  acquisition_date?: Date | null;
  notes?: string | null;
  location_id?: string | null;
  reference_id?: string | null;
  pot_info?: string | null;
  substrate_info?: string | null;
  light_conditions?: string | null;
  watering_notes?: string | null;
}

export interface UpdatePlantDTO {
  common_name?: string;
  scientific_name?: string | null;
  cultivar?: string | null;
  health_status?: HealthStatus;
  acquisition_date?: Date | null;
  notes?: string | null;
  location_id?: string | null;
  reference_id?: string | null;
  pot_info?: string | null;
  substrate_info?: string | null;
  light_conditions?: string | null;
  watering_notes?: string | null;
}

export interface PlantFilterOptions {
  lifecycle_status?: LifecycleStatus;
  health_status?: HealthStatus;
  location_id?: string;
  search_query?: string;
  order_by?: 'permanent_code_asc' | 'created_at_desc';
}

export interface IPlantRepository {
  findById(id: string): Promise<PlantEntity | null>;
  findByPermanentCode(permanent_code: string): Promise<PlantEntity | null>;
  findAll(filters?: PlantFilterOptions): Promise<PlantEntity[]>;
  create(dto: CreatePlantPersistenceDTO): Promise<PlantEntity>;
  update(id: string, dto: UpdatePlantDTO): Promise<PlantEntity>;
  archive(id: string): Promise<PlantEntity>;
  restore(id: string): Promise<PlantEntity>;
  getNextSequenceValue(): Promise<number>;
}

export interface CreateLocationDTO {
  name: string;
}

export interface UpdateLocationDTO {
  name: string;
}

export interface ILocationRepository {
  findById(id: string): Promise<LocationEntity | null>;
  findByName(name: string): Promise<LocationEntity | null>;
  findAll(status?: LifecycleStatus): Promise<LocationEntity[]>;
  create(dto: CreateLocationDTO): Promise<LocationEntity>;
  update(id: string, dto: UpdateLocationDTO): Promise<LocationEntity>;
  archive(id: string): Promise<LocationEntity>;
  restore(id: string): Promise<LocationEntity>;
}

export interface CreatePhotoPersistenceDTO {
  id?: string;
  plant_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size?: number | null;
  is_primary?: boolean;
  captured_at?: Date | null;
  taken_at?: Date | null;
  caption?: string | null;
}

export interface UpdatePhotoMetadataDTO {
  taken_at?: Date | null;
  caption?: string | null;
}

export interface IPhotoRepository {
  findById(id: string): Promise<PhotoEntity | null>;
  findByFilePath(filePath: string): Promise<PhotoEntity | null>;
  listByPlant(plantId: string): Promise<PhotoEntity[]>;
  findPrimaryByPlant(plantId: string): Promise<PhotoEntity | null>;
  create(dto: CreatePhotoPersistenceDTO): Promise<PhotoEntity>;
  setPrimary(plantId: string, photoId: string): Promise<PhotoEntity>;
  updateMetadata(id: string, dto: UpdatePhotoMetadataDTO): Promise<PhotoEntity>;
  delete(id: string): Promise<void>;
}

export interface CreatePlantReferencePersistenceDTO {
  id?: string;
  provider: string;
  external_id: string;
  scientific_name: string;
  common_names?: string[] | null;
  reference_care?: Record<string, unknown> | null;
  image_url?: string | null;
  fetched_at?: Date;
  last_sync_at?: Date;
  raw_data: Record<string, unknown>;
}

export interface IPlantReferenceRepository {
  findById(id: string): Promise<PlantReferenceEntity | null>;
  findByProviderAndExternalId(
    provider: string,
    externalId: string
  ): Promise<PlantReferenceEntity | null>;
  create(dto: CreatePlantReferencePersistenceDTO): Promise<PlantReferenceEntity>;
}

export interface UpsertPlantHomeAssistantBindingDTO {
  plant_id: string;
  moisture_entity_id?: string | null;
  battery_entity_id?: string | null;
  online_entity_id?: string | null;
  stale_entity_id?: string | null;
  visual_state_entity_id?: string | null;
}

export interface IPlantHomeAssistantBindingRepository {
  findByPlantId(plantId: string): Promise<import('../entities').PlantHomeAssistantBindingEntity | null>;
  findByPermanentCode(permanentCode: string): Promise<import('../entities').PlantHomeAssistantBindingEntity | null>;
  upsert(dto: UpsertPlantHomeAssistantBindingDTO): Promise<import('../entities').PlantHomeAssistantBindingEntity>;
  deleteByPlantId(plantId: string): Promise<void>;
}

export interface CreatePlantOperationalEventPersistenceDTO {
  plant_id: string;
  source?: import('../entities').EventSource;
  event_type: string;
  event_key: string;
  occurred_at: Date;
  received_at?: Date;
  value_number?: number | null;
  value_text?: string | null;
  unit?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IPlantOperationalEventRepository {
  findByEventKey(eventKey: string): Promise<import('../entities').PlantOperationalEventEntity | null>;
  create(dto: CreatePlantOperationalEventPersistenceDTO): Promise<import('../entities').PlantOperationalEventEntity>;
  findRecentByPlantId(plantId: string, limit?: number): Promise<import('../entities').PlantOperationalEventEntity[]>;
}

// ---------------------------------------------------------------------------
// Regional & Seasonal Flora Repositories (ATP-ECO-001A)
// ---------------------------------------------------------------------------
export interface CreateDataSourceDTO {
  id?: string;
  name: string;
  type: import('../entities').SourceType;
  url?: string | null;
  description?: string | null;
  version?: string | null;
}

export interface IDataSourceRepository {
  findById(id: string): Promise<import('../entities').DataSourceEntity | null>;
  findByName(name: string): Promise<import('../entities').DataSourceEntity | null>;
  findAll(): Promise<import('../entities').DataSourceEntity[]>;
  create(dto: CreateDataSourceDTO): Promise<import('../entities').DataSourceEntity>;
}

export interface CreateEcologicalRegionDTO {
  id?: string;
  code: string;
  name: string;
  biome: string;
  description?: string | null;
}

export interface IEcologicalRegionRepository {
  findById(id: string): Promise<import('../entities').EcologicalRegionEntity | null>;
  findByCode(code: string): Promise<import('../entities').EcologicalRegionEntity | null>;
  findAll(): Promise<import('../entities').EcologicalRegionEntity[]>;
  create(dto: CreateEcologicalRegionDTO): Promise<import('../entities').EcologicalRegionEntity>;
}

export interface CreateGrowingRegionDTO {
  id?: string;
  code: string;
  name: string;
  country: string;
  province: string;
  locality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
}

export interface LinkGrowingRegionEcologicalRegionDTO {
  growing_region_id: string;
  ecological_region_id: string;
  is_primary?: boolean;
  notes?: string | null;
}

export interface IGrowingRegionRepository {
  findById(id: string): Promise<import('../entities').GrowingRegionEntity | null>;
  findByCode(code: string): Promise<import('../entities').GrowingRegionEntity | null>;
  findAll(): Promise<import('../entities').GrowingRegionEntity[]>;
  create(dto: CreateGrowingRegionDTO): Promise<import('../entities').GrowingRegionEntity>;
  linkEcologicalRegion(dto: LinkGrowingRegionEcologicalRegionDTO): Promise<void>;
}

export interface CreateRegionalSpeciesDTO {
  id?: string;
  scientific_name: string;
  canonical_name?: string | null;
  family?: string | null;
  common_names?: string[] | null;
  native_status?: import('../entities').NativeStatus;
  ecological_region_id: string;
  reference_id?: string | null;
  growth_habit?: string | null;
  conservation_status?: string | null;
  notes?: string | null;
}

export interface CreatePlantPhenologyDTO {
  id?: string;
  species_id: string;
  ecological_region_id: string;
  event_type: import('../entities').PhenologyEventType;
  month: number;
  source_id: string;
  notes?: string | null;
}

export interface SeasonalFloraFilterOptions {
  ecological_region_id?: string;
  growing_region_code?: string;
  month: number;
  event_type?: import('../entities').PhenologyEventType;
  native_status?: import('../entities').NativeStatus;
}

export interface NativeFloraFilterOptions {
  ecological_region_id?: string;
  growing_region_code?: string;
  growth_habit?: string;
  native_status?: import('../entities').NativeStatus;
}

export interface SeasonalFloraItem {
  species: import('../entities').RegionalPlantSpeciesEntity;
  phenology: import('../entities').PlantPhenologyEntity[];
  ecological_region: import('../entities').EcologicalRegionEntity;
}

export interface IRegionalFloraRepository {
  findSpeciesById(id: string): Promise<import('../entities').RegionalPlantSpeciesEntity | null>;
  findSpeciesByScientificNameAndRegion(
    scientificName: string,
    ecologicalRegionId: string
  ): Promise<import('../entities').RegionalPlantSpeciesEntity | null>;
  listSpeciesByRegion(options: NativeFloraFilterOptions): Promise<import('../entities').RegionalPlantSpeciesEntity[]>;
  listSeasonalEvents(options: SeasonalFloraFilterOptions): Promise<SeasonalFloraItem[]>;
  createSpecies(dto: CreateRegionalSpeciesDTO): Promise<import('../entities').RegionalPlantSpeciesEntity>;
  createPhenology(dto: CreatePlantPhenologyDTO): Promise<import('../entities').PlantPhenologyEntity>;
}

