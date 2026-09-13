// Enums del Dominio
export type HealthStatus = 'UNKNOWN' | 'HEALTHY' | 'ATTENTION' | 'RECOVERY';
export type LifecycleStatus = 'ACTIVE' | 'ARCHIVED';
export type EventSource = 'HOME_ASSISTANT' | 'MANUAL';

export const ALLOWED_OPERATIONAL_EVENT_TYPES = [
  'SOIL_MOISTURE_LOW',
  'SOIL_MOISTURE_RECOVERED',
  'SENSOR_OFFLINE',
  'SENSOR_ONLINE',
  'IRRIGATION_STARTED',
  'IRRIGATION_FINISHED',
] as const;

export type PlantOperationalEventType = (typeof ALLOWED_OPERATIONAL_EVENT_TYPES)[number];

// Constantes y Tipos de Proveedores Botánicos
export const OPEN_PLANTBOOK_PROVIDER = 'OPEN_PLANTBOOK' as const;
export type BotanicalReferenceProvider = typeof OPEN_PLANTBOOK_PROVIDER | string;

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
  captured_at?: Date | null;
  taken_at?: Date | null;
  caption?: string | null;
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

// Entidad pura: PlantHomeAssistantBinding
export interface PlantHomeAssistantBindingEntity {
  id: string;
  plant_id: string;
  moisture_entity_id: string | null;
  battery_entity_id: string | null;
  online_entity_id: string | null;
  stale_entity_id: string | null;
  visual_state_entity_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// Entidad pura: PlantOperationalEvent
export interface PlantOperationalEventEntity {
  id: string;
  plant_id: string;
  source: EventSource;
  event_type: string;
  event_key: string;
  occurred_at: Date;
  received_at: Date;
  value_number: number | null;
  value_text: string | null;
  unit: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
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
  acquisition_date: Date | null;
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
  ha_binding?: PlantHomeAssistantBindingEntity | null;
  events?: PlantOperationalEventEntity[];
}