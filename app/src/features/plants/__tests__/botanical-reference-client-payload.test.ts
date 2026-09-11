import { describe, it, expect } from 'vitest';
import { parseBotanicalReferenceViewModel } from '../view-models/botanical-reference.vm';
import { PlantReferenceEntity } from '@/core/domain/entities';

describe('Botanical Reference Data Minimization & Prop Boundary Tests (ATP-IMP-025 Remediation)', () => {
  const fullDomainEntity: PlantReferenceEntity = {
    id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
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
      watering: 'Regar cuando el sustrato seque parcialmente.',
      internal_unprocessed_flag: 'do_not_leak',
    },
    raw_data: {
      secret_api_token: 'should_never_reach_client',
      client_secret: 'hidden_secret_value',
      nested_structure: { a: 1, b: 2 },
    },
  };

  it('A. verifies that BotanicalReferenceViewModel strictly excludes id, external_id, raw_data, and raw reference_care', () => {
    const vm = parseBotanicalReferenceViewModel(fullDomainEntity);
    expect(vm).not.toBeNull();

    const allowedKeys = new Set([
      'scientificName',
      'commonNamesFormatted',
      'sourceProvenanceText',
      'imageUrl',
      'metrics',
      'hasMetrics',
      'careGuidelines',
      'hasCareGuidelines',
    ]);

    const actualKeys = Object.keys(vm as object);

    // 1. Check all keys belong to the allowed public presentation whitelist
    for (const key of actualKeys) {
      expect(allowedKeys.has(key)).toBe(true);
    }

    // 2. Explicitly assert prohibited sensitive keys are absent
    expect(actualKeys).not.toContain('id');
    expect(actualKeys).not.toContain('external_id');
    expect(actualKeys).not.toContain('raw_data');
    expect(actualKeys).not.toContain('reference_care');
    expect(actualKeys).not.toContain('provider');
    expect(actualKeys).not.toContain('fetched_at');
    expect(actualKeys).not.toContain('last_sync_at');
  });

  it('B. certifies that JSON serialization for RSC / Client Props produces zero technical or secret leakage', () => {
    const vm = parseBotanicalReferenceViewModel(fullDomainEntity);
    const jsonString = JSON.stringify(vm);

    // Database UUID
    expect(jsonString).not.toContain('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
    // Raw payload secrets
    expect(jsonString).not.toContain('should_never_reach_client');
    expect(jsonString).not.toContain('hidden_secret_value');
    expect(jsonString).not.toContain('do_not_leak');
    // Provider enum
    expect(jsonString).not.toContain('OPEN_PLANTBOOK');
  });
});
