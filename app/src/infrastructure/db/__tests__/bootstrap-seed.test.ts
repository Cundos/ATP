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
    // Limpiar tablas accesorias de pruebas sin afectar referencias botánicas
    await prisma.photo.deleteMany({});
    await prisma.plantCultivationProfile.deleteMany({});
    await prisma.plant.updateMany({ data: { location_id: null } });
    await prisma.location.deleteMany({});
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

  it('todas las 13 plantas deben ser ACTIVE', async () => {
    const plants = await prisma.plant.findMany();
    expect(plants).toHaveLength(13);

    for (const plant of plants) {
      expect(plant.lifecycle_status).toBe('ACTIVE');
    }
  });

  it('no deben existir Photos ni PlantCultivationProfiles residuales de prueba', async () => {
    const photoCount = await prisma.photo.count();
    const profileCount = await prisma.plantCultivationProfile.count();

    expect(photoCount).toBe(0);
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

  describe('Normalización de Ubicaciones Canónicas (ATP-LOC-001)', () => {
    it('debe contener exactamente las 4 ubicaciones canónicas activas sin duplicados', async () => {
      const locations = await prisma.location.findMany({
        where: { lifecycle_status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      });

      expect(locations).toHaveLength(4);
      const names = locations.map((l) => l.name);
      expect(names).toEqual(['Baño', 'Cocina', 'Living', 'Patio de Luz']);
    });

    it('todas las 13 plantas deben tener una ubicación asociada no nula', async () => {
      const plantsWithoutLoc = await prisma.plant.findMany({
        where: { location_id: null },
      });

      expect(plantsWithoutLoc).toHaveLength(0);
    });

    it('debe asociar exactamente cada planta a su ubicación canónica según ATP-LOC-001', async () => {
      const plants = await prisma.plant.findMany({
        select: {
          permanent_code: true,
          location: { select: { name: true } },
        },
        orderBy: { permanent_code: 'asc' },
      });

      const expectedAssignments: Record<string, string> = {
        'AT-PL-001': 'Cocina',
        'AT-PL-002': 'Baño',
        'AT-PL-003': 'Patio de Luz',
        'AT-PL-004': 'Living',
        'AT-PL-005': 'Cocina',
        'AT-PL-006': 'Cocina',
        'AT-PL-007': 'Living',
        'AT-PL-008': 'Living',
        'AT-PL-009': 'Living',
        'AT-PL-010': 'Living',
        'AT-PL-011': 'Living',
        'AT-PL-012': 'Living',
        'AT-PL-013': 'Living',
      };

      for (const plant of plants) {
        const expectedLoc = expectedAssignments[plant.permanent_code];
        expect(plant.location?.name).toBe(expectedLoc);
      }
    });

    it('debe cumplir la distribución exacta de conteos por ubicación (3, 1, 1, 8 = 13)', async () => {
      const counts = await prisma.plant.groupBy({
        by: ['location_id'],
        _count: { permanent_code: true },
      });

      const locDetails = await prisma.location.findMany({
        select: { id: true, name: true },
      });
      const locIdToName = new Map(locDetails.map((l) => [l.id, l.name]));

      const countsByName: Record<string, number> = {};
      for (const c of counts) {
        if (c.location_id) {
          const name = locIdToName.get(c.location_id) || 'Unknown';
          countsByName[name] = c._count.permanent_code;
        }
      }

      expect(countsByName['Cocina']).toBe(3);
      expect(countsByName['Baño']).toBe(1);
      expect(countsByName['Patio de Luz']).toBe(1);
      expect(countsByName['Living']).toBe(8);

      const totalAssigned = Object.values(countsByName).reduce((a, b) => a + b, 0);
      expect(totalAssigned).toBe(13);
    });
  });
});