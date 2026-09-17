// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  RegionalFloraView,
  RegionalFloraHeader,
  RegionalSpeciesCard,
  SeasonalSection,
  NativeFloraSection,
} from '../components';
import {
  GrowingRegionEntity,
  EcologicalRegionEntity,
  RegionalPlantSpeciesEntity,
  DataSourceEntity,
} from '@/core/domain/entities';
import { SeasonalFloraItem } from '@/core/domain/repositories';

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
  notes: 'Especie clave del Espinal',
  created_at: new Date(),
  updated_at: new Date(),
  ecological_region: mockEcologicalRegion,
  phenology_records: [
    {
      id: 'ph-1',
      species_id: 'sp-algarrobo',
      ecological_region_id: 'eco-espinal',
      event_type: 'SPROUTING',
      month: 9,
      source_id: 'ds-flora-arg',
      notes: null,
      created_at: new Date(),
      updated_at: new Date(),
      source: mockDataSource,
    },
    {
      id: 'ph-2',
      species_id: 'sp-algarrobo',
      ecological_region_id: 'eco-espinal',
      event_type: 'SPROUTING',
      month: 10,
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
  ecological_region: undefined,
  phenology_records: [],
};

const mockSeasonalSprouting: SeasonalFloraItem[] = [
  {
    species: mockSpeciesAlgarrobo,
    phenology: [mockSpeciesAlgarrobo.phenology_records![0]],
    ecological_region: mockEcologicalRegion,
  },
];

describe('ATP-ECO-001C: Regional Flora UI Tests', () => {
  describe('RegionalFloraHeader', () => {
    it('muestra el nombre del mes en español dinámicamente', () => {
      render(
        <RegionalFloraHeader
          month={9}
          growingRegion={mockGrowingRegion}
          primaryEcologicalRegion={mockEcologicalRegion}
        />
      );

      expect(screen.getByText('Septiembre en tu región')).toBeDefined();
      expect(screen.getByText('Arroyito · Córdoba · Argentina')).toBeDefined();
      expect(screen.getByText('Ecorregión: Espinal')).toBeDefined();
      expect(screen.getByText('ARROYITO_CBA')).toBeDefined();
    });

    it('no inventa ecorregión si no viene provista en los datos', () => {
      render(
        <RegionalFloraHeader
          month={9}
          growingRegion={{ ...mockGrowingRegion, ecological_regions: [] }}
          primaryEcologicalRegion={null}
        />
      );

      expect(screen.queryByText(/Ecorregión: Espinal/i)).toBeNull();
    });
  });

  describe('RegionalSpeciesCard', () => {
    it('renderiza nombres comunes, nombre científico, hábito humanizado, estatus nativo y fuente visible', () => {
      render(
        <RegionalSpeciesCard
          species={mockSpeciesAlgarrobo}
          activePhenology={mockSpeciesAlgarrobo.phenology_records}
          currentMonth={9}
          highlightEvent="SPROUTING"
          ecologicalRegion={mockEcologicalRegion}
        />
      );

      expect(screen.getByText('Algarrobo blanco / Iboká')).toBeDefined();
      expect(screen.getByText('Prosopis alba')).toBeDefined();
      expect(screen.getByText('Árbol')).toBeDefined();
      expect(screen.getByText('Nativa')).toBeDefined();
      expect(screen.getByText('Fabaceae')).toBeDefined();
      expect(screen.getByText('Espinal')).toBeDefined();
      expect(screen.getByText('Fuente: Flora Argentina / IBODA')).toBeDefined();

      const sourceLink = screen.getByRole('link', { name: /abrir fuente oficial/i });
      expect(sourceLink.getAttribute('href')).toBe('http://www.floraargentina.edu.ar');
      expect(sourceLink.getAttribute('target')).toBe('_blank');
    });

    it('no inventa ecorregión ni fuente si no existen en los datos', () => {
      render(
        <RegionalSpeciesCard
          species={mockSpeciesChilca}
          activePhenology={[]}
          currentMonth={10}
          highlightEvent="FLOWERING"
        />
      );

      expect(screen.getByText('Chilca dulce')).toBeDefined();
      expect(screen.getByText('Baccharis salicifolia')).toBeDefined();
      expect(screen.getByText('Arbusto')).toBeDefined();
      expect(screen.queryByText('Espinal')).toBeNull();
      expect(screen.getByText('Fuente: Fuente no informada')).toBeDefined();
      expect(screen.queryByText('Flora Argentina / Institución botánica')).toBeNull();
    });
  });

  describe('SeasonalSection', () => {
    it('no renderiza nada cuando la lista de items está vacía (ocultar bloques vacíos)', () => {
      const { container } = render(
        <SeasonalSection
          eventType="FRUITING"
          items={[]}
          currentMonth={9}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renderiza título específico del evento cuando hay items', () => {
      render(
        <SeasonalSection
          eventType="SPROUTING"
          items={mockSeasonalSprouting}
          currentMonth={9}
        />
      );

      expect(screen.getByText('Brotan este mes')).toBeDefined();
      expect(screen.getByText('1 especie')).toBeDefined();
      expect(screen.getByText('Prosopis alba')).toBeDefined();
    });
  });

  describe('NativeFloraSection — Escalabilidad', () => {
    it('muestra el catálogo de nativas y limita el display inicial si supera initialLimit', () => {
      const fifteenSpecies: RegionalPlantSpeciesEntity[] = Array.from({ length: 15 }, (_, i) => ({
        id: `sp-${i + 1}`,
        scientific_name: `Species ${i + 1}`,
        canonical_name: `Nativa ${i + 1}`,
        family: 'Fabaceae',
        common_names: [`Nativa ${i + 1}`],
        native_status: 'NATIVE',
        ecological_region_id: 'eco-espinal',
        reference_id: null,
        growth_habit: i % 2 === 0 ? 'TREE' : 'SHRUB',
        conservation_status: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
        phenology_records: [],
      }));

      render(
        <NativeFloraSection
          nativeSpecies={fifteenSpecies}
          currentMonth={9}
          ecologicalRegion={mockEcologicalRegion}
          initialLimit={5}
        />
      );

      expect(screen.getByText('Nativas de tu región')).toBeDefined();
      expect(screen.getByText('15 registradas')).toBeDefined();

      // Inicialmente se muestran 5
      expect(screen.getByText('Ver todas (15)')).toBeDefined();
      expect(screen.getByText('Species 1')).toBeDefined();
      expect(screen.getByText('Species 5')).toBeDefined();
      expect(screen.queryByText('Species 6')).toBeNull();

      // Click en "Ver todas"
      const showAllBtn = screen.getByRole('button', { name: /ver todas/i });
      fireEvent.click(showAllBtn);

      expect(screen.getByText('Species 6')).toBeDefined();
      expect(screen.getByText('Species 15')).toBeDefined();
      expect(screen.getByText('Mostrar menos')).toBeDefined();

      // Click en "Mostrar menos"
      const showLessBtn = screen.getByRole('button', { name: /mostrar menos/i });
      fireEvent.click(showLessBtn);
      expect(screen.queryByText('Species 6')).toBeNull();
    });
  });

  describe('RegionalFloraView', () => {
    it('renderiza las secciones estacionales en orden estricto y la sección nativas', () => {
      render(
        <RegionalFloraView
          month={9}
          growingRegion={mockGrowingRegion}
          primaryEcologicalRegion={mockEcologicalRegion}
          sproutingItems={mockSeasonalSprouting}
          floweringItems={[]}
          fruitingItems={[]}
          sowingItems={[]}
          plantingItems={[]}
          nativeSpecies={[mockSpeciesAlgarrobo, mockSpeciesChilca]}
        />
      );

      // 1. Sprouting presente
      expect(screen.getByText('Brotan este mes')).toBeDefined();

      // 2, 3, 4, 5 Vacíos: No se deben renderizar
      expect(screen.queryByText('Florecen este mes')).toBeNull();
      expect(screen.queryByText('Fructifican este mes')).toBeNull();
      expect(screen.queryByText('Buen momento para sembrar')).toBeNull();
      expect(screen.queryByText('Buen momento para plantar')).toBeNull();

      // 6. Nativas de tu región presente
      expect(screen.getByText('Nativas de tu región')).toBeDefined();
    });
  });
});
