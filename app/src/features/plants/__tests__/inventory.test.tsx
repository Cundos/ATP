// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlantCard, PlantCatalogView } from '../components';
import { PlantEntity, LocationEntity } from '@/core/domain/entities';

// Mock useRouter, useSearchParams, usePathname de Next.js
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => '/inventory',
  useSearchParams: () => mockSearchParams,
}));

// Dataset de prueba representativo
const mockPlants: PlantEntity[] = [
  {
    id: '01931a00-0001-7000-8000-000000000001',
    permanent_code: 'AT-PL-001',
    common_name: 'Monstera Deliciosa',
    scientific_name: 'Monstera deliciosa',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-01T10:00:00Z'),
    updated_at: new Date('2026-01-01T10:00:00Z'),
  },
  {
    id: '01931a00-0002-7000-8000-000000000002',
    permanent_code: 'AT-PL-002',
    common_name: 'Ficus Lyrata',
    scientific_name: 'Ficus lyrata',
    cultivar: 'Bambino',
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: null,
    location_id: 'loc-1',
    location: {
      id: 'loc-1',
      name: 'Living',
      lifecycle_status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
    reference_id: null,
    created_at: new Date('2026-01-02T10:00:00Z'),
    updated_at: new Date('2026-01-02T10:00:00Z'),
  },
  {
    id: '01931a00-0003-7000-8000-000000000003',
    permanent_code: 'AT-PL-003',
    common_name: 'Calathea Orbifolia',
    scientific_name: 'Goeppertia orbifolia',
    cultivar: null,
    health_status: 'ATTENTION',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-03T10:00:00Z'),
    updated_at: new Date('2026-01-03T10:00:00Z'),
  },
  {
    id: '01931a00-0004-7000-8000-000000000004',
    permanent_code: 'AT-PL-004',
    common_name: 'Pothos Dorado',
    scientific_name: 'Epipremnum aureum',
    cultivar: 'Golden',
    health_status: 'RECOVERY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-04T10:00:00Z'),
    updated_at: new Date('2026-01-04T10:00:00Z'),
  },
];

const mockLocations: LocationEntity[] = [
  {
    id: 'loc-1',
    name: 'Living',
    lifecycle_status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'loc-2',
    name: 'Balcón',
    lifecycle_status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

describe('ATP-IMP-011: Inventory & PlantCard Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  describe('PlantCard Component', () => {
    it('muestra permanent_code, common_name, scientific_name y HealthBadge', () => {
      render(<PlantCard plant={mockPlants[0]} />);

      expect(screen.getByText('AT-PL-001')).toBeDefined();
      expect(screen.getByText('Monstera Deliciosa')).toBeDefined();
      expect(screen.getByText('Monstera deliciosa')).toBeDefined();
      expect(screen.getByText('Saludable')).toBeDefined();
    });

    it('muestra "Sin ubicación" cuando location_id es null', () => {
      render(<PlantCard plant={mockPlants[0]} />);
      expect(screen.getByText('Sin ubicación')).toBeDefined();
    });

    it('muestra el nombre de la ubicación cuando existe', () => {
      render(<PlantCard plant={mockPlants[1]} />);
      expect(screen.getByText('Living')).toBeDefined();
    });

    it('muestra el cultivar cuando está presente', () => {
      render(<PlantCard plant={mockPlants[1]} />);
      expect(screen.getByText('Bambino')).toBeDefined();
    });

    it('el link de la tarjeta apunta a la ruta /plants/{permanent_code}', () => {
      render(<PlantCard plant={mockPlants[0]} />);
      const link = screen.getByRole('link', { name: /ver ficha de monstera deliciosa/i });
      expect(link.getAttribute('href')).toBe('/plants/AT-PL-001');
    });
  });

  describe('PlantCatalogView Component', () => {
    it('renderiza la lista de plantas ordenada por defecto por permanent_code ASC', () => {
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(4);
      expect(cards[0].textContent).toContain('AT-PL-001');
      expect(cards[1].textContent).toContain('AT-PL-002');
      expect(cards[2].textContent).toContain('AT-PL-003');
      expect(cards[3].textContent).toContain('AT-PL-004');
    });

    it('permite filtrar por búsqueda de texto (nombre común)', () => {
      mockSearchParams = new URLSearchParams('q=Monstera');
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(1);
      expect(cards[0].textContent).toContain('Monstera Deliciosa');
    });

    it('permite filtrar por búsqueda de texto (código permanente case-insensitive)', () => {
      mockSearchParams = new URLSearchParams('q=at-pl-003');
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(1);
      expect(cards[0].textContent).toContain('Calathea Orbifolia');
    });

    it('permite filtrar por estado de salud HEALTHY', () => {
      mockSearchParams = new URLSearchParams('health=HEALTHY');
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(2);
      expect(cards[0].textContent).toContain('AT-PL-001');
      expect(cards[1].textContent).toContain('AT-PL-002');
    });

    it('permite filtrar por estado de salud ATTENTION', () => {
      mockSearchParams = new URLSearchParams('health=ATTENTION');
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(1);
      expect(cards[0].textContent).toContain('Calathea Orbifolia');
    });

    it('permite filtrar por estado de salud RECOVERY', () => {
      mockSearchParams = new URLSearchParams('health=RECOVERY');
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(1);
      expect(cards[0].textContent).toContain('Pothos Dorado');
    });

    it('muestra EmptyState cuando el filtro UNKNOWN no tiene resultados', () => {
      mockSearchParams = new URLSearchParams('health=UNKNOWN');
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      expect(screen.queryByRole('article')).toBeNull();
      expect(screen.getByText('Sin resultados para la búsqueda o filtros')).toBeDefined();
    });

    it('permite filtrar por "Sin ubicación" (NONE)', () => {
      mockSearchParams = new URLSearchParams('location=NONE');
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(3); // AT-PL-001, 003, 004
    });

    it('permite ordenar por nombre común A-Z', () => {
      mockSearchParams = new URLSearchParams('sort=name_asc');
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(4);
      // Calathea Orbifolia -> Ficus Lyrata -> Monstera Deliciosa -> Pothos Dorado
      expect(cards[0].textContent).toContain('Calathea Orbifolia');
      expect(cards[1].textContent).toContain('Ficus Lyrata');
      expect(cards[2].textContent).toContain('Monstera Deliciosa');
      expect(cards[3].textContent).toContain('Pothos Dorado');
    });

    it('actualiza los query params al tipear en el input de búsqueda', () => {
      render(<PlantCatalogView initialPlants={mockPlants} locations={mockLocations} />);

      const input = screen.getByPlaceholderText(/buscar por nombre o código/i);
      fireEvent.change(input, { target: { value: 'Ficus' } });

      expect(mockReplace).toHaveBeenCalledWith('/inventory?q=Ficus', { scroll: false });
    });
  });
});
