// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  RegionalFloraView,
  RegionalFloraHeader,
  SeasonalSummaryBar,
  RegionalSpeciesCard,
  SeasonalSection,
  NativeFloraSection,
  SpeciesDetailModal,
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
  notes: 'Especie clave del Espinal con gran valor para sombra',
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

describe('ATP-ECO-001C.2: Regional Flora UX Redesign Tests', () => {
  describe('SeasonalSummaryBar', () => {
    it('muestra los contadores estacionales de forma escaneable', () => {
      render(
        <SeasonalSummaryBar
          sproutingCount={3}
          floweringCount={5}
          fruitingCount={2}
          sowingCount={4}
          plantingCount={1}
          nativeCount={20}
        />
      );

      expect(screen.getByText('3')).toBeDefined();
      expect(screen.getByText('brotan')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();
      expect(screen.getByText('florecen')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined();
      expect(screen.getByText('fructifican')).toBeDefined();
      expect(screen.getByText('4')).toBeDefined();
      expect(screen.getByText('para sembrar')).toBeDefined();
      expect(screen.getByText('1')).toBeDefined();
      expect(screen.getByText('para plantar')).toBeDefined();
      expect(screen.getByText('20')).toBeDefined();
      expect(screen.getByText('nativas')).toBeDefined();
    });

    it('ejecuta callback onSelectSection al hacer clic en un contador', () => {
      const onSelect = vi.fn();
      render(
        <SeasonalSummaryBar
          sproutingCount={3}
          floweringCount={0}
          fruitingCount={0}
          sowingCount={0}
          plantingCount={0}
          nativeCount={10}
          onSelectSection={onSelect}
        />
      );

      const sproutingBtn = screen.getByRole('button', { name: /3 brotan/i });
      fireEvent.click(sproutingBtn);
      expect(onSelect).toHaveBeenCalledWith('seasonal-sprouting');
    });
  });

  describe('RegionalFloraHeader', () => {
    it('muestra el nombre del mes en español dinámicamente y la barra de resumen', () => {
      render(
        <RegionalFloraHeader
          month={9}
          growingRegion={mockGrowingRegion}
          primaryEcologicalRegion={mockEcologicalRegion}
          sproutingCount={1}
          nativeCount={2}
        />
      );

      expect(screen.getByText('Septiembre en tu región')).toBeDefined();
      expect(screen.getByText('Arroyito · Córdoba · Argentina')).toBeDefined();
      expect(screen.getByText('Ecorregión: Espinal')).toBeDefined();
      expect(screen.getByText('ARROYITO_CBA')).toBeDefined();
      expect(screen.getByText('1')).toBeDefined();
      expect(screen.getByText('brotan')).toBeDefined();
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

  describe('RegionalSpeciesCard (Modo Compacto)', () => {
    it('renderiza únicamente nombres, hábito, badge nativo y evento fenológico relevante', () => {
      const onOpenDetail = vi.fn();
      render(
        <RegionalSpeciesCard
          species={mockSpeciesAlgarrobo}
          activePhenology={mockSpeciesAlgarrobo.phenology_records}
          currentMonth={9}
          highlightEvent="SPROUTING"
          ecologicalRegion={mockEcologicalRegion}
          onOpenDetail={onOpenDetail}
        />
      );

      // Presente en card compacta
      expect(screen.getByText('Algarrobo blanco / Iboká')).toBeDefined();
      expect(screen.getByText('Prosopis alba')).toBeDefined();
      expect(screen.getByText('Árbol')).toBeDefined();
      expect(screen.getByText('Nativa')).toBeDefined();
      expect(screen.getByText(/Brotación · Sep–Oct/i)).toBeDefined();
      expect(screen.getByText('Detalle')).toBeDefined();

      // NO presente en card compacta (diseño limpio sin sobrecarga)
      expect(screen.queryByText('Fabaceae')).toBeNull();
      expect(screen.queryByText('Ecorregión:')).toBeNull();
      expect(screen.queryByText('Especie clave del Espinal con gran valor para sombra')).toBeNull();
      expect(screen.queryByText(/Fuente: Flora Argentina/i)).toBeNull();
    });

    it('abre el detalle al hacer clic o presionar Enter', () => {
      const onOpenDetail = vi.fn();
      render(
        <RegionalSpeciesCard
          species={mockSpeciesAlgarrobo}
          activePhenology={mockSpeciesAlgarrobo.phenology_records}
          currentMonth={9}
          highlightEvent="SPROUTING"
          onOpenDetail={onOpenDetail}
        />
      );

      const card = screen.getByRole('button', { name: /especie regional: algarrobo blanco/i });
      fireEvent.click(card);
      expect(onOpenDetail).toHaveBeenCalledWith(mockSpeciesAlgarrobo);

      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onOpenDetail).toHaveBeenCalledTimes(2);
    });
  });

  describe('SpeciesDetailModal', () => {
    it('renderiza la ficha botánica completa cuando está abierto', () => {
      const onClose = vi.fn();
      render(
        <SpeciesDetailModal
          isOpen={true}
          onClose={onClose}
          species={mockSpeciesAlgarrobo}
          ecologicalRegion={mockEcologicalRegion}
        />
      );

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Algarrobo blanco / Iboká')).toBeDefined();
      expect(screen.getByText(/Prosopis alba/)).toBeDefined();
      expect(screen.getByText(/Familia Fabaceae/)).toBeDefined();
      expect(screen.getByText('Espinal')).toBeDefined();
      expect(screen.getByText('Especie clave del Espinal con gran valor para sombra')).toBeDefined();
      expect(screen.getByText('Flora Argentina / IBODA')).toBeDefined();

      const sourceLink = screen.getByRole('link', { name: /abrir fuente oficial/i });
      expect(sourceLink.getAttribute('href')).toBe('http://www.floraargentina.edu.ar');
      expect(sourceLink.getAttribute('target')).toBe('_blank');

      // Cerrar modal
      const closeBtn = screen.getByRole('button', { name: /cerrar detalle de especie/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('no inventa ecorregión ni fuente si faltan en los datos', () => {
      render(
        <SpeciesDetailModal
          isOpen={true}
          onClose={vi.fn()}
          species={mockSpeciesChilca}
          ecologicalRegion={null}
        />
      );

      expect(screen.getByText('Ecorregión no informada')).toBeDefined();
      expect(screen.getByText('Fuente no informada')).toBeDefined();
    });
  });

  describe('SeasonalSection — Progressive Disclosure', () => {
    it('no renderiza nada cuando la lista de items está vacía', () => {
      const { container } = render(
        <SeasonalSection
          eventType="FRUITING"
          items={[]}
          currentMonth={9}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('limita items iniciales a initialLimit y permite expandir con Ver todas', () => {
      const multipleItems: SeasonalFloraItem[] = Array.from({ length: 6 }, (_, i) => ({
        species: {
          ...mockSpeciesAlgarrobo,
          id: `sp-${i + 1}`,
          scientific_name: `Species ${i + 1}`,
          common_names: [`Especie ${i + 1}`],
        },
        phenology: [mockSpeciesAlgarrobo.phenology_records![0]],
        ecological_region: mockEcologicalRegion,
      }));

      render(
        <SeasonalSection
          eventType="SPROUTING"
          items={multipleItems}
          currentMonth={9}
          initialLimit={4}
        />
      );

      expect(screen.getByText('Brotan este mes')).toBeDefined();
      expect(screen.getByText('6 especies')).toBeDefined();

      // Muestra 4 inicialmente
      expect(screen.getByText('Especie 1')).toBeDefined();
      expect(screen.getByText('Especie 4')).toBeDefined();
      expect(screen.queryByText('Especie 5')).toBeNull();

      // Botón "Ver todas las 6 especies"
      const toggleBtn = screen.getByRole('button', { name: /ver todas las 6 especies/i });
      fireEvent.click(toggleBtn);

      expect(screen.getByText('Especie 5')).toBeDefined();
      expect(screen.getByText('Especie 6')).toBeDefined();
      expect(screen.getByText('Mostrar menos')).toBeDefined();

      // Colapsar
      const collapseBtn = screen.getByRole('button', { name: /mostrar menos/i });
      fireEvent.click(collapseBtn);
      expect(screen.queryByText('Especie 5')).toBeNull();
    });
  });

  describe('NativeFloraSection — Desglose por Hábito y Filtros', () => {
    it('muestra el resumen por hábito y filtra especies por pestaña', () => {
      const speciesList: RegionalPlantSpeciesEntity[] = [
        { ...mockSpeciesAlgarrobo, id: 'sp-1', growth_habit: 'TREE' },
        { ...mockSpeciesAlgarrobo, id: 'sp-2', growth_habit: 'TREE' },
        { ...mockSpeciesChilca, id: 'sp-3', growth_habit: 'SHRUB' },
      ];

      render(
        <NativeFloraSection
          nativeSpecies={speciesList}
          currentMonth={9}
          ecologicalRegion={mockEcologicalRegion}
        />
      );

      expect(screen.getByText('Nativas de tu región')).toBeDefined();
      expect(screen.getByText('3 registradas')).toBeDefined();

      // Desglose por hábito
      expect(screen.getByText('Árboles:')).toBeDefined();
      expect(screen.getByText('Arbustos:')).toBeDefined();

      // Filtrar por Arbustos
      const shrubTab = screen.getByRole('tab', { name: /arbustos \(1\)/i });
      fireEvent.click(shrubTab);

      expect(screen.getByText('Chilca dulce')).toBeDefined();
      expect(screen.queryByText('Algarrobo blanco / Iboká')).toBeNull();
    });
  });

  describe('RegionalFloraView — Integración Completa', () => {
    it('renderiza resumen, secciones estacionales y abre modal al seleccionar especie', () => {
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

      // Header y Resumen
      expect(screen.getByText('Septiembre en tu región')).toBeDefined();
      expect(screen.getByTestId('seasonal-summary-bar')).toBeDefined();

      // 1. Sprouting presente
      expect(screen.getByText('Brotan este mes')).toBeDefined();

      // 2, 3, 4, 5 Vacíos: No se deben renderizar
      expect(screen.queryByText('Florecen este mes')).toBeNull();
      expect(screen.queryByText('Fructifican este mes')).toBeNull();
      expect(screen.queryByText('Buen momento para sembrar')).toBeNull();
      expect(screen.queryByText('Buen momento para plantar')).toBeNull();

      // 6. Nativas presente
      expect(screen.getByText('Nativas de tu región')).toBeDefined();

      // Abrir modal de detalle
      const card = screen.getAllByRole('button', { name: /especie regional: algarrobo blanco/i })[0];
      fireEvent.click(card);

      // Modal abierto
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Observaciones botánicas')).toBeDefined();

      // Cerrar modal
      const closeBtn = screen.getByRole('button', { name: /cerrar detalle de especie/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
