// Enums del Dominio
export type HealthStatus = 'UNKNOWN' | 'HEALTHY' | 'ATTENTION' | 'RECOVERY';
export type LifecycleStatus = 'ACTIVE' | 'ARCHIVED';

// Entidad pura: Location
export interface LocationEntity {
  id: string;
  name: string;
  lifecycle_status: LifecycleStatus;
  created_at: Date;
  updated_at: Date;
}

// Entidad pura: PlantReference
export interface PlantReferenceEntity {
  id: string;
  provider: string;
  external_id: string;
  scientific_name: string;
  common_names: string[] | null;
  reference_care: Record<string, unknown> | null;
  image_url: string | null;
  fetched_at: Date;
  last_sync_at: Date;
  raw_data: Record<string, unknown>;
}

// Entidad pura: Photo
export interface PhotoEntity {
  id: string;
  plant_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  is_primary: boolean;
  captured_at: Date | null;
  created_at: Date;
}

// Entidad pura: PlantCultivationProfile
export interface PlantCultivationProfileEntity {
  id: string;
  plant_id: string;
  pot_info: string | null;
  substrate_info: string | null;
  light_conditions: string | null;
  watering_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Entidad pura: Plant
export interface PlantEntity {
  id: string;
  permanent_code: string;
  common_name: string;
  scientific_name: string | null;
  cultivar: string | null;
  health_status: HealthStatus;
  lifecycle_status: LifecycleStatus;
  acquisition_date: Date;
  notes: string | null;
  location_id: string | null;
  reference_id: string | null;
  created_at: Date;
  updated_at: Date;

  // Relaciones cargadas opcionalmente
  location?: LocationEntity | null;
  reference?: PlantReferenceEntity | null;
  photos?: PhotoEntity[];
  profile?: PlantCultivationProfileEntity | null;
}