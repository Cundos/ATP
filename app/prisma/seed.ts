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

export const CANONICAL_LOCATIONS = [
  'Cocina',
  'Baño',
  'Patio de Luz',
  'Living',
] as const;

export const INITIAL_PLANT_LOCATIONS: Record<string, string> = {
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

/**
 * Normaliza y garantiza la existencia idempotente de las 4 ubicaciones canónicas
 */
export async function seedLocations(prisma: PrismaClient): Promise<Map<string, string>> {
  const locationMap = new Map<string, string>();

  for (const canonicalName of CANONICAL_LOCATIONS) {
    const existing = await prisma.location.findMany({
      where: {
        name: { equals: canonicalName, mode: 'insensitive' },
      },
      orderBy: { created_at: 'asc' },
    });

    if (existing.length > 0) {
      const primaryLoc = existing[0];
      if (primaryLoc.name !== canonicalName || primaryLoc.lifecycle_status !== 'ACTIVE') {
        await prisma.location.update({
          where: { id: primaryLoc.id },
          data: {
            name: canonicalName,
            lifecycle_status: 'ACTIVE',
          },
        });
      }
      locationMap.set(canonicalName, primaryLoc.id);

      // Si existieran duplicados históricos por mayúsculas/minúsculas, consolidar
      if (existing.length > 1) {
        for (let i = 1; i < existing.length; i++) {
          const duplicate = existing[i];
          await prisma.plant.updateMany({
            where: { location_id: duplicate.id },
            data: { location_id: primaryLoc.id },
          });
          try {
            await prisma.location.delete({ where: { id: duplicate.id } });
          } catch {
            await prisma.location.update({
              where: { id: duplicate.id },
              data: { lifecycle_status: 'ARCHIVED' },
            });
          }
        }
      }
    } else {
      const newLoc = await prisma.location.create({
        data: {
          id: uuidv7(),
          name: canonicalName,
          lifecycle_status: 'ACTIVE',
        },
      });
      locationMap.set(canonicalName, newLoc.id);
    }
  }

  return locationMap;
}

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
  console.log('Normalizando catálogo de ubicaciones canónicas...');
  const locationMap = await seedLocations(prisma);
  console.log(`Catálogo de ubicaciones listo: ${locationMap.size} ubicaciones activas.`);

  console.log(`Iniciando carga bootstrap de ${INITIAL_PLANTS_DATA.length} plantas...`);

  for (const plantData of INITIAL_PLANTS_DATA) {
    const targetLocationName = INITIAL_PLANT_LOCATIONS[plantData.permanent_code];
    const targetLocationId = targetLocationName ? locationMap.get(targetLocationName) || null : null;

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
        location_id: targetLocationId,
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
        location_id: targetLocationId,
        reference_id: null,
      },
    });
  }

  console.log('13 plantas cargadas/actualizadas con ubicaciones canónicas mediante upsert idempotente.');

  const alignedMax = await alignPlantCodeSequence(prisma);
  console.log(`Secuencia plant_code_seq alineada dinámicamente al valor máximo histórico: ${alignedMax}`);
  console.log(`El próximo llamado a nextval('plant_code_seq') generará: ${alignedMax + 1}`);

  console.log('Iniciando seed de flora regional y eventos estacionales (ATP-ECO-001A)...');
  await seedRegionalFlora(prisma);
  console.log('Seed de flora regional finalizado exitosamente.');
}

