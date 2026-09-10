import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../prisma';
import { PrismaPhotoRepository } from '../repositories/PrismaPhotoRepository';
import { generateUUIDv7 } from '@/core/domain/uuid';

describe('PostgreSQL Photo Lifecycle & Transaction Integration Tests (ATP-IMP-019)', () => {
  const photoRepo = new PrismaPhotoRepository();
  const testPlantId = generateUUIDv7();
  const testPermanentCode = 'AT-TEST-099';

  let photo1Id: string;
  let photo2Id: string;
  let photo3Id: string;

  beforeAll(async () => {
    // 1. Create a dedicated isolated test plant
    await prisma.plant.create({
      data: {
        id: testPlantId,
        permanent_code: testPermanentCode,
        common_name: 'Test Photo Lifecycle Plant',
        scientific_name: 'Testus photogenesis',
        health_status: 'HEALTHY',
        lifecycle_status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Clean up all test records created during integration tests
    try {
      await prisma.photo.deleteMany({
        where: { plant_id: testPlantId },
      });
      await prisma.plant.delete({
        where: { id: testPlantId },
      });
    } catch {
      // Ignore errors during cleanup
    }
  });

  it('A. creates first photo as primary and guarantees exactly 1 primary photo in PostgreSQL', async () => {
    const photo1 = await photoRepo.create({
      plant_id: testPlantId,
      file_path: 'photos/AT-TEST-099/photo1.webp',
      file_name: 'photo1.webp',
      mime_type: 'image/webp',
      file_size: 10240,
      is_primary: true,
    });

    photo1Id = photo1.id;
    expect(photo1.is_primary).toBe(true);

    const primaryInDb = await photoRepo.findPrimaryByPlant(testPlantId);
    expect(primaryInDb).not.toBeNull();
    expect(primaryInDb?.id).toBe(photo1Id);

    const allPhotos = await prisma.photo.findMany({ where: { plant_id: testPlantId } });
    expect(allPhotos.length).toBe(1);
    expect(allPhotos[0].is_primary).toBe(true);
  });

  it('B. creates second photo as primary, demoting first to false and promoting second to true atomically', async () => {
    const photo2 = await photoRepo.create({
      plant_id: testPlantId,
      file_path: 'photos/AT-TEST-099/photo2.webp',
      file_name: 'photo2.webp',
      mime_type: 'image/webp',
      file_size: 20480,
      is_primary: true,
    });

    photo2Id = photo2.id;
    expect(photo2.is_primary).toBe(true);

    // Verify state of both records in database
    const p1 = await photoRepo.findById(photo1Id);
    const p2 = await photoRepo.findById(photo2Id);

    expect(p1?.is_primary).toBe(false);
    expect(p2?.is_primary).toBe(true);

    const primaryInDb = await photoRepo.findPrimaryByPlant(testPlantId);
    expect(primaryInDb?.id).toBe(photo2Id);
  });

  it('C. creates third photo as non-primary without altering existing primary', async () => {
    const photo3 = await photoRepo.create({
      plant_id: testPlantId,
      file_path: 'photos/AT-TEST-099/photo3.webp',
      file_name: 'photo3.webp',
      mime_type: 'image/webp',
      file_size: 30720,
      is_primary: false,
    });

    photo3Id = photo3.id;
    expect(photo3.is_primary).toBe(false);

    const p1 = await photoRepo.findById(photo1Id);
    const p2 = await photoRepo.findById(photo2Id);
    const p3 = await photoRepo.findById(photo3Id);

    expect(p1?.is_primary).toBe(false);
    expect(p2?.is_primary).toBe(true);
    expect(p3?.is_primary).toBe(false);
  });

  it('D. setPrimary atomically promotes third photo and unsets previous primary', async () => {
    const updated = await photoRepo.setPrimary(testPlantId, photo3Id);
    expect(updated.id).toBe(photo3Id);
    expect(updated.is_primary).toBe(true);

    const p1 = await photoRepo.findById(photo1Id);
    const p2 = await photoRepo.findById(photo2Id);
    const p3 = await photoRepo.findById(photo3Id);

    expect(p1?.is_primary).toBe(false);
    expect(p2?.is_primary).toBe(false);
    expect(p3?.is_primary).toBe(true);

    const primaryInDb = await photoRepo.findPrimaryByPlant(testPlantId);
    expect(primaryInDb?.id).toBe(photo3Id);
  });

  it('E. preserves all historical photo rows in PostgreSQL database (ADR-008)', async () => {
    const history = await photoRepo.listByPlant(testPlantId);

    expect(history.length).toBe(3);
    const ids = history.map((p) => p.id);
    expect(ids).toContain(photo1Id);
    expect(ids).toContain(photo2Id);
    expect(ids).toContain(photo3Id);

    // Exactly one is primary
    const primaryCount = history.filter((p) => p.is_primary).length;
    expect(primaryCount).toBe(1);
  });

  it('F. transaction rolls back completely on intermediate failure, preserving previous primary intact', async () => {
    // Current primary is photo3
    const beforePrimary = await photoRepo.findPrimaryByPlant(testPlantId);
    expect(beforePrimary?.id).toBe(photo3Id);

    // Simulate an aborted transaction
    let txFailed = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: demote existing primaries
        await tx.photo.updateMany({
          where: { plant_id: testPlantId, is_primary: true },
          data: { is_primary: false },
        });

        // Step 2: intentionally throw error before promoting
        throw new Error('Simulated network or database failure during promotion');
      });
    } catch {
      txFailed = true;
    }

    expect(txFailed).toBe(true);

    // Verify transaction rollback: photo3 must STILL be is_primary = true
    const afterPrimary = await photoRepo.findPrimaryByPlant(testPlantId);
    expect(afterPrimary?.id).toBe(photo3Id);

    const p3 = await photoRepo.findById(photo3Id);
    expect(p3?.is_primary).toBe(true);
  });

  it('G. PostgreSQL physical partial unique index (photos_single_primary_per_plant_idx) enforces max 1 primary at the engine level', async () => {
    // Direct attempt to insert a second primary photo bypassing application logic
    let constraintViolated = false;
    try {
      await prisma.photo.create({
        data: {
          id: generateUUIDv7(),
          plant_id: testPlantId,
          file_path: 'photos/AT-TEST-099/illegal-duplicate.webp',
          file_name: 'illegal.webp',
          mime_type: 'image/webp',
          is_primary: true, // photo3 is ALREADY primary!
        },
      });
    } catch (err: unknown) {
      constraintViolated = true;
      expect((err as { message: string }).message).toMatch(/unique constraint/i);
    }

    expect(constraintViolated).toBe(true);
  });
});
