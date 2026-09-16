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
      description: 'Publicaciones y guías de propagación, manejo y fenología de especies forestales y nativas del centro del país.',
    },
    create: {
      id: '018f1000-0000-7000-8000-000000000002',
      name: 'INTA (Instituto Nacional de Tecnología Agropecuaria)',
      type: 'GOVERNMENT_DATASET',
      url: 'https://www.argentina.gob.ar/inta',
      description: 'Publicaciones y guías de propagación, manejo y fenología de especies forestales y nativas del centro del país.',
    },
  });

  const srcSib = await prisma.dataSource.upsert({
    where: { id: '018f1000-0000-7000-8000-000000000003' },
    update: {
      name: 'SIB - Parques Nacionales (Sistema de Información de Biodiversidad)',
      type: 'GOVERNMENT_DATASET',
      url: 'https://sib.gob.ar',
      description: 'Base oficial de datos sobre biodiversidad, estado de conservación y presencia ecológica de la Administración de Parques Nacionales.',
    },
    create: {
      id: '018f1000-0000-7000-8000-000000000003',
      name: 'SIB - Parques Nacionales (Sistema de Información de Biodiversidad)',
      type: 'GOVERNMENT_DATASET',
      url: 'https://sib.gob.ar',
      description: 'Base oficial de datos sobre biodiversidad, estado de conservación y presencia ecológica de la Administración de Parques Nacionales.',
    },
  });

  const srcUnc = await prisma.dataSource.upsert({
    where: { id: '018f1000-0000-7000-8000-000000000004' },
    update: {
      name: 'UNC - Árboles y Arbustos Nativos del Centro de Argentina (Demaio, Karlin, Medina / CORD)',
      type: 'SCIENTIFIC_PUBLICATION',
      url: 'https://editorial.unc.edu.ar',
      description: 'Catálogo y guía botánica de especies leñosas de las provincias fitogeográficas del Espinal y Chaco.',
    },
    create: {
      id: '018f1000-0000-7000-8000-000000000004',
      name: 'UNC - Árboles y Arbustos Nativos del Centro de Argentina (Demaio, Karlin, Medina / CORD)',
      type: 'SCIENTIFIC_PUBLICATION',
      url: 'https://editorial.unc.edu.ar',
      description: 'Catálogo y guía botánica de especies leñosas de las provincias fitogeográficas del Espinal y Chaco.',
    },
  });

  const srcCbaAmbiente = await prisma.dataSource.upsert({
    where: { id: '018f1000-0000-7000-8000-000000000005' },
    update: {
      name: 'Secretaría de Ambiente de la Provincia de Córdoba',
      type: 'GOVERNMENT_DATASET',
      url: 'https://ambiente.cba.gov.ar',
      description: 'Guías de restauración ecológica, reforestación y conservación de la flora autóctona cordobesa.',
    },
    create: {
      id: '018f1000-0000-7000-8000-000000000005',
      name: 'Secretaría de Ambiente de la Provincia de Córdoba',
      type: 'GOVERNMENT_DATASET',
      url: 'https://ambiente.cba.gov.ar',
      description: 'Guías de restauración ecológica, reforestación y conservación de la flora autóctona cordobesa.',
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

  // 4. Curated Native Species Catalogue (20 Species across 5 Growth Habits)
  const CURATED_SPECIES = [
    // -------------------------------------------------------------
    // TREES (Árboles) - 6 species
    // -------------------------------------------------------------
    {
      scientific_name: 'Prosopis alba',
      canonical_name: 'Prosopis alba Griseb.',
      family: 'Fabaceae',
      common_names: ['Algarrobo blanco', 'Ibopé-pará'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Árbol',
      conservation_status: 'LC',
      notes: 'Árbol emblemático del Espinal y Chaco Seco; madera noble, sombra densa y frutos dulces forrajeros/comestibles. Alto valor para abejas y polinizadores melíferos.',
      phenology: [
        { event_type: 'SPROUTING' as const, month: 9, source_id: srcInta.id, notes: 'Brotación primaveral temprana' },
        { event_type: 'SPROUTING' as const, month: 10, source_id: srcInta.id, notes: 'Follaje pleno' },
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Inflorescencias en espigas amarillentas' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Pico de floración melífera' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Vainas leguminosas en desarrollo' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Maduración de vainas y cosecha tradicional' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Caída de frutos maduros' },
        { event_type: 'SOWING' as const, month: 8, source_id: srcInta.id, notes: 'Siembra en almácigo previa escarificación' },
        { event_type: 'SOWING' as const, month: 9, source_id: srcInta.id, notes: 'Siembra de primavera' },
        { event_type: 'PLANTING' as const, month: 9, source_id: srcInta.id, notes: 'Trasplante a campo al inicio de lluvias' },
        { event_type: 'PLANTING' as const, month: 10, source_id: srcInta.id, notes: 'Trasplante óptimo con riego de asiento' },
      ],
    },
    {
      scientific_name: 'Geoffroea decorticans',
      canonical_name: 'Geoffroea decorticans (Gillies ex Hook. & Arn.) Burkart',
      family: 'Fabaceae',
      common_names: ['Chañar'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Árbol/Arbusto',
      conservation_status: 'LC',
      notes: 'Corteza verde exfoliante en tiras, floración amarilla vistosa que atrae abejas y frutos drupáceos dulces para arrope tradicional.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 9, source_id: srcFloraArg.id, notes: 'Floración profusa previa al follaje' },
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Fin de floración amarilla' },
        { event_type: 'FRUITING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Frutos carnosos en maduración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Maduración final (cosecha para arrope)' },
        { event_type: 'SOWING' as const, month: 8, source_id: srcInta.id, notes: 'Siembra de semillas escarificadas' },
        { event_type: 'SOWING' as const, month: 9, source_id: srcInta.id, notes: 'Siembra en vivero' },
      ],
    },
    {
      scientific_name: 'Vachellia caven',
      canonical_name: 'Vachellia caven (Molina) Seigler & Ebinger',
      family: 'Fabaceae',
      common_names: ['Espinillo', 'Aromo', 'Caven'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Árbol/Arbusto',
      conservation_status: 'LC',
      notes: 'Pionera sumamente resistente a fuegos y sequías. Flores globosas amarillas muy perfumadas con néctar abundante para polinizadores.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 8, source_id: srcFloraArg.id, notes: 'Floración temprana muy perfumada' },
        { event_type: 'FLOWERING' as const, month: 9, source_id: srcFloraArg.id, notes: 'Pico de floración en cabezuelas amarillas' },
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Legumbres leñosas cilíndricas oscuras' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Maduración de vainas' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Permanencia de frutos en rama' },
        { event_type: 'SOWING' as const, month: 8, source_id: srcCbaAmbiente.id, notes: 'Tratamiento pregerminativo con agua caliente y siembra' },
      ],
    },
    {
      scientific_name: 'Celtis tala',
      canonical_name: 'Celtis ehrenbergiana (Klotzsch) Liebm.',
      family: 'Cannabaceae',
      common_names: ['Tala', 'Tala común'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Árbol',
      conservation_status: 'LC',
      notes: 'Árbol de copa extendida y ramas en zig-zag; drupas anaranjadas sumamente apetecidas por aves. Planta nutricia de mariposas (Diaethria clymena y Doxocopa laurentia).',
      phenology: [
        { event_type: 'SPROUTING' as const, month: 9, source_id: srcUnc.id, notes: 'Brotación de hojas tiernas dentadas' },
        { event_type: 'SPROUTING' as const, month: 10, source_id: srcUnc.id, notes: 'Follaje estival pleno' },
        { event_type: 'FLOWERING' as const, month: 9, source_id: srcFloraArg.id, notes: 'Flores pequeñas verdosas inconspicuas' },
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Desarrollo de frutos drupáceos' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Frutos anaranjados maduros comestibles para aves' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Pico de fructificación y dispersión' },
        { event_type: 'SOWING' as const, month: 8, source_id: srcInta.id, notes: 'Siembra directa en sustrato arenoso' },
        { event_type: 'SOWING' as const, month: 9, source_id: srcInta.id, notes: 'Siembra temprana' },
      ],
    },
    {
      scientific_name: 'Schinus fasciculata',
      canonical_name: 'Schinus fasciculata (Griseb.) I.M.Johnst.',
      family: 'Anacardiaceae',
      common_names: ['Molle de curtir', 'Moradillo', 'Molle petizo'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Árbol/Arbusto',
      conservation_status: 'LC',
      notes: 'Leñosa dioica del Espinal con hojas fasciculadas y drupas violáceas-oscuras. Flores pequeñas con néctar y polen para dípteros e himenópteros.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 9, source_id: srcFloraArg.id, notes: 'Aparición de racimos florales amarillentos' },
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Pico de floración' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Maduración de drupas moradas' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Fruto maduro consumido por aves' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Persistencia de frutos' },
      ],
    },
    {
      scientific_name: 'Jodina rhombifolia',
      canonical_name: 'Jodina rhombifolia (Hook. & Arn.) Reissek',
      family: 'Cervantesiaceae',
      common_names: ['Sombra de toro', 'Quebrachillo'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Árbol/Arbusto',
      conservation_status: 'LC',
      notes: 'Árbol perennifolio con hojas rómbicas coriáceas con espina apical. Flores axilares carnosas sumamente perfumadas con néctar invernal clave para polinizadores.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 4, source_id: srcFloraArg.id, notes: 'Inicio de floración otoñal-invernal' },
        { event_type: 'FLOWERING' as const, month: 5, source_id: srcFloraArg.id, notes: 'Floración invernal nectarífera' },
        { event_type: 'FLOWERING' as const, month: 6, source_id: srcFloraArg.id, notes: 'Floración aromática' },
        { event_type: 'FLOWERING' as const, month: 7, source_id: srcFloraArg.id, notes: 'Fin de floración invernal' },
        { event_type: 'FRUITING' as const, month: 10, source_id: srcSib.id, notes: 'Desarrollo del fruto drupáceo rojizo' },
        { event_type: 'FRUITING' as const, month: 11, source_id: srcSib.id, notes: 'Maduración y dehiscencia del fruto' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcSib.id, notes: 'Exposición de arilo blanco' },
      ],
    },

    // -------------------------------------------------------------
    // SHRUBS (Arbustos) - 6 species
    // -------------------------------------------------------------
    {
      scientific_name: 'Aloysia gratissima',
      canonical_name: 'Aloysia gratissima (Gillies & Hook. ex Hook.) Tronc.',
      family: 'Verbenaceae',
      common_names: ['Palo amarillo', 'Azahar de campo', 'Reseda del campo'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Arbusto',
      conservation_status: 'LC',
      notes: 'Arbusto xerófilo ramificado; inflorescencias blancas con fragancia exquisita dulce de altísimo valor melífero e imán de lepidópteros y abejas nativas.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Inicio de floración fragante' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Pico de floración en espigas blancas' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración continua estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Floración tras lluvias' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Floración tardía' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Maduración de núculas' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Dispersión de frutos' },
        { event_type: 'FRUITING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Fin de fructificación' },
      ],
    },
    {
      scientific_name: 'Lantana camara',
      canonical_name: 'Lantana camara L.',
      family: 'Verbenaceae',
      common_names: ['Lantana', 'Camará', 'Bandera española'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Arbusto',
      conservation_status: 'LC',
      notes: 'Arbusto perenne con cabezuelas multicolores (amarillo, anaranjado, rojo). Fuente continua de néctar para gran diversidad de mariposas y picaflores.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 9, source_id: srcFloraArg.id, notes: 'Inicio primaveral de floración' },
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Floración intensa' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Plena floración multicolor' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival continua' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Floración tardía' },
        { event_type: 'FLOWERING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Floración otoñal temprana' },
        { event_type: 'FRUITING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Drupas negras en maduración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Fructificación continua' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Dispersión por aves frugívoras' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Fructificación' },
        { event_type: 'FRUITING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Frutos maduros' },
      ],
    },
    {
      scientific_name: 'Baccharis salicifolia',
      canonical_name: 'Baccharis salicifolia (Ruiz & Pav.) Pers.',
      family: 'Asteraceae',
      common_names: ['Chilca', 'Chilca dulce', 'Pájaro bobo'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Arbusto',
      conservation_status: 'LC',
      notes: 'Arbusto dioico higrófilo y pionero común en costas del Río Xanaes y zanjones del este de Córdoba; abundante floración blanca y follaje resinoso.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Capítulos florales blanquecinos en panojas' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Floración plena melífera' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Floración' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Floración tardía' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Aquenios con vilano plumoso' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Dispersión anemócora de semillas' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Dispersión continua' },
      ],
    },
    {
      scientific_name: 'Baccharis articulata',
      canonical_name: 'Baccharis articulata (Lam.) Pers.',
      family: 'Asteraceae',
      common_names: ['Carqueja', 'Carquejilla'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Arbusto',
      conservation_status: 'LC',
      notes: 'Arbusto áfilo perenne con tallos trialados verdes fotosintéticos; valor digestivo tradicional y néctar estival para insectos benéficos.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Capítulos sésiles dispuestos a lo largo de las alas' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Pico de floración estival' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Floración tardía' },
        { event_type: 'FLOWERING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Maduración de aquenios' },
        { event_type: 'FRUITING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Dispersión por viento' },
        { event_type: 'FRUITING' as const, month: 4, source_id: srcFloraArg.id, notes: 'Fin de fructificación' },
      ],
    },
    {
      scientific_name: 'Senna aphylla',
      canonical_name: 'Senna aphylla (Cav.) H.S.Irwin & Barneby',
      family: 'Fabaceae',
      common_names: ['Pichana', 'Pichanilla'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Arbusto',
      conservation_status: 'LC',
      notes: 'Arbusto áfilo xerofítico de ramas verdes rígidas cilíndricas y floración amarilla intensa vistosa en primavera-verano; polinización por zumbido (buzz pollination) por abejorros (*Bombus*).',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Floración amarilla brillante en ramas áfilas' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Pico de floración con alta visita de abejorros' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Legumbres cilíndricas en desarrollo' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Maduración de vainas' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Dehiscencia de semillas' },
      ],
    },
    {
      scientific_name: 'Lycium cestroides',
      canonical_name: 'Lycium cestroides Schltdl.',
      family: 'Solanaceae',
      common_names: ['Tala pampa', 'Churqui tala', 'Mata perro'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Arbusto',
      conservation_status: 'LC',
      notes: 'Arbusto espinoso ramificado con flores tubulares lilas-azuladas y bayas globosas oscuras consumidas por zorzales y calandrias.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Flores tubulares violáceas' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Plena floración' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Bayas oscuras en maduración' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Maduración de frutos' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Consumo por aves frugívoras' },
      ],
    },

    // -------------------------------------------------------------
    // CLIMBERS & VINES (Trepadoras y Enredaderas) - 3 species
    // -------------------------------------------------------------
    {
      scientific_name: 'Passiflora caerulea',
      canonical_name: 'Passiflora caerulea L.',
      family: 'Passifloraceae',
      common_names: ['Mburucuyá', 'Pasionaria', 'Flor de la pasión'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Trepadora',
      conservation_status: 'LC',
      notes: 'Trepadora con zarcillos y espectaculares flores complejas de corona azul y blanca. Planta hospedera obligada de la mariposa espejitos (*Dione vanillae*) y frutos comestibles de pulpa anaranjada dulce.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Aparición de flores celestes y blancas' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Plena floración y ovoposición de mariposas' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración continua' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Floración tardía' },
        { event_type: 'FLOWERING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Frutos ovoides verdes' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Maduración a color naranja brillante' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Cosecha de frutos comestibles' },
        { event_type: 'FRUITING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Fructificación final' },
        { event_type: 'SOWING' as const, month: 9, source_id: srcInta.id, notes: 'Siembra en primavera con semilla lavada' },
        { event_type: 'SOWING' as const, month: 10, source_id: srcInta.id, notes: 'Siembra de estación' },
      ],
    },
    {
      scientific_name: 'Dolichandra cynanchoides',
      canonical_name: 'Dolichandra cynanchoides Cham.',
      family: 'Bignoniaceae',
      common_names: ['Sacha huasca', 'Uña de gato', 'Flor de San Juan silvestre'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Trepadora',
      conservation_status: 'LC',
      notes: 'Trepadora leñosa con zarcillos trífidos uncinados; flores tubulares rojo-anaranjadas intensas polinizadas por colibríes.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Aparición de corolas tubulares rojas' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Floración llamativa para picaflores' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Cápsulas lineares comprimidas' },
        { event_type: 'FRUITING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Maduración de cápsulas leñosas' },
        { event_type: 'FRUITING' as const, month: 4, source_id: srcFloraArg.id, notes: 'Liberación de semillas aladas' },
      ],
    },
    {
      scientific_name: 'Tweedia australis',
      canonical_name: 'Tweedia australis (Malme) C.Ezcurra',
      family: 'Apocynaceae',
      common_names: ['Estrella del campo', 'Oxipétalo'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Trepadora',
      conservation_status: 'LC',
      notes: 'Enredadera herbácea voluble con flores celestes o violáceas en estrella; savia lechosa y hospedera de orugas de lepidópteros Danainae.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Flores en estrella celeste-turquesa' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Plena floración' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Floración continua' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Folículos fusiformes en desarrollo' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Maduración y dehiscencia de semillas con vilano' },
        { event_type: 'FRUITING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Dispersión anemócora' },
      ],
    },

    // -------------------------------------------------------------
    // HERBACEOUS & WILDFLOWERS (Herbáceas y Flores) - 4 species
    // -------------------------------------------------------------
    {
      scientific_name: 'Salvia guaranitica',
      canonical_name: 'Salvia guaranitica A.St.-Hil. ex Benth.',
      family: 'Lamiaceae',
      common_names: ['Salvia azul', 'Salvia guaranítica'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Hierba',
      conservation_status: 'LC',
      notes: 'Herbácea perenne aromática con espigas florales de corolas azul oscuro brillante; fuente primordial de néctar para colibríes y abejorros nativos.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Inicio de floración azul profunda' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Floración abundante de primavera' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival continua' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Floración con alta visita de picaflores' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Floración estival tardía' },
        { event_type: 'FLOWERING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Floración otoñal' },
        { event_type: 'FLOWERING' as const, month: 4, source_id: srcFloraArg.id, notes: 'Fin de temporada de floración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Clusas en maduración' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Maduración de semillas' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Dispersión de semillas' },
        { event_type: 'SOWING' as const, month: 8, source_id: srcInta.id, notes: 'Siembra en almácigo protegido' },
        { event_type: 'SOWING' as const, month: 9, source_id: srcInta.id, notes: 'Siembra de primavera temprana' },
        { event_type: 'PLANTING' as const, month: 9, source_id: srcInta.id, notes: 'División de matas o trasplante' },
        { event_type: 'PLANTING' as const, month: 10, source_id: srcInta.id, notes: 'Plantación en canteros y borduras' },
      ],
    },
    {
      scientific_name: 'Glandularia peruviana',
      canonical_name: 'Glandularia peruviana (L.) Small',
      family: 'Verbenaceae',
      common_names: ['Margarita punzó', 'Verbena roja'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Hierba',
      conservation_status: 'LC',
      notes: 'Hierba rastrera tapizante con densos ramilletes de flores escarlata brillante; gran valor ornamental y atracción constante de polinizadores diurnos.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 9, source_id: srcFloraArg.id, notes: 'Aparición de flores rojas punzó' },
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Pico de floración primaveral' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Floración intensa tapizante' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Floración' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Floración tardía' },
        { event_type: 'FLOWERING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Núculas en maduración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Dispersión de semillas' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Fructificación estival' },
        { event_type: 'SOWING' as const, month: 8, source_id: srcInta.id, notes: 'Siembra en cajón o almácigo' },
        { event_type: 'SOWING' as const, month: 9, source_id: srcInta.id, notes: 'Siembra primaveral directa' },
      ],
    },
    {
      scientific_name: 'Petunia axillaris',
      canonical_name: 'Petunia axillaris (Lam.) Britton, Sterns & Poggenb.',
      family: 'Solanaceae',
      common_names: ['Petunia blanca', 'Petunia silvestre'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Hierba',
      conservation_status: 'LC',
      notes: 'Hierba pubescente-viscosa con grandes flores blancas perfumadas al atardecer para la atracción de polinizadores nocturnos (esfíngidos/Sphingidae).',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Apertura de corolas blancas fragantes al atardecer' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Floración plena con atracción de polinizadores nocturnos' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Floración continua' },
        { event_type: 'FLOWERING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Floración tardía' },
        { event_type: 'FLOWERING' as const, month: 3, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Cápsulas dehiscentes con diminutas semillas' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Maduración de cápsulas' },
        { event_type: 'FRUITING' as const, month: 2, source_id: srcFloraArg.id, notes: 'Liberación de semillas' },
      ],
    },
    {
      scientific_name: 'Modiolastrum malvifolium',
      canonical_name: 'Modiolastrum malvifolium (Griseb.) K.Schum.',
      family: 'Malvaceae',
      common_names: ['Malvita de campo', 'Malvita'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Hierba',
      conservation_status: 'LC',
      notes: 'Hierba postrada con flores anaranjadas o asalmonadas solitarias axilares; forrajera nativa y melífera del pastizal del Espinal.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 9, source_id: srcFloraArg.id, notes: 'Flores anaranjadas en el estrato herbáceo' },
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Floración primaveral' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Pico de floración' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Floración estival' },
        { event_type: 'FLOWERING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Esquizocarpos en desarrollo' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Maduración de mericarpos' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Dispersión de semillas' },
      ],
    },

    // -------------------------------------------------------------
    // GRASSES (Gramíneas) - 1 species
    // -------------------------------------------------------------
    {
      scientific_name: 'Jarava plumosa',
      canonical_name: 'Jarava plumosa (Spreng.) S.W.L.Jacobs & J.Everett',
      family: 'Poaceae',
      common_names: ['Flecharilla', 'Paja brava', 'Pasto de zorro'],
      native_status: 'NATIVE' as const,
      growth_habit: 'Gramínea',
      conservation_status: 'LC',
      notes: 'Gramínea cespitosa perenne con aristas plumosas plateadas vistosas; estructuradora del estrato herbáceo del Espinal y refugio invernal de fauna benéfica.',
      phenology: [
        { event_type: 'FLOWERING' as const, month: 10, source_id: srcFloraArg.id, notes: 'Espiguillas con aristas plumosas plateadas' },
        { event_type: 'FLOWERING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Plena floración de pastizal' },
        { event_type: 'FLOWERING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Fin de floración' },
        { event_type: 'FRUITING' as const, month: 11, source_id: srcFloraArg.id, notes: 'Cariopsis en maduración' },
        { event_type: 'FRUITING' as const, month: 12, source_id: srcFloraArg.id, notes: 'Dispersión anemócora de semillas con penacho plumoso' },
        { event_type: 'FRUITING' as const, month: 1, source_id: srcFloraArg.id, notes: 'Caída de cariopsis' },
      ],
    },
  ];

  // Persist each species and its phenology records
  for (const spData of CURATED_SPECIES) {
    const spRecord = await prisma.regionalPlantSpecies.upsert({
      where: {
        species_ecological_region_unique: {
          scientific_name: spData.scientific_name,
          ecological_region_id: ecoEspinal.id,
        },
      },
      update: {
        canonical_name: spData.canonical_name,
        family: spData.family,
        common_names: spData.common_names,
        native_status: spData.native_status,
        growth_habit: spData.growth_habit,
        conservation_status: spData.conservation_status,
        notes: spData.notes,
      },
      create: {
        id: uuidv7(),
        scientific_name: spData.scientific_name,
        canonical_name: spData.canonical_name,
        family: spData.family,
        common_names: spData.common_names,
        native_status: spData.native_status,
        ecological_region_id: ecoEspinal.id,
        growth_habit: spData.growth_habit,
        conservation_status: spData.conservation_status,
        notes: spData.notes,
      },
    });

    for (const ph of spData.phenology) {
      await prisma.plantPhenology.upsert({
        where: {
          phenology_event_unique: {
            species_id: spRecord.id,
            ecological_region_id: ecoEspinal.id,
            event_type: ph.event_type,
            month: ph.month,
            source_id: ph.source_id,
          },
        },
        update: { notes: ph.notes },
        create: {
          id: uuidv7(),
          species_id: spRecord.id,
          ecological_region_id: ecoEspinal.id,
          event_type: ph.event_type,
          month: ph.month,
          source_id: ph.source_id,
          notes: ph.notes,
        },
      });
    }
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