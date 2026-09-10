import {
  PlantEntity,
  LocationEntity,
  PhotoEntity,
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