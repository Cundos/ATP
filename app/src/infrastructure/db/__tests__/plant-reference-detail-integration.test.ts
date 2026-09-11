import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../prisma';
import { PrismaPlantRepository } from '../repositories/PrismaPlantRepository';
import { PrismaPlantReferenceRepository } from '../repositories/PrismaPlantReferenceRepository';
import { generateUUIDv7 } from '@/core/domain/uuid';
import { parseBotanicalReferenceViewModel } from '@/features/plants/view-models/botanical-reference.vm';

describe('PostgreSQL Plant Detail & Botanical Reference Integration Tests (ATP-IMP-025)', () => {
  const repository = new PrismaPlantRepository();
  const referenceRepository = new PrismaPlantReferenceRepository();

  const createdPlantIds: string[] = [];
  const createdRefIds: string[] = [];

  afterAll(async () => {
    // Total cleanup of isolated test entities
    for (const plantId of createdPlantIds) {
      await prisma.plant.deleteMany({ where: { id: plantId } });
    }
    for (const refId of createdRefIds) {
      await prisma.plantReference.deleteMany({ where: { id: refId } });
    }
  });

  it('retrieves plant detail with joined PlantReference snapshot from PostgreSQL and parses to ViewModel cleanly', async () => {
    // 1. Create isolated reference snapshot
    const testPid = `test-integration-pid-${Date.now()}`;
    const testReference = await referenceRepository.create({
      provider: 'OPEN_PLANTBOOK',
      external_id: testPid,
      scientific_name: 'Epipremnum aureum',
      common_names: ['Pothos', 'Potus'],
      image_url: 'https://open.plantbook.io/images/pothos.jpg',
      reference_care: {
        min_temp: 15,
        max_temp: 30,
        min_light_lux: 800,
        max_light_lux: 2500,
        watering: 'Regar cuando el sustrato seque parcialmente.',
        sunlight: 'Luz brillante filtrada.',
      },
      raw_data: { test_key: 'test_val' },
    });
    createdRefIds.push(testReference.id);

    // 2. Create isolated plant linked to reference
    const plantId = generateUUIDv7();
    const testPlantCode = `AT-TEST-REF-${Date.now().toString().slice(-4)}`;
    const createdPlant = await prisma.plant.create({
      data: {
        id: plantId,
        permanent_code: testPlantCode,
        common_name: 'Pothos Dorado',
        scientific_name: 'Epipremnum aureum',
        health_status: 'HEALTHY',
        lifecycle_status: 'ACTIVE',
        reference_id: testReference.id,
      },
      include: {
        reference: true,
      },
    });
    createdPlantIds.push(createdPlant.id);

    // 3. Query via PrismaPlantRepository findById & findByPermanentCode
    const foundById = await repository.findById(plantId);
    expect(foundById).not.toBeNull();
    expect(foundById?.reference).toBeDefined();
    expect(foundById?.reference?.id).toBe(testReference.id);
    expect(foundById?.reference?.scientific_name).toBe('Epipremnum aureum');
    expect(foundById?.reference?.common_names).toEqual(['Pothos', 'Potus']);

    const foundByCode = await repository.findByPermanentCode(testPlantCode);
    expect(foundByCode).not.toBeNull();
    expect(foundByCode?.reference?.external_id).toBe(testPid);

    // 4. Parse to ViewModel
    const vm = parseBotanicalReferenceViewModel(foundById?.reference);
    expect(vm).not.toBeNull();
    expect(vm?.scientificName).toBe('Epipremnum aureum');
    expect(vm?.commonNamesFormatted).toBe('Pothos · Potus');
    expect(vm?.metrics.temperature).toBe('15–30 °C');
    expect(vm?.metrics.light).toBe('800–2.500 lux');
    expect(vm?.careGuidelines.watering).toBe('Regar cuando el sustrato seque parcialmente.');
    expect(vm?.careGuidelines.sunlight).toBe('Luz brillante filtrada.');
  });
});
