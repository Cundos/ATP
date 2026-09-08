import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../prisma';
import { PrismaPlantRepository } from '../repositories/PrismaPlantRepository';
import { generateUUIDv7 } from '@/core/domain/uuid';
import { formatPermanentCode } from '@/core/domain/permanent-code';

const isLocalhostPlaceholder =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('localhost:5432') ||
  process.env.DATABASE_URL.includes('CHANGE_ME');

describe.skipIf(isLocalhostPlaceholder)('PostgreSQL Real Integration Tests (GATE-0)', () => {
  const plantRepo = new PrismaPlantRepository();

  beforeAll(async () => {
    // Verificar conectividad real con base de datos activa
    await prisma.$queryRaw`SELECT 1;`;
  });

  it('debe ejecutar SELECT version() y confirmar PostgreSQL 16+', async () => {
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].version).toMatch(/PostgreSQL (16|17)/i);
  });

  it('debe invocar atómicamente nextval sobre plant_code_seq generando valores únicos sin colisiones', async () => {
    // 10 llamadas concurrentes simultáneas a nextval
    const promises = Array.from({ length: 10 }, () => plantRepo.getNextSequenceValue());
    const values = await Promise.all(promises);

    expect(values).toHaveLength(10);
    // Cada llamada exitosa debe obtener un valor estrictamente distinto (cero colisiones).
    // Gaps numéricos por transacciones fallidas están formalmente aceptados según ADR-017.
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(10);
  });

  it('debe respetar el constraint de una única foto primaria por planta (partial unique index)', async () => {
    const seq = await plantRepo.getNextSequenceValue();
    const permanent_code = formatPermanentCode(seq);

    const plant = await plantRepo.create({
      permanent_code,
      common_name: 'Planta de Prueba Invariante Foto',
      health_status: 'UNKNOWN',
    });

    try {
      // 1. Primera foto no primaria: permitida
      await prisma.photo.create({
        data: {
          id: generateUUIDv7(),
          plant_id: plant.id,
          file_path: 'photos/TEST/photo1.webp',
          file_name: 'photo1.jpg',
          mime_type: 'image/webp',
          is_primary: false,
        },
      });

      // 2. Segunda foto no primaria: permitida
      await prisma.photo.create({
        data: {
          id: generateUUIDv7(),
          plant_id: plant.id,
          file_path: 'photos/TEST/photo2.webp',
          file_name: 'photo2.jpg',
          mime_type: 'image/webp',
          is_primary: false,
        },
      });

      // 3. Primera foto primaria: permitida
      await prisma.photo.create({
        data: {
          id: generateUUIDv7(),
          plant_id: plant.id,
          file_path: 'photos/TEST/photo_primary_1.webp',
          file_name: 'primary1.jpg',
          mime_type: 'image/webp',
          is_primary: true,
        },
      });

      // 4. Segunda foto primaria para la misma planta: DEBE RECHAZARSE por el partial unique index
      let failed = false;
      try {
        await prisma.photo.create({
          data: {
            id: generateUUIDv7(),
            plant_id: plant.id,
            file_path: 'photos/TEST/photo_primary_2.webp',
            file_name: 'primary2.jpg',
            mime_type: 'image/webp',
            is_primary: true,
          },
        });
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
    } finally {
      await prisma.plant.delete({ where: { id: plant.id } });
    }
  });

  it('debe impedir borrar físicamente una Location que tiene plantas asociadas (onDelete: RESTRICT)', async () => {
    const locationId = generateUUIDv7();
    const location = await prisma.location.create({
      data: {
        id: locationId,
        name: `Ubicación Restrict Test ${Date.now()}`,
        lifecycle_status: 'ACTIVE',
      },
    });

    const seq = await plantRepo.getNextSequenceValue();
    const permanent_code = formatPermanentCode(seq);

    const plant = await plantRepo.create({
      permanent_code,
      common_name: 'Planta de Prueba Location Restrict',
      location_id: location.id,
    });

    try {
      let deleteFailed = false;
      try {
        await prisma.location.delete({ where: { id: location.id } });
      } catch {
        deleteFailed = true;
      }
      expect(deleteFailed).toBe(true);
    } finally {
      await prisma.plant.delete({ where: { id: plant.id } });
      await prisma.location.delete({ where: { id: location.id } });
    }
  });
});