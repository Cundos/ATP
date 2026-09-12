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
  scientificName: string;
  commonNamesFormatted: string | null;
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

const CARE_GUIDELINE_TRANSLATIONS: Record<string, string> = {
  // Riego (Watering)
  'likes wet envs; water when soil dries, mist leaves often in summer.':
    'Prefiere ambientes húmedos; regar cuando el sustrato esté seco y pulverizar las hojas frecuentemente en verano.',
  'thrives in wet environments; water when soil dries, may mist leaves.':
    'Se desarrolla bien en ambientes húmedos; regar cuando el sustrato esté seco, se puede pulverizar el follaje.',
  'likes wet envs; sprays water for moisture; reduce watering in winter.':
    'Prefiere ambientes húmedos; pulverizar para mantener la humedad; reducir el riego en invierno.',
  'prefers wet environments; water thoroughly when soil is dry; avoid saturated conditions.':
    'Prefiere ambientes húmedos; regar en profundidad cuando el sustrato esté seco; evitar encharcamientos.',
  'allow soil to dry between waterings; avoid overwatering.':
    'Dejar secar el sustrato entre riegos; evitar el exceso de agua.',

  // Luz / Exposición Solar (Sunlight)
  'avoid strong direct light in summer; tolerate 3-4 hours of sun in winter.':
    'Evitar luz directa intensa en verano; tolera 3 a 4 horas de sol suave en invierno.',
  'likes light, discolors, lacks luster, defoliates with insufficient light':
    'Requiere buena iluminación; pierde color, brillo y puede defoliar con luz insuficiente.',
  'resistant to shade; place in bright, indirect light; allow 2-3 hours of sunlight in winter.':
    'Tolerante a la sombra; ubicar con luz indirecta brillante; tolera 2 a 3 horas de sol suave en invierno.',
  'relatively shade-tolerant, prefers half-shade; leaves stay fresh and green in winter with some sun.':
    'Relativamente tolerante a la sombra, prefiere semisombra; las hojas se mantienen frescas con algo de sol invernal.',
  'durable in shaded areas; place in scattered light.':
    'Resistente en zonas sombreadas; ubicar con luz filtrada o difusa.',
  'bright indirect light to low light.':
    'Luz indirecta brillante a semisombra o baja iluminación.',

  // Sustrato (Soil)
  'soil enriched with specific nutrients':
    'Sustrato fértil enriquecido con nutrientes específicos.',
  'clay soil with high water-holding capacity or specific nutrients':
    'Sustrato con buena retención de humedad y rico en nutrientes.',
  'peat, soil with nutrients, or hydroponics':
    'Turba, sustrato nutritivo o cultivo hidropónico.',
  'peat mixed with coarse sand or hydroponics':
    'Turba mezclada con arena gruesa o cultivo hidropónico.',
  'soil slightly acidic, loose in texture or rich in specific nutrients':
    'Sustrato ligeramente ácido, de textura suelta y rico en nutrientes.',
  'well-draining potting mix.':
    'Sustrato liviano con excelente drenaje.',

  // Poda (Pruning)
  'remove dead, yellow and diseased leaves promptly':
    'Retirar con prontitud hojas secas, amarillentas o enfermas.',
  'remove dead leaves promptly':
    'Retirar hojas secas con prontitud.',
  'timely remove aged, dead, rotten, diseased leaves.':
    'Retirar oportunamente hojas envejecidas, secas, deterioradas o enfermas.',
  'timely remove dead andyellowish leaves.':
    'Retirar oportunamente hojas secas o amarillentas.',
  'remove aged, yellowing, and diseased leaves promptly':
    'Retirar con prontitud hojas envejecidas, amarillentas o enfermas.',

  // Fertilización (Fertilization)
  'dilute fertilizers as directed; apply 1-2 times monthly in spring and autumn.':
    'Diluir fertilizante según indicación; aplicar 1 a 2 veces al mes en primavera y otoño.',
  'dilute fertilizers as directed; apply 1-2 times monthly.':
    'Diluir fertilizante según indicación; aplicar 1 a 2 veces al mes.',
  'dilute fertilizers as directed; apply once a month.':
    'Diluir fertilizante según indicación; aplicar una vez al mes.',
  'dilute fertilizers as instructed; apply once every 15 days from april to september.':
    'Diluir fertilizante según indicación; aplicar cada 15 días durante la temporada de crecimiento.',
};

function translateCareGuideline(text: string | null): string | null {
  if (!text) return null;
  const key = text.trim().toLowerCase();
  if (CARE_GUIDELINE_TRANSLATIONS[key]) {
    return CARE_GUIDELINE_TRANSLATIONS[key];
  }
  const keyNoDot = key.endsWith('.') ? key.slice(0, -1) : key;
  if (CARE_GUIDELINE_TRANSLATIONS[keyNoDot]) {
    return CARE_GUIDELINE_TRANSLATIONS[keyNoDot];
  }
  return text.trim();
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
 * presentation-ready BotanicalReferenceViewModel without exposing raw_data,
 * raw reference_care, external IDs or internal database UUIDs.
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
  let commonNamesFormatted: string | null = null;
  if (Array.isArray(reference.common_names)) {
    const validNames = reference.common_names
      .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      .map((n) => n.trim());
    if (validNames.length > 0) {
      commonNamesFormatted = validNames.join(' · ');
    }
  }

  // Parse provenance and timestamps
  const source =
    reference.provider === 'OPEN_PLANTBOOK'
      ? 'Open Plantbook'
      : reference.provider || 'Proveedor botánico';
  const timestamp = reference.last_sync_at || reference.fetched_at || null;
  let sourceProvenanceText = `Fuente: ${source}`;

  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      const formattedDate = new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d);
      sourceProvenanceText = `Fuente: ${source} · consultado el ${formattedDate}`;
    }
  }

  // Parse image URL
  const imageUrl =
    typeof reference.image_url === 'string' &&
    reference.image_url.trim().length > 0
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

  // Qualitative Care Guidelines (with translation to Spanish)
  const watering = translateCareGuideline(parseStringField(rawCare.watering));
  const sunlight = translateCareGuideline(parseStringField(rawCare.sunlight));
  const soil = translateCareGuideline(parseStringField(rawCare.soil));
  const pruning = translateCareGuideline(parseStringField(rawCare.pruning));
  const fertilization = translateCareGuideline(parseStringField(rawCare.fertilization));

  const hasCareGuidelines = Boolean(
    watering || sunlight || soil || pruning || fertilization
  );

  return {
    scientificName,
    commonNamesFormatted,
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
