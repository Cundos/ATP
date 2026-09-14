import { describe, it, expect } from 'vitest';
import { evaluatePlantCareContext } from '../plantCareContextEngine';
import { PlantEntity, PlantReferenceEntity, PlantOperationalEventEntity, CareTelemetrySnapshot } from '../../entities';

describe('evaluatePlantCareContext (ATP-CARE-001)', () => {
  const basePlant: PlantEntity = {
    id: '0191e4f2-90ab-7000-8000-000000000001',
    permanent_code: 'AT-PL-007',
    common_name: 'Ficus Lyrata',
    scientific_name: 'Ficus lyrata',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const botanicalRef: PlantReferenceEntity = {
    id: 'ref-001',
    provider: 'open_plantbook',
    external_id: 'ficus-lyrata',
    scientific_name: 'Ficus lyrata',
    common_names: ['Fiddle Leaf Fig'],
    reference_care: {
      min_soil_moist: 30,
      max_soil_moist: 60,
      watering: 'Regar cuando el sustrato se seque en los primeros centímetros.',
    },
    image_url: null,
    raw_data: {},
    fetched_at: new Date('2026-01-01'),
    last_sync_at: new Date('2026-01-01'),
  };

  it('evaluates to OK when soil moisture is within optimal reference range', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 45,
        unit: '%',
        visual_state: 'normal',
        last_updated: '2026-09-13T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 85,
        online: true,
        stale: false,
        last_seen: '2026-09-13T12:00:00Z',
        available: true,
      },
    };

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry,
    });

    expect(result.assessment.status).toBe('OK');
    expect(result.current_conditions.soil_moisture.classification).toBe('NORMAL');
    expect(result.current_conditions.soil_moisture.value).toBe(45);
    expect(result.assessment.headline).toContain('óptimo');
  });

  it('evaluates to ACTION_RECOMMENDED and recommends watering when moisture is below minimum', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 18,
        unit: '%',
        visual_state: 'low',
        last_updated: '2026-09-13T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 90,
        online: true,
        stale: false,
        last_seen: '2026-09-13T12:00:00Z',
        available: true,
      },
    };

    const recentEvents: PlantOperationalEventEntity[] = [
      {
        id: 'ev-1',
        plant_id: basePlant.id,
        source: 'HOME_ASSISTANT',
        event_type: 'SOIL_MOISTURE_LOW',
        event_key: 'ha-low-1',
        occurred_at: new Date('2026-09-13T11:50:00Z'),
        received_at: new Date('2026-09-13T11:50:01Z'),
        value_number: 18,
        value_text: null,
        unit: '%',
        metadata: null,
        created_at: new Date('2026-09-13T11:50:01Z'),
      },
    ];

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry,
      recentEvents,
    });

    expect(result.assessment.status).toBe('ACTION_RECOMMENDED');
    expect(result.current_conditions.soil_moisture.classification).toBe('LOW');
    expect(result.assessment.recommendations).toHaveLength(1);
    expect(result.assessment.recommendations[0].code).toBe('WATERING_RECOMMENDED');
    expect(result.assessment.recommendations[0].priority).toBe('HIGH');
    expect(result.assessment.recommendations[0].evidence).toContain('Humedad actual: 18%');
    expect(result.assessment.recommendations[0].evidence).toContain('Mínimo de referencia: 30%');
  });

  it('evaluates to WATCH and recommends drainage check when moisture is above maximum', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 75,
        unit: '%',
        visual_state: 'high',
        last_updated: '2026-09-13T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 80,
        online: true,
        stale: false,
        last_seen: '2026-09-13T12:00:00Z',
        available: true,
      },
    };

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry,
    });

    expect(result.assessment.status).toBe('WATCH');
    expect(result.current_conditions.soil_moisture.classification).toBe('HIGH');
    expect(result.assessment.recommendations[0].code).toBe('CHECK_DRAINAGE_AND_AERATION');
    expect(result.assessment.recommendations[0].priority).toBe('MEDIUM');
  });

  it('escalates recommendation priority when persistent high moisture events exist in history', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 78,
        unit: '%',
        visual_state: 'high',
        last_updated: '2026-09-13T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 80,
        online: true,
        stale: false,
        last_seen: '2026-09-13T12:00:00Z',
        available: true,
      },
    };

    const recentEvents: PlantOperationalEventEntity[] = [
      {
        id: 'ev-1',
        plant_id: basePlant.id,
        source: 'HOME_ASSISTANT',
        event_type: 'SOIL_MOISTURE_HIGH',
        event_key: 'ha-high-1',
        occurred_at: new Date('2026-09-13T10:00:00Z'),
        received_at: new Date('2026-09-13T10:00:00Z'),
        value_number: 78,
        value_text: null,
        unit: '%',
        metadata: null,
        created_at: new Date('2026-09-13T10:00:00Z'),
      },
      {
        id: 'ev-2',
        plant_id: basePlant.id,
        source: 'HOME_ASSISTANT',
        event_type: 'SOIL_MOISTURE_HIGH',
        event_key: 'ha-high-2',
        occurred_at: new Date('2026-09-12T10:00:00Z'),
        received_at: new Date('2026-09-12T10:00:00Z'),
        value_number: 80,
        value_text: null,
        unit: '%',
        metadata: null,
        created_at: new Date('2026-09-12T10:00:00Z'),
      },
    ];

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry,
      recentEvents,
    });

    expect(result.assessment.status).toBe('WATCH');
    expect(result.assessment.headline).toContain('persistente');
    expect(result.assessment.recommendations[0].priority).toBe('HIGH');
  });

  it('marks moisture as UNKNOWN and status as WATCH when sensor is OFFLINE, preventing false low/high alerts', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 10,
        unit: '%',
        visual_state: 'low',
        last_updated: '2026-09-10T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 70,
        online: false,
        stale: false,
        last_seen: '2026-09-10T12:00:00Z',
        available: true,
      },
    };

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry,
    });

    expect(result.current_conditions.sensor_status).toBe('OFFLINE');
    expect(result.current_conditions.soil_moisture.classification).toBe('UNKNOWN');
    expect(result.assessment.status).toBe('WATCH');
    expect(result.assessment.recommendations[0].code).toBe('CHECK_SENSOR_CONNECTIVITY');
    expect(result.assessment.recommendations.some((r) => r.code === 'WATERING_RECOMMENDED')).toBe(false);
  });

  it('marks moisture as UNKNOWN and status as WATCH when telemetry is STALE', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 15,
        unit: '%',
        visual_state: 'low',
        last_updated: '2026-09-10T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 70,
        online: true,
        stale: true,
        last_seen: '2026-09-10T12:00:00Z',
        available: true,
      },
    };

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry,
    });

    expect(result.current_conditions.sensor_status).toBe('STALE');
    expect(result.current_conditions.soil_moisture.classification).toBe('UNKNOWN');
    expect(result.assessment.status).toBe('WATCH');
    expect(result.assessment.recommendations[0].code).toBe('CHECK_SENSOR_FRESHNESS');
  });

  it('provides general botanical watering guidelines when no telemetry is configured', () => {
    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry: null,
    });

    expect(result.assessment.status).toBe('OK');
    expect(result.current_conditions.sensor_status).toBe('UNKNOWN');
    expect(result.assessment.recommendations[0].code).toBe('BOTANICAL_WATERING_GUIDELINE');
    expect(result.assessment.recommendations[0].explanation).toBe(
      'Regar cuando el sustrato se seque en los primeros centímetros.'
    );
  });

  it('does not invent thresholds when telemetry is available but reference has no thresholds', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 40,
        unit: '%',
        visual_state: 'normal',
        last_updated: '2026-09-13T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 90,
        online: true,
        stale: false,
        last_seen: '2026-09-13T12:00:00Z',
        available: true,
      },
    };

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: null,
      telemetry,
    });

    expect(result.assessment.status).toBe('OK');
    expect(result.current_conditions.soil_moisture.classification).toBe('UNKNOWN');
    expect(result.current_conditions.soil_moisture.min_reference).toBeNull();
    expect(result.current_conditions.soil_moisture.max_reference).toBeNull();
  });

  it('evaluates to DATA_INSUFFICIENT when neither telemetry nor botanical reference is linked', () => {
    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: null,
      telemetry: null,
    });

    expect(result.assessment.status).toBe('DATA_INSUFFICIENT');
    expect(result.assessment.recommendations[0].code).toBe('LINK_BOTANICAL_OR_SENSOR');
  });

  it('adds battery recommendation for low or critical sensor battery level', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 45,
        unit: '%',
        visual_state: 'normal',
        last_updated: '2026-09-13T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 12,
        online: true,
        stale: false,
        last_seen: '2026-09-13T12:00:00Z',
        available: true,
      },
    };

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry,
    });

    expect(result.current_conditions.battery.classification).toBe('CRITICAL');
    expect(result.data_quality.warnings).toContain('Nivel de batería crítico (12%).');
    const batteryRec = result.assessment.recommendations.find((r) => r.code === 'REPLACE_BATTERY');
    expect(batteryRec).toBeDefined();
    expect(batteryRec?.priority).toBe('HIGH');
  });

  it('handles 0% moisture without treating 0 as falsy or unassigned', () => {
    const telemetry: CareTelemetrySnapshot = {
      plant_id: basePlant.id,
      permanent_code: basePlant.permanent_code,
      binding_configured: true,
      available: true,
      moisture: {
        value: 0,
        unit: '%',
        visual_state: 'low',
        last_updated: '2026-09-13T12:00:00Z',
        available: true,
      },
      hardware: {
        battery: 100,
        online: true,
        stale: false,
        last_seen: '2026-09-13T12:00:00Z',
        available: true,
      },
    };

    const result = evaluatePlantCareContext({
      plant: basePlant,
      reference: botanicalRef,
      telemetry,
    });

    expect(result.current_conditions.soil_moisture.value).toBe(0);
    expect(result.current_conditions.soil_moisture.classification).toBe('LOW');
  });

  it('upgrades assessment status to WATCH when physical plant health_status is ATTENTION or RECOVERY', () => {
    const attentionPlant: PlantEntity = {
      ...basePlant,
      health_status: 'ATTENTION',
    };

    const result = evaluatePlantCareContext({
      plant: attentionPlant,
      reference: botanicalRef,
      telemetry: null,
    });

    expect(result.assessment.status).toBe('WATCH');
  });
});
