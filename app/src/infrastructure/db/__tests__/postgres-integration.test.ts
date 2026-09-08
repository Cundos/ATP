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
    expect(result[0].version).toMatch(/PostgreSQL (1[6-9]|[2-9]\d)/i);
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

  it('debe verificar la existencia física de tablas, índices, constraints y sequence en PostgreSQL', async () => {
    // 1. Tablas
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `;
    const tableNames = tables.map(t => t.table_name);
    expect(tableNames).toContain('plants');
    expect(tableNames).toContain('locations');
    expect(tableNames).toContain('photos');
    expect(tableNames).toContain('plant_cultivation_profiles');
    expect(tableNames).toContain('plant_references');
    expect(tableNames).toContain('_prisma_migrations');

    // 2. Sequence plant_code_seq
    const sequences = await prisma.$queryRaw<Array<{ sequence_name: string }>>`
      SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';
    `;
    const seqNames = sequences.map(s => s.sequence_name);
    expect(seqNames).toContain('plant_code_seq');

    // 3. Índices requeridos
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
    `;
    const indexNames = indexes.map(i => i.indexname);
    expect(indexNames).toContain('locations_active_name_key');
    expect(indexNames).toContain('photos_single_primary_per_plant_idx');
    expect(indexNames).toContain('plants_permanent_code_key');
    expect(indexNames).toContain('plant_cultivation_profiles_plant_id_key');
    expect(indexNames).toContain('plant_references_provider_external_id_key');

    // 4. FK plants_location_id_fkey con RESTRICT
    const fkeys = await prisma.$queryRaw<Array<{ constraint_name: string; delete_rule: string }>>`
      SELECT tc.constraint_name, rc.delete_rule 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.referential_constraints AS rc 
        ON tc.constraint_name = rc.constraint_name 
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public' 
        AND tc.constraint_name = 'plants_location_id_fkey';
    `;
    expect(fkeys.length).toBeGreaterThan(0);
    expect(fkeys[0].delete_rule).toBe('RESTRICT');

    // 5. Nullability de acquisition_date
    const colInfo = await prisma.$queryRaw<Array<{ is_nullable: string }>>`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'plants' AND column_name = 'acquisition_date';
    `;
    expect(colInfo[0]?.is_nullable).toBe('YES');
  });

  it('debe mantener integridad y ausencia de fotos/locations residuales de prueba', async () => {
    // Las tablas accesorias de pruebas deben estar limpias
    const locationCount = await prisma.location.count();
    expect(locationCount).toBe(0);

    const photoCount = await prisma.photo.count();
    expect(photoCount).toBe(0);
  });
});