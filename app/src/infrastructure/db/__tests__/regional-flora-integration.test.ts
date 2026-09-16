import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../prisma';
import {
  PrismaRegionalFloraRepository,
  PrismaEcologicalRegionRepository,
  PrismaDataSourceRepository,
  PrismaGrowingRegionRepository,
} from '../repositories/PrismaRegionalFloraRepository';
import { generateUUIDv7 } from '@/core/domain/uuid';

describe('PostgreSQL Regional & Seasonal Flora Integration Tests (ATP-ECO-001A)', () => {
  const floraRepo = new PrismaRegionalFloraRepository();
  const ecoRepo = new PrismaEcologicalRegionRepository();
  const sourceRepo = new PrismaDataSourceRepository();
  const growingRepo = new PrismaGrowingRegionRepository();

  const testPrefix = `test-${generateUUIDv7()}`;
  let testDataSourceId: string;
  let testEcoRegion1Id: string;
  let testEcoRegion2Id: string;
  let testGrowingRegionId: string;
  let testSpecies1Id: string;
  let testSpecies2Id: string;

  beforeAll(async () => {
    // 1. Create a test DataSource
    const ds = await sourceRepo.create({
      name: `${testPrefix}-source`,
      type: 'SCIENTIFIC_PUBLICATION',
      url: 'https://test.example.com',
      description: 'Test source description',
    });
    testDataSourceId = ds.id;

    // 2. Create two test Ecological Regions
    const eco1 = await ecoRepo.create({
      code: `${testPrefix.slice(0, 10)}_ECO1`.toUpperCase(),
      name: `${testPrefix} EcoRegion 1`,
      biome: 'Test Biome 1',
    });
    testEcoRegion1Id = eco1.id;

    const eco2 = await ecoRepo.create({
      code: `${testPrefix.slice(0, 10)}_ECO2`.toUpperCase(),
      name: `${testPrefix} EcoRegion 2`,
      biome: 'Test Biome 2',
    });
    testEcoRegion2Id = eco2.id;

    // 3. Create a test Growing Region and link both ecoregions
    const gr = await growingRepo.create({
      code: `${testPrefix.slice(0, 10)}_GR`.toUpperCase(),
      name: `${testPrefix} Growing Region`,
      country: 'Argentina',
      province: 'Córdoba',
      locality: 'Test Locality',
    });
    testGrowingRegionId = gr.id;

    await growingRepo.linkEcologicalRegion({
      growing_region_id: testGrowingRegionId,
      ecological_region_id: testEcoRegion1Id,
      is_primary: true,
      notes: 'Primary test region',
    });

    await growingRepo.linkEcologicalRegion({
      growing_region_id: testGrowingRegionId,
      ecological_region_id: testEcoRegion2Id,
      is_primary: false,
      notes: 'Secondary test region',
    });
  });

  afterAll(async () => {
    // Cleanup test data in reverse dependency order
    if (testSpecies1Id || testSpecies2Id) {
      await prisma.plantPhenology.deleteMany({
        where: {
          species_id: { in: [testSpecies1Id, testSpecies2Id].filter(Boolean) },
        },
      });
      await prisma.regionalPlantSpecies.deleteMany({
        where: {
          id: { in: [testSpecies1Id, testSpecies2Id].filter(Boolean) },
        },
      });
    }

    if (testGrowingRegionId) {
      await prisma.growingRegionEcologicalRegion.deleteMany({
        where: { growing_region_id: testGrowingRegionId },
      });
      await prisma.growingRegion.deleteMany({
        where: { id: testGrowingRegionId },
      });
    }

    if (testEcoRegion1Id || testEcoRegion2Id) {
      await prisma.ecologicalRegion.deleteMany({
        where: { id: { in: [testEcoRegion1Id, testEcoRegion2Id].filter(Boolean) } },
      });
    }

    if (testDataSourceId) {
      await prisma.dataSource.deleteMany({
        where: { id: testDataSourceId },
      });
    }
  });

  it('A. verifies canonical seed data for Arroyito and Espinal', async () => {
    const espinal = await ecoRepo.findByCode('ESPINAL');
    expect(espinal).not.toBeNull();
    expect(espinal?.biome).toContain('Bosque');

    const arroyito = await growingRepo.findByCode('ARROYITO_CBA');
    expect(arroyito).not.toBeNull();
    expect(arroyito?.province).toBe('Córdoba');
    expect(arroyito?.ecological_regions).toBeDefined();
    expect(arroyito?.ecological_regions?.length).toBeGreaterThanOrEqual(1);

    // Verify native species seeded in Espinal
    const algarrobo = await floraRepo.findSpeciesByScientificNameAndRegion(
      'Prosopis alba',
      espinal!.id
    );
    expect(algarrobo).not.toBeNull();
    expect(algarrobo?.native_status).toBe('NATIVE');
    expect(algarrobo?.phenology_records?.length).toBeGreaterThanOrEqual(5);

    // Verify spring seasonal events in month 9 (September) for Arroyito
    const sepEvents = await floraRepo.listSeasonalEvents({
      growing_region_code: 'ARROYITO_CBA',
      month: 9,
    });
    expect(sepEvents.length).toBeGreaterThanOrEqual(2);
    const speciesNames = sepEvents.map((item) => item.species.scientific_name);
    expect(speciesNames).toContain('Prosopis alba');
    expect(speciesNames).toContain('Geoffroea decorticans');
  });

  it('B. creates a RegionalPlantSpecies with botanical data and queries it', async () => {
    const created = await floraRepo.createSpecies({
      scientific_name: `${testPrefix} Acacia aroma`,
      canonical_name: `${testPrefix} Acacia aroma Gillies ex Hook. & Arn.`,
      family: 'Fabaceae',
      common_names: ['Tusca', 'Aromita'],
      native_status: 'NATIVE',
      ecological_region_id: testEcoRegion1Id,
      growth_habit: 'Arbusto',
      conservation_status: 'LC',
      notes: 'Test note for Tusca',
    });

    testSpecies1Id = created.id;
    expect(created.id).toBeDefined();
    expect(created.scientific_name).toBe(`${testPrefix} Acacia aroma`);
    expect(created.common_names).toEqual(['Tusca', 'Aromita']);
    expect(created.ecological_region?.id).toBe(testEcoRegion1Id);

    // Query by region & habit
    const list = await floraRepo.listSpeciesByRegion({
      ecological_region_id: testEcoRegion1Id,
      growth_habit: 'Arbusto',
    });
    expect(list.some((s) => s.id === testSpecies1Id)).toBe(true);
  });

  it('C. creates phenological events with mandatory source_id and verifies retrieval', async () => {
    // 1. Sprouting in month 9
    const phen1 = await floraRepo.createPhenology({
      species_id: testSpecies1Id,
      ecological_region_id: testEcoRegion1Id,
      event_type: 'SPROUTING',
      month: 9,
      source_id: testDataSourceId,
      notes: 'Brotación de prueba',
    });
    expect(phen1.id).toBeDefined();
    expect(phen1.event_type).toBe('SPROUTING');
    expect(phen1.month).toBe(9);
    expect(phen1.source?.id).toBe(testDataSourceId);

    // 2. Flowering in month 9 (same month, different event type allowed)
    const phen2 = await floraRepo.createPhenology({
      species_id: testSpecies1Id,
      ecological_region_id: testEcoRegion1Id,
      event_type: 'FLOWERING',
      month: 9,
      source_id: testDataSourceId,
      notes: 'Floración de prueba',
    });
    expect(phen2.id).toBeDefined();

    // Query seasonal events for month 9 in test growing region
    const seasonal = await floraRepo.listSeasonalEvents({
      growing_region_code: `${testPrefix.slice(0, 10)}_GR`.toUpperCase(),
      month: 9,
    });
    const foundItem = seasonal.find((item) => item.species.id === testSpecies1Id);
    expect(foundItem).toBeDefined();
    expect(foundItem?.phenology.length).toBe(2);
  });

  it('D. allows same species scientific name in a DIFFERENT ecological region (N:M ecoregion distribution)', async () => {
    const createdEco2 = await floraRepo.createSpecies({
      scientific_name: `${testPrefix} Acacia aroma`, // Same scientific name as testSpecies1
      family: 'Fabaceae',
      native_status: 'NATIVE',
      ecological_region_id: testEcoRegion2Id, // Different ecological region
      growth_habit: 'Arbusto',
    });

    testSpecies2Id = createdEco2.id;
    expect(testSpecies2Id).not.toBe(testSpecies1Id);
    expect(createdEco2.ecological_region_id).toBe(testEcoRegion2Id);
  });

  it('E. enforces unique constraint on [scientific_name, ecological_region_id]', async () => {
    // Attempting to create duplicate species in the same ecological region returns existing or throws
    const duplicate = await floraRepo.createSpecies({
      scientific_name: `${testPrefix} Acacia aroma`,
      ecological_region_id: testEcoRegion1Id,
    });
    expect(duplicate.id).toBe(testSpecies1Id);
  });

  it('F. enforces unique constraint on phenological record [species_id, ecological_region_id, event_type, month, source_id]', async () => {
    await expect(
      floraRepo.createPhenology({
        species_id: testSpecies1Id,
        ecological_region_id: testEcoRegion1Id,
        event_type: 'SPROUTING',
        month: 9,
        source_id: testDataSourceId,
      })
    ).rejects.toThrow();
  });

  it('G. fails with foreign key constraint when source_id is invalid', async () => {
    await expect(
      floraRepo.createPhenology({
        species_id: testSpecies1Id,
        ecological_region_id: testEcoRegion1Id,
        event_type: 'FRUITING',
        month: 12,
        source_id: '00000000-0000-0000-0000-000000000000',
      })
    ).rejects.toThrow();
  });

  it('H. verifies curated collection of >= 20 native species in Espinal with balanced growth habits (ATP-ECO-001B)', async () => {
    const espinal = await ecoRepo.findByCode('ESPINAL');
    expect(espinal).not.toBeNull();

    const speciesList = await floraRepo.listSpeciesByRegion({
      ecological_region_id: espinal!.id,
    });

    expect(speciesList.length).toBeGreaterThanOrEqual(20);

    // All must have NATIVE status
    for (const sp of speciesList) {
      expect(sp.native_status).toBe('NATIVE');
      expect(sp.scientific_name).toBeDefined();
      expect(sp.family).toBeDefined();
    }

    // Verify presence of emblematic species
    const names = speciesList.map((s) => s.scientific_name);
    expect(names).toContain('Prosopis alba');
    expect(names).toContain('Geoffroea decorticans');
    expect(names).toContain('Vachellia caven');
    expect(names).toContain('Celtis tala');
    expect(names).toContain('Schinus fasciculata');
    expect(names).toContain('Jodina rhombifolia');
    expect(names).toContain('Aloysia gratissima');
    expect(names).toContain('Lantana camara');
    expect(names).toContain('Baccharis salicifolia');
    expect(names).toContain('Baccharis articulata');
    expect(names).toContain('Senna aphylla');
    expect(names).toContain('Lycium cestroides');
    expect(names).toContain('Passiflora caerulea');
    expect(names).toContain('Dolichandra cynanchoides');
    expect(names).toContain('Tweedia australis');
    expect(names).toContain('Salvia guaranitica');
    expect(names).toContain('Glandularia peruviana');
    expect(names).toContain('Petunia axillaris');
    expect(names).toContain('Modiolastrum malvifolium');
    expect(names).toContain('Jarava plumosa');

    // Verify distribution across habits
    const habits = speciesList.map((s) => s.growth_habit);
    expect(habits.filter((h) => h === 'Árbol').length).toBeGreaterThanOrEqual(2);
    expect(habits.filter((h) => h === 'Arbusto').length).toBeGreaterThanOrEqual(4);
    expect(habits.filter((h) => h === 'Trepadora').length).toBeGreaterThanOrEqual(3);
    expect(habits.filter((h) => h === 'Hierba').length).toBeGreaterThanOrEqual(4);
    expect(habits.filter((h) => h === 'Gramínea').length).toBeGreaterThanOrEqual(1);
  });

  it('I. verifies seasonal events queries for September, October, November, and December in Arroyito', async () => {
    // September (mes 9): Spring awakening
    const sepEvents = await floraRepo.listSeasonalEvents({
      growing_region_code: 'ARROYITO_CBA',
      month: 9,
    });
    expect(sepEvents.length).toBeGreaterThanOrEqual(5);

    // October (mes 10): Peak spring flowering
    const octEvents = await floraRepo.listSeasonalEvents({
      growing_region_code: 'ARROYITO_CBA',
      month: 10,
    });
    expect(octEvents.length).toBeGreaterThanOrEqual(10);
    const octFlowering = await floraRepo.listSeasonalEvents({
      growing_region_code: 'ARROYITO_CBA',
      month: 10,
      event_type: 'FLOWERING',
    });
    expect(octFlowering.length).toBeGreaterThanOrEqual(8);

    // November (mes 11): Late spring flowering / early fruiting
    const novEvents = await floraRepo.listSeasonalEvents({
      growing_region_code: 'ARROYITO_CBA',
      month: 11,
    });
    expect(novEvents.length).toBeGreaterThanOrEqual(10);

    // December (mes 12): Summer fruiting / sowing
    const decEvents = await floraRepo.listSeasonalEvents({
      growing_region_code: 'ARROYITO_CBA',
      month: 12,
    });
    expect(decEvents.length).toBeGreaterThanOrEqual(10);
    const decFruiting = await floraRepo.listSeasonalEvents({
      growing_region_code: 'ARROYITO_CBA',
      month: 12,
      event_type: 'FRUITING',
    });
    expect(decFruiting.length).toBeGreaterThanOrEqual(6);
  });

  it('J. verifies habit filtering across the regional catalogue', async () => {
    const trees = await floraRepo.listSpeciesByRegion({
      growing_region_code: 'ARROYITO_CBA',
      growth_habit: 'Árbol',
    });
    expect(trees.length).toBeGreaterThanOrEqual(2);

    const climbers = await floraRepo.listSpeciesByRegion({
      growing_region_code: 'ARROYITO_CBA',
      growth_habit: 'Trepadora',
    });
    expect(climbers.length).toBeGreaterThanOrEqual(3);
    const climberNames = climbers.map((c) => c.scientific_name);
    expect(climberNames).toContain('Passiflora caerulea');
    expect(climberNames).toContain('Dolichandra cynanchoides');
    expect(climberNames).toContain('Tweedia australis');
  });

  it('K. validates botanical data sources and strict provenance on all phenology records', async () => {
    const sources = await sourceRepo.findAll();
    expect(sources.length).toBeGreaterThanOrEqual(5);

    const sourceNames = sources.map((s) => s.name);
    expect(sourceNames.some((n) => n.includes('Flora Argentina'))).toBe(true);
    expect(sourceNames.some((n) => n.includes('INTA'))).toBe(true);
    expect(sourceNames.some((n) => n.includes('SIB'))).toBe(true);
    expect(sourceNames.some((n) => n.includes('UNC'))).toBe(true);

    // Query phenology records for Prosopis alba and ensure every record has a source
    const espinal = await ecoRepo.findByCode('ESPINAL');
    const algarrobo = await floraRepo.findSpeciesByScientificNameAndRegion(
      'Prosopis alba',
      espinal!.id
    );
    expect(algarrobo?.phenology_records).toBeDefined();
    expect(algarrobo?.phenology_records?.length).toBeGreaterThanOrEqual(10);
    for (const ph of algarrobo!.phenology_records!) {
      expect(ph.source_id).toBeDefined();
      expect(ph.source).toBeDefined();
      expect(ph.source?.name).toBeDefined();
    }
  });
});

