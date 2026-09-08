import { PrismaClient, HealthStatus, LifecycleStatus } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

export interface SeedPlantData {
  permanent_code: string;
  common_name: string;
  scientific_name: string | null;
  cultivar: string | null;
  health_status: HealthStatus;
  lifecycle_status: LifecycleStatus;
  acquisition_date: Date | null;
  notes: string | null;
}

/**
 * Dataset canónico del inventario inicial real de 13 ejemplares domésticos
 * Fuente documental: 02_DATA/INITIAL_INVENTORY.md
 */
export const INITIAL_PLANTS_DATA: SeedPlantData[] = [
  {
    permanent_code: 'AT-PL-001',
    common_name: 'Gomero',
    scientific_name: 'Ficus elastica',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Estado visual general bueno.',
  },
  {
    permanent_code: 'AT-PL-002',
    common_name: "Pothos N'Joy",
    scientific_name: 'Epipremnum aureum',
    cultivar: "N'Joy",
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Estado visual general muy bueno.',
  },
  {
    permanent_code: 'AT-PL-003',
    common_name: 'Monstera adansonii',
    scientific_name: 'Monstera adansonii',
    cultivar: null,
    health_status: 'ATTENTION',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Presenta hojas pálidas/amarillentas.',
  },
  {
    permanent_code: 'AT-PL-004',
    common_name: 'Pothos común',
    scientific_name: 'Epipremnum aureum',
    cultivar: null,
    health_status: 'RECOVERY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Ejemplar muy debilitado, con pocas hojas; se observa una hoja nueva viable.',
  },
  {
    permanent_code: 'AT-PL-005',
    common_name: 'Philodendron Pink Princess',
    scientific_name: 'Philodendron',
    cultivar: 'Pink Princess',
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Crecimiento trepador. Especie exacta no confirmada más allá del género/cultivar documentado.',
  },
  {
    permanent_code: 'AT-PL-006',
    common_name: 'Philodendron hederaceum',
    scientific_name: 'Philodendron hederaceum',
    cultivar: null,
    health_status: 'ATTENTION',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Presenta hojas amarillentas/secas e internodos largos.',
  },
  {
    permanent_code: 'AT-PL-007',
    common_name: 'Zamioculca',
    scientific_name: 'Zamioculcas zamiifolia',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Estado visual general muy bueno. Ejemplar independiente de AT-PL-011.',
  },
  {
    permanent_code: 'AT-PL-008',
    common_name: 'Pothos Marble Queen',
    scientific_name: 'Epipremnum aureum',
    cultivar: 'Marble Queen',
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Estado general bueno; posee guías largas con sectores desnudos. Ejemplar independiente de AT-PL-009.',
  },
  {
    permanent_code: 'AT-PL-009',
    common_name: 'Pothos Marble Queen',
    scientific_name: 'Epipremnum aureum',
    cultivar: 'Marble Queen',
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Ejemplar independiente de AT-PL-008. Estado visual muy bueno.',
  },
  {
    permanent_code: 'AT-PL-010',
    common_name: 'Golden Pothos',
    scientific_name: 'Epipremnum aureum',
    cultivar: 'Golden Pothos',
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Crecimiento trepador con tutor.',
  },
  {
    permanent_code: 'AT-PL-011',
    common_name: 'Zamioculca',
    scientific_name: 'Zamioculcas zamiifolia',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Ejemplar independiente de AT-PL-007. Estado visual muy bueno.',
  },
  {
    permanent_code: 'AT-PL-012',
    common_name: 'Pothos verde/común',
    scientific_name: 'Epipremnum aureum',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: 'Ejemplar ubicado actualmente junto al área de escritorio/notebook según relevamiento informal, pero sin Location formal hasta definir catálogo.',
  },
  {
    permanent_code: 'AT-PL-013',
    common_name: 'Croton',
    scientific_name: 'Codiaeum variegatum',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: new Date('2026-09-05T00:00:00.000Z'),
    notes: 'Follaje multicolor. Adquirido en vivero.',
  },
];

/**
 * Función que alinea la secuencia plant_code_seq con el máximo componente numérico
 * de permanent_code existente (e.g. AT-PL-013 -> 13).
 * Utiliza setval('plant_code_seq', max, true) para que la siguiente invocación a nextval
 * retorne de manera garantizada max + 1 (e.g. 14).
 */
export async function alignPlantCodeSequence(prisma: PrismaClient): Promise<number> {
  // 1. Obtener todos los permanent_code existentes
  const plants = await prisma.plant.findMany({
    select: { permanent_code: true },
  });

  let maxNum = 0;
  const regex = /^AT-PL-(\d+)$/;

  for (const plant of plants) {
    const match = plant.permanent_code.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  if (maxNum > 0) {
    // Al pasar is_called = true, PostgreSQL establece que el valor actual es maxNum
    // y el próximo nextval() entregará exactamente maxNum + 1.
    await prisma.$executeRawUnsafe(`SELECT setval('plant_code_seq', ${maxNum}, true);`);
  }

  return maxNum;
}

/**
 * Ejecución del seed de bootstrap
 */
export async function seed(prisma: PrismaClient) {
  console.log(`Iniciando carga bootstrap de ${INITIAL_PLANTS_DATA.length} plantas...`);

  for (const plantData of INITIAL_PLANTS_DATA) {
    await prisma.plant.upsert({
      where: { permanent_code: plantData.permanent_code },
      update: {
        common_name: plantData.common_name,
        scientific_name: plantData.scientific_name,
        cultivar: plantData.cultivar,
        health_status: plantData.health_status,
        lifecycle_status: plantData.lifecycle_status,
        acquisition_date: plantData.acquisition_date,
        notes: plantData.notes,
      },
      create: {
        id: uuidv7(),
        permanent_code: plantData.permanent_code,
        common_name: plantData.common_name,
        scientific_name: plantData.scientific_name,
        cultivar: plantData.cultivar,
        health_status: plantData.health_status,
        lifecycle_status: plantData.lifecycle_status,
        acquisition_date: plantData.acquisition_date,
        notes: plantData.notes,
        location_id: null,
        reference_id: null,
      },
    });
  }

  console.log('13 plantas cargadas/actualizadas mediante upsert idempotente.');

  const alignedMax = await alignPlantCodeSequence(prisma);
  console.log(`Secuencia plant_code_seq alineada dinámicamente al valor máximo histórico: ${alignedMax}`);
  console.log(`El próximo llamado a nextval('plant_code_seq') generará: ${alignedMax + 1}`);
}

// Ejecución como script autónomo
if (require.main === module || !process.env.VITEST) {
  const prisma = new PrismaClient();
  seed(prisma)
    .then(async () => {
      await prisma.$disconnect();
      console.log('Bootstrap finalizado exitosamente.');
    })
    .catch(async (e) => {
      console.error('Error durante la ejecución del bootstrap:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}