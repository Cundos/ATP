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
}

export interface IPhotoRepository {
  findById(id: string): Promise<PhotoEntity | null>;
  findByFilePath(filePath: string): Promise<PhotoEntity | null>;
  listByPlant(plantId: string): Promise<PhotoEntity[]>;
  findPrimaryByPlant(plantId: string): Promise<PhotoEntity | null>;
  create(dto: CreatePhotoPersistenceDTO): Promise<PhotoEntity>;
  setPrimary(plantId: string, photoId: string): Promise<PhotoEntity>;
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
