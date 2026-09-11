import { describe, it, expect } from 'vitest';
import {
  OpenPlantbookMapper,
  OPEN_PLANTBOOK_PROVIDER,
} from '../OpenPlantbookMapper';
import { OpenPlantbookDetailResponse } from '@/core/domain/services/IOpenPlantbookClient';

describe('OpenPlantbookMapper (ATP-IMP-023)', () => {
  const fixedTimestamp = new Date('2026-09-10T12:00:00.000Z');

  it('A. maps a complete Open Plantbook detail response accurately', () => {
    const detailResponse: OpenPlantbookDetailResponse = {
      data: {
        pid: 'monstera deliciosa',
        display_pid: 'Monstera deliciosa',
        alias: 'Cerimán, Costilla de Adán, Philodendron pertusum',
        image_url: 'https://open.plantbook.io/images/monstera.jpg',
        min_temp: 15,
        max_temp: 30,
        min_light_lux: 1500,
        max_light_lux: 3000,
        min_soil_moist: 15,
        max_soil_moist: 60,
        min_soil_ec: 350,
        max_soil_ec: 2000,
        min_env_humid: 50,
        max_env_humid: 80,
        watering: 'Regar cuando el sustrato seque 3cm.',
        sunlight: 'Luz indirecta brillante.',
        soil: 'Sustrato aireado con perlita.',
        pruning: 'Retirar hojas secas.',
        fertilization: 'Mensual en primavera/verano.',
      },
      raw: {
        pid: 'monstera deliciosa',
        display_pid: 'Monstera deliciosa',
        alias: 'Cerimán, Costilla de Adán, Philodendron pertusum',
        image_url: 'https://open.plantbook.io/images/monstera.jpg',
        extra_vendor_field: 'retained_verbatim',
      },
    };

    const dto = OpenPlantbookMapper.toPersistenceDTO(detailResponse, fixedTimestamp);

    expect(dto.provider).toBe(OPEN_PLANTBOOK_PROVIDER);
    expect(dto.external_id).toBe('monstera deliciosa');
    expect(dto.scientific_name).toBe('Monstera deliciosa');
    expect(dto.common_names).toEqual([
      'Cerimán',
      'Costilla de Adán',
      'Philodendron pertusum',
    ]);
    expect(dto.image_url).toBe('https://open.plantbook.io/images/monstera.jpg');
    expect(dto.fetched_at).toEqual(fixedTimestamp);
    expect(dto.last_sync_at).toEqual(fixedTimestamp);

    expect(dto.reference_care).toEqual({
      min_temp: 15,
      max_temp: 30,
      min_light_lux: 1500,
      max_light_lux: 3000,
      min_soil_moist: 15,
      max_soil_moist: 60,
      min_soil_ec: 350,
      max_soil_ec: 2000,
      min_env_humid: 50,
      max_env_humid: 80,
      watering: 'Regar cuando el sustrato seque 3cm.',
      sunlight: 'Luz indirecta brillante.',
      soil: 'Sustrato aireado con perlita.',
      pruning: 'Retirar hojas secas.',
      fertilization: 'Mensual en primavera/verano.',
    });

    expect(dto.raw_data).toEqual({
      pid: 'monstera deliciosa',
      display_pid: 'Monstera deliciosa',
      alias: 'Cerimán, Costilla de Adán, Philodendron pertusum',
      image_url: 'https://open.plantbook.io/images/monstera.jpg',
      extra_vendor_field: 'retained_verbatim',
    });
  });

  it('B & C. handles missing optional fields and null care numbers cleanly', () => {
    const minimalResponse: OpenPlantbookDetailResponse = {
      data: {
        pid: 'ficus lyrata',
      },
      raw: { pid: 'ficus lyrata' },
    };

    const dto = OpenPlantbookMapper.toPersistenceDTO(minimalResponse, fixedTimestamp);

    expect(dto.provider).toBe('OPEN_PLANTBOOK');
    expect(dto.external_id).toBe('ficus lyrata');
    expect(dto.scientific_name).toBe('ficus lyrata');
    expect(dto.common_names).toBeNull();
    expect(dto.image_url).toBeNull();
    expect(dto.reference_care).toEqual({
      min_temp: null,
      max_temp: null,
      min_light_lux: null,
      max_light_lux: null,
      min_soil_moist: null,
      max_soil_moist: null,
      min_soil_ec: null,
      max_soil_ec: null,
      min_env_humid: null,
      max_env_humid: null,
      watering: null,
      sunlight: null,
      soil: null,
      pruning: null,
      fertilization: null,
    });
    expect(dto.raw_data).toEqual({ pid: 'ficus lyrata' });
  });

  it('D. parses single alias and trims extra whitespace', () => {
    const singleAliasResponse: OpenPlantbookDetailResponse = {
      data: {
        pid: 'epipremnum aureum',
        display_pid: 'Epipremnum aureum',
        alias: '  Pothos  ',
      },
      raw: {},
    };

    const dto = OpenPlantbookMapper.toPersistenceDTO(singleAliasResponse, fixedTimestamp);

    expect(dto.scientific_name).toBe('Epipremnum aureum');
    expect(dto.common_names).toEqual(['Pothos']);
  });

  it('E. handles empty or invalid alias strings as null', () => {
    const emptyAliasResponse: OpenPlantbookDetailResponse = {
      data: {
        pid: 'sansevieria trifasciata',
        display_pid: 'Sansevieria trifasciata',
        alias: '  ,  ,  ',
      },
      raw: {},
    };

    const dto = OpenPlantbookMapper.toPersistenceDTO(emptyAliasResponse, fixedTimestamp);

    expect(dto.common_names).toBeNull();
  });

  it('F. preserves raw payload verbatim even if it contains nested structures', () => {
    const complexRaw = {
      pid: 'zamioculcas zamiifolia',
      care: { watering: 'low', sunlight: 'low' },
      tags: ['indoor', 'hardy'],
    };

    const response: OpenPlantbookDetailResponse = {
      data: {
        pid: 'zamioculcas zamiifolia',
        display_pid: 'Zamioculcas zamiifolia',
      },
      raw: complexRaw,
    };

    const dto = OpenPlantbookMapper.toPersistenceDTO(response, fixedTimestamp);

    expect(dto.raw_data).toEqual(complexRaw);
  });
});
