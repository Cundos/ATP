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

// ---------------------------------------------------------------------------
// Dynamic Care Context (ATP-CARE-001)
// ---------------------------------------------------------------------------
export type CareAssessmentStatus = 'OK' | 'WATCH' | 'ACTION_RECOMMENDED' | 'DATA_INSUFFICIENT';

export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ConditionClassification = 'LOW' | 'NORMAL' | 'HIGH' | 'UNKNOWN';

export type BatteryClassification = 'NORMAL' | 'LOW' | 'CRITICAL' | 'UNKNOWN';

export type SensorConnectionStatus = 'ONLINE' | 'OFFLINE' | 'STALE' | 'UNKNOWN';

export interface CareTelemetrySnapshot {
  plant_id?: string;
  permanent_code?: string;
  binding_configured?: boolean;
  available?: boolean;
  moisture?: {
    value?: number | null;
    unit?: string | null;
    visual_state?: string | null;
    last_updated?: string | null;
    available?: boolean;
  } | null;
  hardware?: {
    battery?: number | null;
    online?: boolean | null;
    stale?: boolean | null;
    last_seen?: string | null;
    available?: boolean;
  } | null;
  error_reason?: string | null;
}

export interface CareRecommendation {
  code: string;
  priority: RecommendationPriority;
  title: string;
  explanation: string;
  evidence: string[];
}

export interface SoilMoistureCondition {
  value: number | null;
  unit: string | null;
  observed_at: string | null;
  min_reference: number | null;
  max_reference: number | null;
  classification: ConditionClassification;
}

export interface BatteryCondition {
  value: number | null;
  unit: string | null;
  classification: BatteryClassification;
}

export interface CareDataQuality {
  has_telemetry?: boolean;
  has_botanical_reference?: boolean;
  has_recent_events?: boolean;
  has_photos?: boolean;
  telemetry_available?: boolean;
  telemetry_stale?: boolean;
  reference_available?: boolean;
  recent_history_available?: boolean;
  warnings: string[];
}

export interface CurrentConditions {
  soil_moisture: SoilMoistureCondition;
  battery: BatteryCondition;
  sensor_status: SensorConnectionStatus;
}

export interface RecentCareContext {
  last_operational_events: PlantOperationalEventEntity[];
  last_photo_at?: string | null;
  recent_photo_caption?: string | null;
}

export interface CareAssessment {
  status: CareAssessmentStatus;
  headline: string;
  summary: string;
  recommendations: CareRecommendation[];
}

export interface PlantCareContextDTO {
  plant_id?: string;
  permanent_code?: string;
  evaluated_at?: string;
  plant?: {
    permanent_code: string;
    common_name: string;
    scientific_name: string | null;
    health_status: HealthStatus;
  };
  data_quality: CareDataQuality;
  current_conditions: CurrentConditions;
  recent_context: RecentCareContext;
  assessment: CareAssessment;
}

// ---------------------------------------------------------------------------
// Regional & Seasonal Flora Domain (ATP-ECO-001A)
// ---------------------------------------------------------------------------
export type NativeStatus = 'NATIVE' | 'NON_NATIVE' | 'ENDEMIC' | 'INTRODUCED_NATURALIZED';
export type PhenologyEventType = 'SPROUTING' | 'FLOWERING' | 'FRUITING' | 'SOWING' | 'PLANTING';
export type SourceType =
  | 'BOTANICAL_INSTITUTION'
  | 'GOVERNMENT_DATASET'
  | 'HERBARIUM'
  | 'SCIENTIFIC_PUBLICATION'
  | 'MANUAL_CURATION';

export interface DataSourceEntity {
  id: string;
  name: string;
  type: SourceType;
  url: string | null;
  description: string | null;
  version: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EcologicalRegionEntity {
  id: string;
  code: string;
  name: string;
  biome: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface GrowingRegionEntity {
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
  ecological_regions?: (GrowingRegionEcologicalRegionEntity & { ecological_region?: EcologicalRegionEntity })[];
}

export interface GrowingRegionEcologicalRegionEntity {
  growing_region_id: string;
  ecological_region_id: string;
  is_primary: boolean;
  notes: string | null;
  created_at: Date;
  ecological_region?: EcologicalRegionEntity;
}

export interface RegionalPlantSpeciesEntity {
  id: string;
  scientific_name: string;
  canonical_name: string | null;
  family: string | null;
  common_names: string[] | null;
  native_status: NativeStatus;
  ecological_region_id: string;
  reference_id: string | null;
  growth_habit: string | null;
  conservation_status: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;

  ecological_region?: EcologicalRegionEntity;
  reference?: PlantReferenceEntity | null;
  phenology_records?: PlantPhenologyEntity[];
}

export interface PlantPhenologyEntity {
  id: string;
  species_id: string;
  ecological_region_id: string;
  event_type: PhenologyEventType;
  month: number;
  source_id: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;

  species?: RegionalPlantSpeciesEntity;
  ecological_region?: EcologicalRegionEntity;
  source?: DataSourceEntity;
}