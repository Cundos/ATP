import { PlantReferenceEntity } from '@/core/domain/entities';

export interface BotanicalReferenceMetrics {
  temperature: string | null;
  light: string | null;
  environmentalHumidity: string | null;
  soilMoisture: string | null;
  soilEc: string | null;
}

export interface BotanicalReferenceCareGuidelines {
  watering: string | null;
  sunlight: string | null;
  soil: string | null;
  pruning: string | null;
  fertilization: string | null;
}

export interface BotanicalReferenceViewModel {
  id: string;
  scientificName: string;
  commonNames: string[] | null;
  commonNamesFormatted: string | null;
  source: string;
  fetchedAt: Date | null;
  fetchedAtFormatted: string | null;
  sourceProvenanceText: string;
  imageUrl: string | null;
  metrics: BotanicalReferenceMetrics;
  hasMetrics: boolean;
  careGuidelines: BotanicalReferenceCareGuidelines;
  hasCareGuidelines: boolean;
}

function formatRange(
  min: unknown,
  max: unknown,
  options: {
    unit?: string;
    isPercent?: boolean;
    useNumberFormat?: boolean;
  } = {}
): string | null {
  const isMinNum = typeof min === 'number' && Number.isFinite(min);
  const isMaxNum = typeof max === 'number' && Number.isFinite(max);

  if (!isMinNum && !isMaxNum) {
    return null;
  }

  const numberFormatter = new Intl.NumberFormat('es-AR');
  const formatVal = (v: number) =>
    options.useNumberFormat ? numberFormatter.format(v) : `${v}`;

  const unitSuffix = options.isPercent
    ? '%'
    : options.unit
      ? ` ${options.unit}`
      : '';

  if (isMinNum && isMaxNum) {
    const minVal = min as number;
    const maxVal = max as number;
    if (minVal === maxVal) {
      return `${formatVal(minVal)}${unitSuffix}`;
    }
    return `${formatVal(minVal)}–${formatVal(maxVal)}${unitSuffix}`;
  }

  if (isMinNum) {
    return `Desde ${formatVal(min as number)}${unitSuffix}`;
  }

  if (isMaxNum) {
    return `Hasta ${formatVal(max as number)}${unitSuffix}`;
  }

  return null;
}

function parseStringField(val: unknown): string | null {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

/**
 * Pure parser converting local PlantReferenceEntity snapshot into a safe,
 * presentation-ready BotanicalReferenceViewModel without exposing raw_data or internal IDs.
 */
export function parseBotanicalReferenceViewModel(
  reference: PlantReferenceEntity | null | undefined
): BotanicalReferenceViewModel | null {
  if (!reference || typeof reference !== 'object') {
    return null;
  }

  const scientificName =
    typeof reference.scientific_name === 'string' &&
    reference.scientific_name.trim().length > 0
      ? reference.scientific_name.trim()
      : 'Especie botánica de referencia';

  // Parse common names
  let commonNamesArray: string[] | null = null;
  let commonNamesFormatted: string | null = null;

  if (Array.isArray(reference.common_names)) {
    const validNames = reference.common_names
      .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      .map((n) => n.trim());
    if (validNames.length > 0) {
      commonNamesArray = validNames;
      commonNamesFormatted = validNames.join(' · ');
    }
  }

  // Parse provenance and timestamps
  const source = reference.provider === 'OPEN_PLANTBOOK' ? 'Open Plantbook' : reference.provider || 'Proveedor botánico';
  const timestamp = reference.last_sync_at || reference.fetched_at || null;
  let fetchedAtDate: Date | null = null;
  let fetchedAtFormatted: string | null = null;
  let sourceProvenanceText = `Fuente: ${source}`;

  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      fetchedAtDate = d;
      fetchedAtFormatted = new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d);
      sourceProvenanceText = `Fuente: ${source} · consultado el ${fetchedAtFormatted}`;
    }
  }

  // Parse image URL
  const imageUrl =
    typeof reference.image_url === 'string' && reference.image_url.trim().length > 0
      ? reference.image_url.trim()
      : null;

  // Safe extraction of reference_care JSONB
  const rawCare =
    typeof reference.reference_care === 'object' &&
    reference.reference_care !== null &&
    !Array.isArray(reference.reference_care)
      ? (reference.reference_care as Record<string, unknown>)
      : {};

  // Metrics
  const temperature = formatRange(rawCare.min_temp, rawCare.max_temp, {
    unit: '°C',
  });
  const light = formatRange(rawCare.min_light_lux, rawCare.max_light_lux, {
    unit: 'lux',
    useNumberFormat: true,
  });
  const environmentalHumidity = formatRange(
    rawCare.min_env_humid,
    rawCare.max_env_humid,
    { isPercent: true }
  );
  const soilMoisture = formatRange(
    rawCare.min_soil_moist,
    rawCare.max_soil_moist,
    { isPercent: true }
  );
  const soilEc = formatRange(rawCare.min_soil_ec, rawCare.max_soil_ec);

  const hasMetrics = Boolean(
    temperature || light || environmentalHumidity || soilMoisture || soilEc
  );

  // Qualitative Care Guidelines
  const watering = parseStringField(rawCare.watering);
  const sunlight = parseStringField(rawCare.sunlight);
  const soil = parseStringField(rawCare.soil);
  const pruning = parseStringField(rawCare.pruning);
  const fertilization = parseStringField(rawCare.fertilization);

  const hasCareGuidelines = Boolean(
    watering || sunlight || soil || pruning || fertilization
  );

  return {
    id: reference.id,
    scientificName,
    commonNames: commonNamesArray,
    commonNamesFormatted,
    source,
    fetchedAt: fetchedAtDate,
    fetchedAtFormatted,
    sourceProvenanceText,
    imageUrl,
    metrics: {
      temperature,
      light,
      environmentalHumidity,
      soilMoisture,
      soilEc,
    },
    hasMetrics,
    careGuidelines: {
      watering,
      sunlight,
      soil,
      pruning,
      fertilization,
    },
    hasCareGuidelines,
  };
}
