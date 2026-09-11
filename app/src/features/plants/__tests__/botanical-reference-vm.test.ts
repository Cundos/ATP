import { describe, it, expect } from 'vitest';
import { parseBotanicalReferenceViewModel } from '../view-models/botanical-reference.vm';
import { PlantReferenceEntity } from '@/core/domain/entities';

describe('BotanicalReference ViewModel Parser (ATP-IMP-025)', () => {
  const baseReference: PlantReferenceEntity = {
    id: 'ref-uuid-001',
    provider: 'OPEN_PLANTBOOK',
    external_id: 'monstera deliciosa',
    scientific_name: 'Monstera deliciosa',
    common_names: ['Costilla de Adán', 'Ceriman'],
    image_url: 'https://open.plantbook.io/images/monstera.jpg',
    fetched_at: new Date('2026-09-10T14:30:00Z'),
    last_sync_at: new Date('2026-09-10T14:30:00Z'),
    reference_care: {
      min_temp: 15,
      max_temp: 30,
      min_light_lux: 1500,
      max_light_lux: 3000,
      min_env_humid: 40,
      max_env_humid: 80,
      min_soil_moist: 15,
      max_soil_moist: 50,
      min_soil_ec: 350,
      max_soil_ec: 2000,
      watering: 'Regar cuando los primeros 3-5 cm de sustrato estén secos.',
      sunlight: 'Luz indirecta brillante; evitar sol directo intenso.',
      soil: 'Sustrato aireado con turba, perlita y corteza de pino.',
      pruning: 'Retirar hojas amarillentas o dañadas desde la base.',
      fertilization: 'Abonar mensualmente en primavera y verano.',
    },
    raw_data: { some_raw: 'payload' },
  };

  it('A. parses complete reference with all metrics and qualitative care', () => {
    const vm = parseBotanicalReferenceViewModel(baseReference);
    expect(vm).not.toBeNull();
    expect(vm?.scientificName).toBe('Monstera deliciosa');
    expect(vm?.commonNamesFormatted).toBe('Costilla de Adán · Ceriman');
    expect(vm?.source).toBe('Open Plantbook');
    expect(vm?.sourceProvenanceText).toContain('Fuente: Open Plantbook · consultado el 10/09/2026');
    expect(vm?.imageUrl).toBe('https://open.plantbook.io/images/monstera.jpg');

    // Metrics
    expect(vm?.hasMetrics).toBe(true);
    expect(vm?.metrics.temperature).toBe('15–30 °C');
    expect(vm?.metrics.light).toBe('1.500–3.000 lux');
    expect(vm?.metrics.environmentalHumidity).toBe('40–80%');
    expect(vm?.metrics.soilMoisture).toBe('15–50%');
    expect(vm?.metrics.soilEc).toBe('350–2000');

    // Guidelines
    expect(vm?.hasCareGuidelines).toBe(true);
    expect(vm?.careGuidelines.watering).toBe('Regar cuando los primeros 3-5 cm de sustrato estén secos.');
    expect(vm?.careGuidelines.sunlight).toBe('Luz indirecta brillante; evitar sol directo intenso.');
    expect(vm?.careGuidelines.soil).toBe('Sustrato aireado con turba, perlita y corteza de pino.');
    expect(vm?.careGuidelines.pruning).toBe('Retirar hojas amarillentas o dañadas desde la base.');
    expect(vm?.careGuidelines.fertilization).toBe('Abonar mensualmente en primavera y verano.');
  });

  it('B. handles minimal reference with empty reference_care', () => {
    const minRef: PlantReferenceEntity = {
      id: 'ref-min',
      provider: 'OPEN_PLANTBOOK',
      external_id: 'ficus elastica',
      scientific_name: 'Ficus elastica',
      common_names: null,
      image_url: null,
      fetched_at: new Date('2026-09-10T12:00:00Z'),
      last_sync_at: new Date('2026-09-10T12:00:00Z'),
      reference_care: {},
      raw_data: {},
    };

    const vm = parseBotanicalReferenceViewModel(minRef);
    expect(vm).not.toBeNull();
    expect(vm?.scientificName).toBe('Ficus elastica');
    expect(vm?.commonNames).toBeNull();
    expect(vm?.commonNamesFormatted).toBeNull();
    expect(vm?.imageUrl).toBeNull();
    expect(vm?.hasMetrics).toBe(false);
    expect(vm?.hasCareGuidelines).toBe(false);
    expect(vm?.metrics.temperature).toBeNull();
    expect(vm?.metrics.light).toBeNull();
  });

  it('C. handles null reference_care gracefully', () => {
    const nullCareRef: PlantReferenceEntity = {
      ...baseReference,
      reference_care: null,
    };

    const vm = parseBotanicalReferenceViewModel(nullCareRef);
    expect(vm).not.toBeNull();
    expect(vm?.hasMetrics).toBe(false);
    expect(vm?.hasCareGuidelines).toBe(false);
    expect(vm?.metrics.temperature).toBeNull();
    expect(vm?.careGuidelines.watering).toBeNull();
  });

  it('D. handles empty JSON reference_care ({})', () => {
    const emptyCareRef: PlantReferenceEntity = {
      ...baseReference,
      reference_care: {},
    };

    const vm = parseBotanicalReferenceViewModel(emptyCareRef);
    expect(vm?.hasMetrics).toBe(false);
    expect(vm?.hasCareGuidelines).toBe(false);
  });

  it('E. handles invalid / corrupted field types without throwing', () => {
    const corruptedRef: PlantReferenceEntity = {
      ...baseReference,
      reference_care: {
        min_temp: 'invalid-number' as unknown as number,
        max_temp: { nested: true } as unknown as number,
        min_light_lux: null,
        max_light_lux: NaN,
        watering: 12345 as unknown as string,
        soil: true as unknown as string,
        pruning: '',
      },
    };

    const vm = parseBotanicalReferenceViewModel(corruptedRef);
    expect(vm).not.toBeNull();
    expect(vm?.metrics.temperature).toBeNull();
    expect(vm?.metrics.light).toBeNull();
    expect(vm?.careGuidelines.watering).toBeNull();
    expect(vm?.careGuidelines.soil).toBeNull();
    expect(vm?.careGuidelines.pruning).toBeNull();
  });

  it('F. ignores unknown extra keys cleanly', () => {
    const extraKeysRef: PlantReferenceEntity = {
      ...baseReference,
      reference_care: {
        min_temp: 18,
        max_temp: 24,
        unexpected_key_1: 'test',
        arbitrary_object: { foo: 'bar' },
      },
    };

    const vm = parseBotanicalReferenceViewModel(extraKeysRef);
    expect(vm?.metrics.temperature).toBe('18–24 °C');
    expect(vm?.metrics.light).toBeNull();
    // raw_data or extra keys are never leaked into ViewModel
    expect(Object.keys(vm?.metrics || {})).toEqual([
      'temperature',
      'light',
      'environmentalHumidity',
      'soilMoisture',
      'soilEc',
    ]);
  });

  it('G. formats ranges with both min and max extremes', () => {
    const ref: PlantReferenceEntity = {
      ...baseReference,
      reference_care: {
        min_temp: 10,
        max_temp: 25,
        min_light_lux: 800,
        max_light_lux: 2500,
        min_env_humid: 50,
        max_env_humid: 90,
      },
    };

    const vm = parseBotanicalReferenceViewModel(ref);
    expect(vm?.metrics.temperature).toBe('10–25 °C');
    expect(vm?.metrics.light).toBe('800–2.500 lux');
    expect(vm?.metrics.environmentalHumidity).toBe('50–90%');
  });

  it('H. formats ranges with min only (Desde X)', () => {
    const ref: PlantReferenceEntity = {
      ...baseReference,
      reference_care: {
        min_temp: 12,
        min_light_lux: 1000,
        min_env_humid: 40,
        min_soil_moist: 20,
        min_soil_ec: 400,
      },
    };

    const vm = parseBotanicalReferenceViewModel(ref);
    expect(vm?.metrics.temperature).toBe('Desde 12 °C');
    expect(vm?.metrics.light).toBe('Desde 1.000 lux');
    expect(vm?.metrics.environmentalHumidity).toBe('Desde 40%');
    expect(vm?.metrics.soilMoisture).toBe('Desde 20%');
    expect(vm?.metrics.soilEc).toBe('Desde 400');
  });

  it('I. formats ranges with max only (Hasta Y)', () => {
    const ref: PlantReferenceEntity = {
      ...baseReference,
      reference_care: {
        max_temp: 35,
        max_light_lux: 5000,
        max_env_humid: 85,
        max_soil_moist: 60,
        max_soil_ec: 1500,
      },
    };

    const vm = parseBotanicalReferenceViewModel(ref);
    expect(vm?.metrics.temperature).toBe('Hasta 35 °C');
    expect(vm?.metrics.light).toBe('Hasta 5.000 lux');
    expect(vm?.metrics.environmentalHumidity).toBe('Hasta 85%');
    expect(vm?.metrics.soilMoisture).toBe('Hasta 60%');
    expect(vm?.metrics.soilEc).toBe('Hasta 1500');
  });

  it('J. handles common_names variations (null, empty list, populated list)', () => {
    // 1. null
    const vmNull = parseBotanicalReferenceViewModel({
      ...baseReference,
      common_names: null,
    });
    expect(vmNull?.commonNames).toBeNull();
    expect(vmNull?.commonNamesFormatted).toBeNull();

    // 2. empty array
    const vmEmpty = parseBotanicalReferenceViewModel({
      ...baseReference,
      common_names: [],
    });
    expect(vmEmpty?.commonNames).toBeNull();
    expect(vmEmpty?.commonNamesFormatted).toBeNull();

    // 3. array with blank strings
    const vmBlanks = parseBotanicalReferenceViewModel({
      ...baseReference,
      common_names: ['  ', ''],
    });
    expect(vmBlanks?.commonNames).toBeNull();
    expect(vmBlanks?.commonNamesFormatted).toBeNull();

    // 4. populated list
    const vmPopulated = parseBotanicalReferenceViewModel({
      ...baseReference,
      common_names: ['Monstera', 'Costilla de Adán', 'Ceriman'],
    });
    expect(vmPopulated?.commonNamesFormatted).toBe('Monstera · Costilla de Adán · Ceriman');
  });

  it('K. formats provenance text cleanly with locale date', () => {
    const date = new Date('2026-05-15T10:00:00Z');
    const vm = parseBotanicalReferenceViewModel({
      ...baseReference,
      fetched_at: date,
      last_sync_at: date,
    });
    expect(vm?.sourceProvenanceText).toBe('Fuente: Open Plantbook · consultado el 15/05/2026');
  });

  it('L. returns null when reference is null or undefined', () => {
    expect(parseBotanicalReferenceViewModel(null)).toBeNull();
    expect(parseBotanicalReferenceViewModel(undefined)).toBeNull();
  });
});
