import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { setRegionalFloraRepository, setGrowingRegionRepository } from '@/infrastructure/services/serviceContainer';
import {
  RegionalPlantSpeciesEntity,
  GrowingRegionEntity,
  EcologicalRegionEntity,
  DataSourceEntity,
} from '@/core/domain/entities';
import {
  IRegionalFloraRepository,
  IGrowingRegionRepository,
  SeasonalFloraItem,
} from '@/core/domain/repositories';

const mockDataSource: DataSourceEntity = {
  id: 'ds-flora-arg',
  name: 'Flora Argentina / IBODA',
  type: 'BOTANICAL_INSTITUTION',
  url: 'http://www.floraargentina.edu.ar',
  description: 'Catálogo Botánico Oficial',
  version: '2026',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockEcologicalRegion: EcologicalRegionEntity = {
  id: 'eco-espinal',
  code: 'ESPINAL_ALGARROBO',
  name: 'Espinal',
  biome: 'Bosque xerófilo',
  description: 'Distrito del Algarrobo',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockGrowingRegion: GrowingRegionEntity = {
  id: 'gr-arroyito',
  code: 'ARROYITO_CBA',
  name: 'Arroyito',
  country: 'Argentina',
  province: 'Córdoba',
  locality: 'Arroyito',
  latitude: -31.42,
  longitude: -63.05,
  description: null,
  created_at: new Date(),
  updated_at: new Date(),
  ecological_regions: [
    {
      growing_region_id: 'gr-arroyito',
      ecological_region_id: 'eco-espinal',
      is_primary: true,
      notes: null,
      created_at: new Date(),
      ecological_region: mockEcologicalRegion,
    },
  ],
};

const mockSpeciesAlgarrobo: RegionalPlantSpeciesEntity = {
  id: 'sp-algarrobo',
  scientific_name: 'Prosopis alba',
  canonical_name: 'Algarrobo blanco',
  family: 'Fabaceae',
  common_names: ['Algarrobo blanco', 'Iboká'],
  native_status: 'NATIVE',
  ecological_region_id: 'eco-espinal',
  reference_id: null,
  growth_habit: 'TREE',
  conservation_status: 'Preocupación menor',
  notes: 'Especie clave',
  created_at: new Date(),
  updated_at: new Date(),
  ecological_region: mockEcologicalRegion,
  phenology_records: [
    {
      id: 'ph-1',
      species_id: 'sp-algarrobo',
      ecological_region_id: 'eco-espinal',
      event_type: 'FLOWERING',
      month: 9,
      source_id: 'ds-flora-arg',
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      source: mockDataSource,
    },
  ],
};

const mockSpeciesChañar: RegionalPlantSpeciesEntity = {
  id: 'sp-chanar',
  scientific_name: 'Geoffroea decorticans',
  canonical_name: 'Chañar',
  family: 'Fabaceae',
  common_names: ['Chañar'],
  native_status: 'NATIVE',
  ecological_region_id: 'eco-espinal',
  reference_id: null,
  growth_habit: 'TREE',
  conservation_status: null,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  ecological_region: mockEcologicalRegion,
  phenology_records: [
    {
      id: 'ph-2',
      species_id: 'sp-chanar',
      ecological_region_id: 'eco-espinal',
      event_type: 'FLOWERING',
      month: 9,
      source_id: 'ds-flora-arg',
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      source: mockDataSource,
    },
  ],
};

const mockSpeciesChilca: RegionalPlantSpeciesEntity = {
  id: 'sp-chilca',
  scientific_name: 'Baccharis salicifolia',
  canonical_name: 'Chilca dulce',
  family: 'Asteraceae',
  common_names: ['Chilca dulce'],
  native_status: 'NATIVE',
  ecological_region_id: 'eco-espinal',
  reference_id: null,
  growth_habit: 'SHRUB',
  conservation_status: null,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  ecological_region: mockEcologicalRegion,
  phenology_records: [
    {
      id: 'ph-3',
      species_id: 'sp-chilca',
      ecological_region_id: 'eco-espinal',
      event_type: 'SPROUTING',
      month: 9,
      source_id: 'ds-flora-arg',
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      source: mockDataSource,
    },
  ],
};

describe('Home Assistant Regional Flora API (ATP-ECO-001D)', () => {
  const testSecret = 'ha_read_secret_test_key_12345678901234567890';
  const originalSecret = process.env.HOME_ASSISTANT_READ_API_SECRET;

  beforeEach(() => {
    process.env.HOME_ASSISTANT_READ_API_SECRET = testSecret;

    // Mock GrowingRegionRepository
    const mockGrowingRepo: IGrowingRegionRepository = {
      findByCode: vi.fn().mockResolvedValue(mockGrowingRegion),
      findById: vi.fn().mockResolvedValue(mockGrowingRegion),
      findAll: vi.fn().mockResolvedValue([mockGrowingRegion]),
      create: vi.fn(),
      linkEcologicalRegion: vi.fn(),
    };
    setGrowingRegionRepository(mockGrowingRepo);

    // Mock RegionalFloraRepository
    const mockFloraRepo: IRegionalFloraRepository = {
      listSpeciesByRegion: vi.fn().mockImplementation(async (opts) => {
        let list = [mockSpeciesAlgarrobo, mockSpeciesChañar, mockSpeciesChilca];
        if (opts.growth_habit) {
          list = list.filter((s) => s.growth_habit === opts.growth_habit);
        }
        return list;
      }),
      listSeasonalEvents: vi.fn().mockImplementation(async (opts) => {
        const results: SeasonalFloraItem[] = [];
        const speciesList = [mockSpeciesAlgarrobo, mockSpeciesChañar, mockSpeciesChilca];

        for (const sp of speciesList) {
          const match = sp.phenology_records?.find(
            (p) => p.month === opts.month && (!opts.event_type || p.event_type === opts.event_type)
          );
          if (match) {
            results.push({
              species: sp,
              phenology: [match],
              ecological_region: mockEcologicalRegion,
            });
          }
        }
        return results;
      }),
      findSpeciesById: vi.fn(),
      findSpeciesByScientificNameAndRegion: vi.fn(),
      createSpecies: vi.fn(),
      createPhenology: vi.fn(),
    };
    setRegionalFloraRepository(mockFloraRepo);
  });

  afterEach(() => {
    process.env.HOME_ASSISTANT_READ_API_SECRET = originalSecret;
    setGrowingRegionRepository(null);
    setRegionalFloraRepository(null);
    vi.restoreAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/home-assistant/regional/current');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('No autorizado');
    });

    it('returns 401 when Bearer token does not match secret', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/home-assistant/regional/current', {
        headers: {
          Authorization: 'Bearer invalid_wrong_token',
        },
      });
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('No autorizado');
    });

    it('returns 401 fail-closed when HOME_ASSISTANT_READ_API_SECRET is not configured', async () => {
      delete process.env.HOME_ASSISTANT_READ_API_SECRET;
      const req = new NextRequest('http://localhost:3000/api/integrations/home-assistant/regional/current', {
        headers: {
          Authorization: `Bearer ${testSecret}`,
        },
      });
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe('Successful Data Retrieval & DTO Sanitization', () => {
    it('returns 200 OK with sanitized regional flora DTO for current month', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/home-assistant/regional/current?month=9', {
        headers: {
          Authorization: `Bearer ${testSecret}`,
        },
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.schema_version).toBe('1');
      expect(json.region.code).toBe('ARROYITO_CBA');
      expect(json.region.name).toBe('Arroyito');
      expect(json.region.province).toBe('Córdoba');
      expect(json.region.country).toBe('Argentina');
      expect(json.region.ecological_region).toBe('Espinal');

      expect(json.month.number).toBe(9);
      expect(json.month.name).toBe('Septiembre');

      expect(json.summary.flowering_count).toBe(2);
      expect(json.summary.sprouting_count).toBe(1);
      expect(json.summary.native_count).toBe(3);

      expect(json.events.flowering.length).toBe(2);
      expect(json.events.sprouting.length).toBe(1);
      expect(json.events.fruiting.length).toBe(0);

      // Verify species DTO content
      const firstFlowering = json.events.flowering[0];
      expect(firstFlowering.common_name).toBe('Algarrobo blanco / Iboká');
      expect(firstFlowering.scientific_name).toBe('Prosopis alba');
      expect(firstFlowering.growth_habit).toBe('Árbol');
      expect(firstFlowering.native_status).toBe('NATIVE');
      expect(firstFlowering.relevant_months).toBe('Sep');
      expect(firstFlowering.source_name).toBe('Flora Argentina / IBODA');
      expect(firstFlowering.source_url).toBe('http://www.floraargentina.edu.ar');

      // Sanitization verification: NO internal IDs or Prisma fields
      expect(json.id).toBeUndefined();
      expect(json.ecological_region_id).toBeUndefined();
      expect(firstFlowering.id).toBeUndefined();
      expect(firstFlowering.species_id).toBeUndefined();
      expect(firstFlowering.source_id).toBeUndefined();
    });
  });

  describe('Query Filters & Validation', () => {
    it('filters by event type (e.g. ?event=FLOWERING)', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/integrations/home-assistant/regional/current?month=9&event=FLOWERING',
        {
          headers: {
            Authorization: `Bearer ${testSecret}`,
          },
        }
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.filter?.event).toBe('FLOWERING');
      expect(json.events.flowering.length).toBe(2);
      expect(json.events.sprouting.length).toBe(0);
    });

    it('filters by growth habit (e.g. ?habit=TREE)', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/integrations/home-assistant/regional/current?month=9&habit=TREE',
        {
          headers: {
            Authorization: `Bearer ${testSecret}`,
          },
        }
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.filter?.habit).toBe('TREE');
      expect(json.summary.flowering_count).toBe(2);
      expect(json.summary.sprouting_count).toBe(0); // Chilca is SHRUB so filtered out
      expect(json.summary.native_count).toBe(2); // Only Algarrobo & Chañar
    });

    it('returns 400 when month parameter is invalid (< 1 or > 12 or text)', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/integrations/home-assistant/regional/current?month=13',
        {
          headers: {
            Authorization: `Bearer ${testSecret}`,
          },
        }
      );
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/número entero entre 1 y 12/);
    });

    it('returns 400 when event parameter is invalid', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/integrations/home-assistant/regional/current?event=INVALID_EVENT',
        {
          headers: {
            Authorization: `Bearer ${testSecret}`,
          },
        }
      );
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Tipo de evento inválido/);
    });

    it('returns 400 when habit parameter is invalid', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/integrations/home-assistant/regional/current?habit=SUPER_TREE',
        {
          headers: {
            Authorization: `Bearer ${testSecret}`,
          },
        }
      );
      const res = await GET(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Hábito de crecimiento inválido/);
    });
  });
});
