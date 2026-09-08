import {
  PlantEntity,
  LocationEntity,
  HealthStatus,
  LifecycleStatus,
} from '../entities';

export interface CreatePlantDTO {
  common_name: string;
  scientific_name?: string | null;
  cultivar?: string | null;
  health_status?: HealthStatus;
  acquisition_date?: Date;
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
  acquisition_date?: Date;
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
}

export interface IPlantRepository {
  findById(id: string): Promise<PlantEntity | null>;
  findByPermanentCode(permanent_code: string): Promise<PlantEntity | null>;
  findAll(filters?: PlantFilterOptions): Promise<PlantEntity[]>;
  create(dto: CreatePlantDTO): Promise<PlantEntity>;
  update(id: string, dto: UpdatePlantDTO): Promise<PlantEntity>;
  archive(id: string): Promise<PlantEntity>;
  restore(id: string): Promise<PlantEntity>;
  getNextPermanentCode(): Promise<string>;
}

export interface CreateLocationDTO {
  name: string;
}

export interface UpdateLocationDTO {
  name: string;
}

export interface ILocationRepository {
  findById(id: string): Promise<LocationEntity | null>;
  findAll(status?: LifecycleStatus): Promise<LocationEntity[]>;
  create(dto: CreateLocationDTO): Promise<LocationEntity>;
  update(id: string, dto: UpdateLocationDTO): Promise<LocationEntity>;
  archive(id: string): Promise<LocationEntity>;
  restore(id: string): Promise<LocationEntity>;
}