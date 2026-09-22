import {
  PlantEntity,
  PlantReferenceEntity,
  PlantOperationalEventEntity,
  PhotoEntity,
  PlantCareContextDTO,
  CareRecommendation,
  CareAssessmentStatus,
  ConditionClassification,
  SensorConnectionStatus,
  BatteryClassification,
  CareTelemetrySnapshot,
} from '../entities';

export interface EvaluateCareContextInput {
  plant: PlantEntity;
  telemetry?: CareTelemetrySnapshot | null;
  reference?: PlantReferenceEntity | null;
  recentEvents?: PlantOperationalEventEntity[];
  latestPhoto?: PhotoEntity | null;
}

/**
 * Motor determinista y explicable de evaluación de contexto de cuidado (ATP-CARE-001).
 * Cero IA generativa, cero llamadas a LLM, cero auto-riego, cero modificación de health_status.
 * 
 * Precedencia de Thresholds:
 * 1. Umbrales operacionales explícitos vinculados al ejemplar/sensor (si existieran).
 * 2. PlantReference / Open Plantbook (min_soil_moist, max_soil_moist).
 * 3. Sin threshold => Clasificación UNKNOWN (nunca se inventan thresholds).
 */
export function evaluatePlantCareContext(input: EvaluateCareContextInput): PlantCareContextDTO {
  const { plant, telemetry, recentEvents = [], latestPhoto } = input;
  const reference = input.reference !== undefined ? input.reference : plant.reference;

  // 1. Extraer umbrales de referencia botánica
  const rawCare = (reference?.reference_care && typeof reference.reference_care === 'object' && !Array.isArray(reference.reference_care))
    ? (reference.reference_care as Record<string, unknown>)
    : {};

  const minSoilMoist = typeof rawCare.min_soil_moist === 'number' && Number.isFinite(rawCare.min_soil_moist)
    ? rawCare.min_soil_moist
    : null;

  const maxSoilMoist = typeof rawCare.max_soil_moist === 'number' && Number.isFinite(rawCare.max_soil_moist)
    ? rawCare.max_soil_moist
    : null;

  // 2. Evaluar telemetría y calidad de datos
  const telemetryConfigured = Boolean(telemetry?.binding_configured);
  const telemetryAvailable = Boolean(telemetry?.available && (telemetry.moisture?.available || telemetry.hardware?.available));
  const telemetryStale = Boolean(telemetry?.hardware?.stale === true);
  const sensorOnline = telemetry?.hardware?.online;

  let sensorStatus: SensorConnectionStatus = 'UNKNOWN';
  if (telemetryConfigured) {
    if (sensorOnline === false) {
      sensorStatus = 'OFFLINE';
    } else if (telemetryStale) {
      sensorStatus = 'STALE';
    } else if (sensorOnline === true || telemetryAvailable) {
      sensorStatus = 'ONLINE';
    } else {
      sensorStatus = 'UNKNOWN';
    }
  }

  const warnings: string[] = [];
  if (sensorStatus === 'OFFLINE') {
    warnings.push('Sensor de monitoreo desconectado (fuera de línea).');
  } else if (sensorStatus === 'STALE') {
    warnings.push('La lectura del sensor está desactualizada (stale).');
  }

  const batteryVal = telemetry?.hardware?.battery !== undefined ? telemetry?.hardware?.battery : null;
  let batteryClassification: BatteryClassification = 'UNKNOWN';
  if (batteryVal !== null && Number.isFinite(batteryVal)) {
    if (batteryVal <= 15) {
      batteryClassification = 'CRITICAL';
      warnings.push(`Nivel de batería crítico (${batteryVal}%).`);
    } else if (batteryVal <= 25) {
      batteryClassification = 'LOW';
      warnings.push(`Nivel de batería bajo (${batteryVal}%).`);
    } else {
      batteryClassification = 'NORMAL';
    }
  }

  // 3. Evaluar humedad de suelo (precedencia: si está stale/offline o no hay lectura => UNKNOWN)
  const moistureVal = telemetry?.moisture?.available && typeof telemetry.moisture.value === 'number' && Number.isFinite(telemetry.moisture.value)
    ? telemetry.moisture.value
    : null;

  let moistureClassification: ConditionClassification = 'UNKNOWN';
  if (sensorStatus === 'OFFLINE' || sensorStatus === 'STALE') {
    moistureClassification = 'UNKNOWN';
  } else if (moistureVal !== null) {
    if (minSoilMoist !== null && moistureVal < minSoilMoist) {
      moistureClassification = 'LOW';
    } else if (maxSoilMoist !== null && moistureVal > maxSoilMoist) {
      moistureClassification = 'HIGH';
    } else if (minSoilMoist !== null || maxSoilMoist !== null) {
      moistureClassification = 'NORMAL';
    } else {
      moistureClassification = 'UNKNOWN';
    }
  }

  // 4. Historial operacional
  const recentLowEvents = recentEvents.filter((e) => e.event_type === 'SOIL_MOISTURE_LOW');
  const recentHighEvents = recentEvents.filter((e) => e.event_type === 'SOIL_MOISTURE_HIGH');
  const hasPersistentHigh = recentHighEvents.length >= 2;

  // 5. Determinar assessment y recomendaciones
  let status: CareAssessmentStatus = 'OK';
  let headline = 'Condiciones de cuidado evaluadas';
  let summary = 'El ejemplar cuenta con condiciones estables.';
  const recommendations: CareRecommendation[] = [];

  const effectivePhotoDate = latestPhoto?.taken_at || latestPhoto?.created_at || null;

  if (sensorStatus === 'OFFLINE') {
    status = 'WATCH';
    headline = 'Sensor de monitoreo fuera de línea';
    summary = 'El sensor vinculado no reporta conexión activa con Home Assistant. Las condiciones en tiempo real no pueden verificarse.';
    recommendations.push({
      code: 'CHECK_SENSOR_CONNECTIVITY',
      priority: 'HIGH',
      title: 'Verificar conexión del sensor',
      explanation: 'El sensor asociado a la planta está offline. Revisar alcance de red Zigbee/Bluetooth o estado de la batería.',
      evidence: [
        'Estado del sensor: OFFLINE',
        ...(telemetry?.hardware?.last_seen ? [`Último contacto: ${telemetry.hardware.last_seen}`] : []),
      ],
    });
  } else if (sensorStatus === 'STALE') {
    status = 'WATCH';
    headline = 'Telemetría desactualizada';
    summary = 'Las lecturas recibidas desde Home Assistant no se han actualizado en el período esperado.';
    recommendations.push({
      code: 'CHECK_SENSOR_FRESHNESS',
      priority: 'MEDIUM',
      title: 'Comprobar transmisión del sensor',
      explanation: 'Las mediciones del sensor presentan retraso. Verificar si el dispositivo está reportando normalmente.',
      evidence: [
        'Estado de telemetría: STALE',
        ...(telemetry?.moisture?.last_updated ? [`Última actualización: ${telemetry.moisture.last_updated}`] : []),
      ],
    });
  } else if (moistureClassification === 'LOW') {
    status = 'ACTION_RECOMMENDED';
    headline = 'Humedad de suelo por debajo del rango óptimo';
    summary = `La humedad actual (${moistureVal}%) es inferior al mínimo recomendado (${minSoilMoist}%).`;
    recommendations.push({
      code: 'WATERING_RECOMMENDED',
      priority: 'HIGH',
      title: 'Evaluar riego del ejemplar',
      explanation: 'La humedad del sustrato descendió por debajo del umbral mínimo de referencia botánica. Verificar el sustrato y regar si corresponde.',
      evidence: [
        `Humedad actual: ${moistureVal}%`,
        `Mínimo de referencia: ${minSoilMoist}%`,
        ...(telemetry?.moisture?.last_updated ? [`Última lectura: ${telemetry.moisture.last_updated}`] : []),
        ...(recentLowEvents.length > 0 ? [`Eventos recientes de baja humedad: ${recentLowEvents.length}`] : []),
      ],
    });
  } else if (moistureClassification === 'HIGH') {
    status = 'WATCH';
    headline = hasPersistentHigh ? 'Humedad elevada persistente' : 'Humedad por encima del rango óptimo';
    summary = `La humedad actual (${moistureVal}%) supera el máximo recomendado (${maxSoilMoist}%).`;
    recommendations.push({
      code: 'CHECK_DRAINAGE_AND_AERATION',
      priority: hasPersistentHigh ? 'HIGH' : 'MEDIUM',
      title: 'Verificar drenaje y espaciar riegos',
      explanation: 'El sustrato retiene más humedad de la recomendada para la especie. Asegurar que el drenaje sea fluido para evitar asfixia radicular.',
      evidence: [
        `Humedad actual: ${moistureVal}%`,
        `Máximo de referencia: ${maxSoilMoist}%`,
        ...(hasPersistentHigh ? ['Historial: Múltiples eventos recientes de humedad elevada'] : []),
        ...(telemetry?.moisture?.last_updated ? [`Última lectura: ${telemetry.moisture.last_updated}`] : []),
      ],
    });
  } else if (moistureClassification === 'NORMAL') {
    status = 'OK';
    headline = 'Condiciones de humedad en rango óptimo';
    summary = `La humedad del sustrato (${moistureVal}%) se encuentra dentro del rango adecuado de referencia (${minSoilMoist}–${maxSoilMoist}%).`;
  } else if (!telemetryAvailable && reference) {
    status = 'OK';
    headline = 'Cuidado guiado por referencia botánica';
    summary = `Sin telemetría en tiempo real. Se aplican las pautas botánicas generales de la especie ${plant.scientific_name || plant.common_name}.`;
    if (typeof rawCare.watering === 'string' && rawCare.watering.trim().length > 0) {
      recommendations.push({
        code: 'BOTANICAL_WATERING_GUIDELINE',
        priority: 'LOW',
        title: 'Pauta de riego general',
        explanation: rawCare.watering.trim(),
        evidence: ['Ficha botánica de referencia (Open Plantbook)'],
      });
    }
  } else if (telemetryAvailable && moistureClassification === 'UNKNOWN') {
    status = 'OK';
    headline = 'Lectura de telemetría activa sin rango de referencia';
    summary = `Humedad actual del sustrato: ${moistureVal !== null ? `${moistureVal}%` : 'no disponible'}. No se disponen de umbrales botánicos para clasificar el nivel de humedad.`;
  } else {
    status = 'DATA_INSUFFICIENT';
    headline = 'Datos insuficientes para evaluación automática';
    summary = 'El ejemplar no posee telemetría en tiempo real ni especie botánica de referencia vinculada.';
    recommendations.push({
      code: 'LINK_BOTANICAL_OR_SENSOR',
      priority: 'LOW',
      title: 'Vincular ficha de referencia o sensor',
      explanation: 'Asigná una especie de referencia al editar la planta o vinculá un sensor en Home Assistant para recibir evaluaciones contextuales completas.',
      evidence: ['Sin sensor de telemetría vinculado', 'Sin ficha botánica asociada'],
    });
  }

  // Recomendación por batería baja o crítica
  if (batteryClassification === 'CRITICAL' || batteryClassification === 'LOW') {
    recommendations.push({
      code: 'REPLACE_BATTERY',
      priority: batteryClassification === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      title: batteryClassification === 'CRITICAL' ? 'Batería crítica en sensor' : 'Batería baja en sensor',
      explanation: 'El sensor de telemetría presenta bajo nivel de carga. Se recomienda recargar o sustituir la batería.',
      evidence: [`Nivel de batería: ${batteryVal}%`],
    });
  }

  // Ajuste contextual si el ejemplar físico tiene health_status ATTENTION o RECOVERY
  if (plant.health_status === 'ATTENTION' || plant.health_status === 'RECOVERY') {
    if (status === 'OK') {
      status = 'WATCH';
    }
  }

  return {
    plant_id: plant.id,
    permanent_code: plant.permanent_code,
    evaluated_at: new Date().toISOString(),
    plant: {
      permanent_code: plant.permanent_code,
      common_name: plant.common_name,
      scientific_name: plant.scientific_name,
      health_status: plant.health_status,
    },
    data_quality: {
      has_telemetry: telemetryConfigured && telemetryAvailable,
      has_botanical_reference: Boolean(reference),
      has_recent_events: recentEvents.length > 0,
      has_photos: Boolean(latestPhoto),
      warnings,
    },
    current_conditions: {
      soil_moisture: {
        value: moistureVal,
        unit: telemetry?.moisture?.unit || '%',
        observed_at: telemetry?.moisture?.last_updated || null,
        min_reference: minSoilMoist,
        max_reference: maxSoilMoist,
        classification: moistureClassification,
      },
      battery: {
        value: batteryVal,
        unit: '%',
        classification: batteryClassification,
      },
      sensor_status: sensorStatus,
    },
    recent_context: {
      last_operational_events: recentEvents,
      last_photo_at: (() => {
        if (!effectivePhotoDate) return null;
        try {
          const d = new Date(effectivePhotoDate);
          return isNaN(d.getTime()) ? null : d.toISOString();
        } catch {
          return null;
        }
      })(),
      recent_photo_caption: latestPhoto?.caption || null,
    },
    assessment: {
      status,
      headline,
      summary,
      recommendations,
    },
  };
}
