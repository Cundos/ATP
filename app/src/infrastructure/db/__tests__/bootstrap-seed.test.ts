import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../prisma';
import { seed, alignPlantCodeSequence } from '../../../../prisma/seed';
import { PrismaPlantRepository } from '../repositories/PrismaPlantRepository';

const isLocalhostPlaceholder =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('localhost:5432') ||
  process.env.DATABASE_URL.includes('CHANGE_ME');

describe.skipIf(isLocalhostPlaceholder)('Bootstrap Seed Validation (ATP-IMP-007)', () => {
  const plantRepo = new PrismaPlantRepository();

  beforeAll(async () => {
    // Ejecutar seed para asegurar estado
    await seed(prisma);
  });

  afterAll(async () => {
    // Asegurar que plant_code_seq queda alineada de forma óptima a 13
    await alignPlantCodeSequence(prisma);
  });

  it('debe contener exactamente 13 plantas en la base de datos', async () => {
    const count = await prisma.plant.count();
    expect(count).toBe(13);
  });

  it('debe contener todos los códigos de AT-PL-001 a AT-PL-013 sin duplicados ni faltantes', async () => {
    const plants = await prisma.plant.findMany({
      orderBy: { permanent_code: 'asc' },
    });

    expect(plants).toHaveLength(13);

    const expectedCodes = Array.from({ length: 13 }, (_, i) => {
      const num = (i + 1).toString().padStart(3, '0');
      return `AT-PL-${num}`;
    });

    const actualCodes = plants.map((p) => p.permanent_code);
    expect(actualCodes).toEqual(expectedCodes);
  });

  it('debe cumplir la distribución exacta de health_status según INITIAL_INVENTORY.md', async () => {
    const healthyCount = await prisma.plant.count({ where: { health_status: 'HEALTHY' } });
    const attentionCount = await prisma.plant.count({ where: { health_status: 'ATTENTION' } });
    const recoveryCount = await prisma.plant.count({ where: { health_status: 'RECOVERY' } });
    const unknownCount = await prisma.plant.count({ where: { health_status: 'UNKNOWN' } });

    expect(healthyCount).toBe(10);
    expect(attentionCount).toBe(2);
    expect(recoveryCount).toBe(1);
    expect(unknownCount).toBe(0);

    // Verificaciones puntuales clave
    const p3 = await prisma.plant.findUnique({ where: { permanent_code: 'AT-PL-003' } });
    expect(p3?.health_status).toBe('ATTENTION');

    const p6 = await prisma.plant.findUnique({ where: { permanent_code: 'AT-PL-006' } });
    expect(p6?.health_status).toBe('ATTENTION');

    const p4 = await prisma.plant.findUnique({ where: { permanent_code: 'AT-PL-004' } });
    expect(p4?.health_status).toBe('RECOVERY');

    const p8 = await prisma.plant.findUnique({ where: { permanent_code: 'AT-PL-008' } });
    expect(p8?.health_status).toBe('HEALTHY');

    const p12 = await prisma.plant.findUnique({ where: { permanent_code: 'AT-PL-012' } });
    expect(p12?.health_status).toBe('HEALTHY');
  });

  it('debe tener acquisition_date definido solo para AT-PL-013 y null para las otras 12', async () => {
    const p13 = await prisma.plant.findUnique({ where: { permanent_code: 'AT-PL-013' } });
    expect(p13?.acquisition_date).not.toBeNull();
    expect(p13?.acquisition_date?.toISOString().startsWith('2026-09-05')).toBe(true);

    const otherPlants = await prisma.plant.findMany({
      where: {
        permanent_code: {
          not: 'AT-PL-013',
        },
      },
    });

    expect(otherPlants).toHaveLength(12);
    for (const plant of otherPlants) {
      expect(plant.acquisition_date).toBeNull();
    }
  });

  it('todas las 13 plantas deben ser ACTIVE y tener location_id y reference_id en null', async () => {
    const plants = await prisma.plant.findMany();
    expect(plants).toHaveLength(13);

    for (const plant of plants) {
      expect(plant.lifecycle_status).toBe('ACTIVE');
      expect(plant.location_id).toBeNull();
      expect(plant.reference_id).toBeNull();
    }
  });

  it('no deben existir Photos, Locations, PlantReferences ni PlantCultivationProfiles', async () => {
    const photoCount = await prisma.photo.count();
    const locationCount = await prisma.location.count();
    const refCount = await prisma.plantReference.count();
    const profileCount = await prisma.plantCultivationProfile.count();

    expect(photoCount).toBe(0);
    expect(locationCount).toBe(0);
    expect(refCount).toBe(0);
    expect(profileCount).toBe(0);
  });

  it('reejecutar el seed debe ser idempotente y no duplicar ni alterar registros', async () => {
    await seed(prisma);

    const countAfterReseed = await prisma.plant.count();
    expect(countAfterReseed).toBe(13);

    const plantCodes = (
      await prisma.plant.findMany({
        select: { permanent_code: true },
        orderBy: { permanent_code: 'asc' },
      })
    ).map((p) => p.permanent_code);

    expect(plantCodes).toHaveLength(13);
  });

  it('la secuencia plant_code_seq debe estar alineada para que la siguiente alta produzca 14', async () => {
    await alignPlantCodeSequence(prisma);

    // Probamos nextval consumiendo el siguiente valor
    const nextVal = await plantRepo.getNextSequenceValue();
    expect(nextVal).toBe(14);

    // IMPORTANTE: Restaurar la secuencia al máximo del dataset (13) para no dejar huecos
    await alignPlantCodeSequence(prisma);
  });
});