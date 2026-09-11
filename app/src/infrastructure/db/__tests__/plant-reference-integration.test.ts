import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../prisma';
import { PrismaPlantReferenceRepository } from '../repositories/PrismaPlantReferenceRepository';
import { generateUUIDv7 } from '@/core/domain/uuid';

describe('PostgreSQL PlantReference Lifecycle & Integration Tests (ATP-IMP-023)', () => {
  const repo = new PrismaPlantReferenceRepository();
  const testExternalId = `test-pid-${generateUUIDv7()}`;
  const testProvider = 'TEST_PROVIDER';
  let createdId: string;

  beforeAll(async () => {
    // Cleanup any leftovers with test provider
    await prisma.plantReference.deleteMany({
      where: { provider: testProvider },
    });
  });

  afterAll(async () => {
    // Ensure zero test residual records remain
    await prisma.plantReference.deleteMany({
      where: { provider: testProvider },
    });
  });

  it('A. creates a new PlantReference snapshot in PostgreSQL with JSONB data', async () => {
    const carePayload = {
      min_temp: 18,
      max_temp: 28,
      min_light_lux: 1000,
      max_light_lux: 2500,
      min_soil_moist: 20,
      max_soil_moist: 50,
      watering: 'Regar moderadamente cuando la capa superficial esté seca.',
      sunlight: 'Sombra parcial o luz filtrada.',
    };

    const rawPayload = {
      pid: testExternalId,
      display_pid: 'Test botanical species',
      extra_vendor_field: 'retained_verbatim',
      nested: { a: 1, b: [1, 2, 3] },
    };

    const created = await repo.create({
      provider: testProvider,
      external_id: testExternalId,
      scientific_name: 'Test botanical species',
      common_names: ['Planta de Prueba', 'Test Plant'],
      reference_care: carePayload,
      image_url: 'https://images.example.com/test.jpg',
      raw_data: rawPayload,
    });

    expect(created.id).toBeDefined();
    expect(created.provider).toBe(testProvider);
    expect(created.external_id).toBe(testExternalId);
    expect(created.scientific_name).toBe('Test botanical species');
    expect(created.common_names).toEqual(['Planta de Prueba', 'Test Plant']);
    expect(created.image_url).toBe('https://images.example.com/test.jpg');
    expect(created.reference_care).toEqual(carePayload);
    expect(created.raw_data).toEqual(rawPayload);
    expect(created.fetched_at).toBeInstanceOf(Date);
    expect(created.last_sync_at).toBeInstanceOf(Date);

    createdId = created.id;
  });

  it('B. retrieves PlantReference by id and converts JSONB cleanly to Entity', async () => {
    const found = await repo.findById(createdId);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(createdId);
    expect(found?.provider).toBe(testProvider);
    expect(found?.external_id).toBe(testExternalId);
    expect(found?.scientific_name).toBe('Test botanical species');
    expect(found?.common_names).toEqual(['Planta de Prueba', 'Test Plant']);
    expect((found?.reference_care as Record<string, unknown>)?.['min_temp']).toBe(18);
    expect((found?.raw_data as Record<string, unknown>)?.['extra_vendor_field']).toBe('retained_verbatim');
  });

  it('C. retrieves PlantReference by provider and external_id', async () => {
    const found = await repo.findByProviderAndExternalId(
      testProvider,
      testExternalId
    );

    expect(found).not.toBeNull();
    expect(found?.id).toBe(createdId);
    expect(found?.scientific_name).toBe('Test botanical species');
  });

  it('D. returns null when looking up a non-existent provider/external_id', async () => {
    const found = await repo.findByProviderAndExternalId(
      testProvider,
      'non-existent-pid-999'
    );

    expect(found).toBeNull();
  });

  it('E. handles unique constraint gracefully returning existing record on race condition', async () => {
    // Attempting to create the exact same (provider, external_id)
    const duplicate = await repo.create({
      provider: testProvider,
      external_id: testExternalId,
      scientific_name: 'Different name that should not overwrite',
      raw_data: { pid: testExternalId },
    });

    // Should return the original entity with its original ID
    expect(duplicate.id).toBe(createdId);
    expect(duplicate.scientific_name).toBe('Test botanical species');

    // Confirm that only 1 record exists in DB
    const count = await prisma.plantReference.count({
      where: { provider: testProvider, external_id: testExternalId },
    });
    expect(count).toBe(1);
  });
});