export async function seedRegionalFlora(prisma: PrismaClient) {
  // 1. Data Sources
  const srcFloraArg = await prisma.dataSource.upsert({
    where: { id: '018f1000-0000-7000-8000-000000000001' },
    update: {
      name: 'Flora Argentina (IBODA - CONICET)',
      type: 'BOTANICAL_INSTITUTION',
      url: 'http://www.floraargentina.edu.ar',
      description: 'Catálogo de las Plantas Vasculares del Cono Sur / Instituto de Botánica Darwinion.',
    },
    create: {
      id: '018f1000-0000-7000-8000-000000000001',
      name: 'Flora Argentina (IBODA - CONICET)',
      type: 'BOTANICAL_INSTITUTION',
      url: 'http://www.floraargentina.edu.ar',
      description: 'Catálogo de las Plantas Vasculares del Cono Sur / Instituto de Botánica Darwinion.',
    },
  });

  const srcInta = await prisma.dataSource.upsert({
    where: { id: '018f1000-0000-7000-8000-000000000002' },
    update: {
      name: 'INTA (Instituto Nacional de Tecnología Agropecuaria)',
      type: 'GOVERNMENT_DATASET',
      url: 'https://www.argentina.gob.ar/inta',
      description: 'Publicaciones y guías de propagación y manejo de especies forestales nativas argentinas.',
    },
    create: {
      id: '018f1000-0000-7000-8000-000000000002',
      name: 'INTA (Instituto Nacional de Tecnología Agropecuaria)',
      type: 'GOVERNMENT_DATASET',
      url: 'https://www.argentina.gob.ar/inta',
      description: 'Publicaciones y guías de propagación y manejo de especies forestales nativas argentinas.',
    },
  });

  // 2. Ecological Regions
  const ecoEspinal = await prisma.ecologicalRegion.upsert({
    where: { code: 'ESPINAL' },
    update: {
      name: 'Espinal (Distrito del Algarrobo / Caldén)',
      biome: 'Bosque xerófilo y sabana templada-cálida',
      description: 'Ecorregión del Espinal en el centro de Argentina, llanuras y lomadas con dominancia de algarrobos y espinillos.',
    },
    create: {
      id: uuidv7(),
      code: 'ESPINAL',
      name: 'Espinal (Distrito del Algarrobo / Caldén)',
      biome: 'Bosque xerófilo y sabana templada-cálida',
      description: 'Ecorregión del Espinal en el centro de Argentina, llanuras y lomadas con dominancia de algarrobos y espinillos.',
    },
  });

  const ecoChacoSeco = await prisma.ecologicalRegion.upsert({
    where: { code: 'CHACO_SECO' },
    update: {
      name: 'Chaco Seco',
      biome: 'Bosque subtropical seco',
      description: 'Ecorregión del Gran Chaco meridional, sabanas y bosques xerófilos.',
    },
    create: {
      id: uuidv7(),
      code: 'CHACO_SECO',
      name: 'Chaco Seco',
      biome: 'Bosque subtropical seco',
      description: 'Ecorregión del Gran Chaco meridional, sabanas y bosques xerófilos.',
    },
  });

  // 3. Growing Region: Arroyito, Córdoba
  const growingRegionArroyito = await prisma.growingRegion.upsert({
    where: { code: 'ARROYITO_CBA' },
    update: {
      name: 'Arroyito, Córdoba',
      country: 'Argentina',
      province: 'Córdoba',
      locality: 'Arroyito',
      latitude: -31.4206,
      longitude: -63.0503,
      description: 'Localidad del departamento San Justo (este de Córdoba) en la cuenca del Río Xanaes.',
    },
    create: {
      id: uuidv7(),
      code: 'ARROYITO_CBA',
      name: 'Arroyito, Córdoba',
      country: 'Argentina',
      province: 'Córdoba',
      locality: 'Arroyito',
      latitude: -31.4206,
      longitude: -63.0503,
      description: 'Localidad del departamento San Justo (este de Córdoba) en la cuenca del Río Xanaes.',
    },
  });

  // Link Arroyito to Espinal (primary) and Chaco Seco (transition)
  await prisma.growingRegionEcologicalRegion.upsert({
    where: {
      growing_region_id_ecological_region_id: {
        growing_region_id: growingRegionArroyito.id,
        ecological_region_id: ecoEspinal.id,
      },
    },
    update: { is_primary: true, notes: 'Matriz ecológica principal del este de Córdoba.' },
    create: {
      growing_region_id: growingRegionArroyito.id,
      ecological_region_id: ecoEspinal.id,
      is_primary: true,
      notes: 'Matriz ecológica principal del este de Córdoba.',
    },
  });

  await prisma.growingRegionEcologicalRegion.upsert({
    where: {
      growing_region_id_ecological_region_id: {
        growing_region_id: growingRegionArroyito.id,
        ecological_region_id: ecoChacoSeco.id,
      },
    },
    update: { is_primary: false, notes: 'Zona de ecotono y transición fitogeográfica septentrional.' },
    create: {
      growing_region_id: growingRegionArroyito.id,
      ecological_region_id: ecoChacoSeco.id,
      is_primary: false,
      notes: 'Zona de ecotono y transición fitogeográfica septentrional.',
    },
  });

  // 4. Curated Native Species in Espinal
  // A. Prosopis alba (Algarrobo blanco)
  const spAlgarrobo = await prisma.regionalPlantSpecies.upsert({
    where: {
      species_ecological_region_unique: {
        scientific_name: 'Prosopis alba',
        ecological_region_id: ecoEspinal.id,
      },
    },
    update: {
      canonical_name: 'Prosopis alba Griseb.',
      family: 'Fabaceae',
      common_names: ['Algarrobo blanco', 'Ibopé-pará'],
      native_status: 'NATIVE',
      growth_habit: 'Árbol',
      conservation_status: 'LC',
      notes: 'Árbol emblemático de sombra y frutos dulces tradicionalmente consumidos (algarroba/patay).',
    },
    create: {
      id: uuidv7(),
      scientific_name: 'Prosopis alba',
      canonical_name: 'Prosopis alba Griseb.',
      family: 'Fabaceae',
      common_names: ['Algarrobo blanco', 'Ibopé-pará'],
      native_status: 'NATIVE',
      ecological_region_id: ecoEspinal.id,
      growth_habit: 'Árbol',
      conservation_status: 'LC',
      notes: 'Árbol emblemático de sombra y frutos dulces tradicionalmente consumidos (algarroba/patay).',
    },
  });

  // Phenology for Prosopis alba
  const algarroboPhenology = [
    { event_type: 'SPROUTING', month: 9, source_id: srcInta.id, notes: 'Brotación primaveral temprana' },
    { event_type: 'SPROUTING', month: 10, source_id: srcInta.id, notes: 'Follaje pleno' },
    { event_type: 'FLOWERING', month: 10, source_id: srcFloraArg.id, notes: 'Inflorescencias en espigas amarillentas' },
    { event_type: 'FLOWERING', month: 11, source_id: srcFloraArg.id, notes: 'Pico de floración melífera' },
    { event_type: 'FRUITING', month: 12, source_id: srcFloraArg.id, notes: 'Vainas leguminosas en desarrollo' },
    { event_type: 'FRUITING', month: 1, source_id: srcFloraArg.id, notes: 'Maduración de vainas y cosecha tradicional' },
    { event_type: 'FRUITING', month: 2, source_id: srcFloraArg.id, notes: 'Caída de frutos maduros' },
    { event_type: 'SOWING', month: 8, source_id: srcInta.id, notes: 'Siembra en almácigo previa escarificación' },
    { event_type: 'SOWING', month: 9, source_id: srcInta.id, notes: 'Siembra de primavera' },
    { event_type: 'PLANTING', month: 9, source_id: srcInta.id, notes: 'Trasplante a campo al inicio de lluvias' },
    { event_type: 'PLANTING', month: 10, source_id: srcInta.id, notes: 'Trasplante óptimo con riego de asiento' },
  ] as const;

  for (const ph of algarroboPhenology) {
    await prisma.plantPhenology.upsert({
      where: {
        phenology_event_unique: {
          species_id: spAlgarrobo.id,
          ecological_region_id: ecoEspinal.id,
          event_type: ph.event_type,
          month: ph.month,
          source_id: ph.source_id,
        },
      },
      update: { notes: ph.notes },
      create: {
        id: uuidv7(),
        species_id: spAlgarrobo.id,
        ecological_region_id: ecoEspinal.id,
        event_type: ph.event_type,
        month: ph.month,
        source_id: ph.source_id,
        notes: ph.notes,
      },
    });
  }

  // B. Geoffroea decorticans (Chañar)
  const spChanar = await prisma.regionalPlantSpecies.upsert({
    where: {
      species_ecological_region_unique: {
        scientific_name: 'Geoffroea decorticans',
        ecological_region_id: ecoEspinal.id,
      },
    },
    update: {
      canonical_name: 'Geoffroea decorticans (Gillies ex Hook. & Arn.) Burkart',
      family: 'Fabaceae',
      common_names: ['Chañar'],
      native_status: 'NATIVE',
      growth_habit: 'Árbol/Arbusto',
      conservation_status: 'LC',
      notes: 'Corteza verde que se desprende en tiras, flores amarillas vistosas y fruto drupáceo comestible.',
    },
    create: {
      id: uuidv7(),
      scientific_name: 'Geoffroea decorticans',
      canonical_name: 'Geoffroea decorticans (Gillies ex Hook. & Arn.) Burkart',
      family: 'Fabaceae',
      common_names: ['Chañar'],
      native_status: 'NATIVE',
      ecological_region_id: ecoEspinal.id,
      growth_habit: 'Árbol/Arbusto',
      conservation_status: 'LC',
      notes: 'Corteza verde que se desprende en tiras, flores amarillas vistosas y fruto drupáceo comestible.',
    },
  });

  const chanarPhenology = [
    { event_type: 'FLOWERING', month: 9, source_id: srcFloraArg.id, notes: 'Floración profusa previa al follaje' },
    { event_type: 'FLOWERING', month: 10, source_id: srcFloraArg.id, notes: 'Fin de floración amarilla' },
    { event_type: 'FRUITING', month: 11, source_id: srcFloraArg.id, notes: 'Frutos carnosos en maduración' },
    { event_type: 'FRUITING', month: 12, source_id: srcFloraArg.id, notes: 'Maduración final (cosecha para arrope)' },
  ] as const;

  for (const ph of chanarPhenology) {
    await prisma.plantPhenology.upsert({
      where: {
        phenology_event_unique: {
          species_id: spChanar.id,
          ecological_region_id: ecoEspinal.id,
          event_type: ph.event_type,
          month: ph.month,
          source_id: ph.source_id,
        },
      },
      update: { notes: ph.notes },
      create: {
        id: uuidv7(),
        species_id: spChanar.id,
        ecological_region_id: ecoEspinal.id,
        event_type: ph.event_type,
        month: ph.month,
        source_id: ph.source_id,
        notes: ph.notes,
      },
    });
  }

  // C. Vachellia caven (Espinillo / Aromo)
  const spEspinillo = await prisma.regionalPlantSpecies.upsert({
    where: {
      species_ecological_region_unique: {
        scientific_name: 'Vachellia caven',
        ecological_region_id: ecoEspinal.id,
      },
    },
    update: {
      canonical_name: 'Vachellia caven (Molina) Seigler & Ebinger',
      family: 'Fabaceae',
      common_names: ['Espinillo', 'Aromo', 'Caven'],
      native_status: 'NATIVE',
      growth_habit: 'Árbol/Arbusto',
      conservation_status: 'LC',
      notes: 'Especie pionera y muy resistente a sequías, flores globosas amarillas sumamente perfumadas.',
    },
    create: {
      id: uuidv7(),
      scientific_name: 'Vachellia caven',
      canonical_name: 'Vachellia caven (Molina) Seigler & Ebinger',
      family: 'Fabaceae',
      common_names: ['Espinillo', 'Aromo', 'Caven'],
      native_status: 'NATIVE',
      ecological_region_id: ecoEspinal.id,
      growth_habit: 'Árbol/Arbusto',
      conservation_status: 'LC',
      notes: 'Especie pionera y muy resistente a sequías, flores globosas amarillas sumamente perfumadas.',
    },
  });

  const espinilloPhenology = [
    { event_type: 'FLOWERING', month: 8, source_id: srcFloraArg.id, notes: 'Floración temprana muy perfumada' },
    { event_type: 'FLOWERING', month: 9, source_id: srcFloraArg.id, notes: 'Pico de floración en cabezuelas amarillas' },
    { event_type: 'FLOWERING', month: 10, source_id: srcFloraArg.id, notes: 'Fin de floración' },
    { event_type: 'FRUITING', month: 12, source_id: srcFloraArg.id, notes: 'Legumbres leñosas cilíndricas oscuras' },
    { event_type: 'FRUITING', month: 1, source_id: srcFloraArg.id, notes: 'Maduración de vainas' },
    { event_type: 'FRUITING', month: 2, source_id: srcFloraArg.id, notes: 'Permanencia de frutos en rama' },
  ] as const;

  for (const ph of espinilloPhenology) {
    await prisma.plantPhenology.upsert({
      where: {
        phenology_event_unique: {
          species_id: spEspinillo.id,
          ecological_region_id: ecoEspinal.id,
          event_type: ph.event_type,
          month: ph.month,
          source_id: ph.source_id,
        },
      },
      update: { notes: ph.notes },
      create: {
        id: uuidv7(),
        species_id: spEspinillo.id,
        ecological_region_id: ecoEspinal.id,
        event_type: ph.event_type,
        month: ph.month,
        source_id: ph.source_id,
        notes: ph.notes,
      },
    });
  }
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