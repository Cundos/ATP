// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlantDetailView } from '../components/PlantDetailView';
import { PlantEntity } from '@/core/domain/entities';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('PlantDetailView Local-First & Offline Verification (ATP-IMP-025)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockPlantWithReference: PlantEntity = {
    id: 'plant-uuid-123',
    permanent_code: 'AT-PL-001',
    common_name: 'Gomero Austral',
    scientific_name: 'Ficus elastica',
    cultivar: 'Robusta',
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: new Date('2026-05-10T12:00:00Z'),
    location_id: 'loc-1',
    notes: 'Ejemplar en crecimiento activo.',
    reference_id: 'ref-ficus-uuid',
    created_at: new Date('2026-05-10T12:00:00Z'),
    updated_at: new Date('2026-09-10T12:00:00Z'),
    location: {
      id: 'loc-1',
      name: 'Living',
      lifecycle_status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
    reference: {
      id: 'ref-ficus-uuid',
      provider: 'OPEN_PLANTBOOK',
      external_id: 'ficus elastica',
      scientific_name: 'Ficus elastica',
      common_names: ['Gomero', 'Árbol del caucho'],
      image_url: 'https://open.plantbook.io/images/ficus.jpg',
      fetched_at: new Date('2026-09-01T10:00:00Z'),
      last_sync_at: new Date('2026-09-01T10:00:00Z'),
      reference_care: {
        min_temp: 15,
        max_temp: 29,
        min_light_lux: 1000,
        max_light_lux: 2500,
        watering: 'Regar moderadamente dejando secar el tercio superior.',
        sunlight: 'Luz indirecta abundante.',
      },
      raw_data: {},
    },
  };

  it('renders botanical reference knowledge using local PostgreSQL snapshot with 0 external network calls (Offline)', () => {
    render(<PlantDetailView plant={mockPlantWithReference} />);

    // Physical plant details
    expect(screen.getByText('AT-PL-001')).toBeInTheDocument();
    expect(screen.getByText('Gomero Austral')).toBeInTheDocument();

    // Botanical Reference section
    expect(
      screen.getByRole('heading', { name: /Conocimiento Botánico de Referencia/i })
    ).toBeInTheDocument();
    expect(screen.getByText('15–29 °C')).toBeInTheDocument();
    expect(screen.getByText('1.000–2.500 lux')).toBeInTheDocument();
    expect(
      screen.getByText('Regar moderadamente dejando secar el tercio superior.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Fuente: Open Plantbook · consultado el 01\/09\/2026/i)
    ).toBeInTheDocument();

    // Strict local-first verification: ZERO external fetch calls triggered during rendering!
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('renders cleanly without Botanical Reference section when plant.reference is null (no empty card)', () => {
    const mockPlantNoRef: PlantEntity = {
      ...mockPlantWithReference,
      reference_id: null,
      reference: null,
    };

    render(<PlantDetailView plant={mockPlantNoRef} />);

    expect(screen.getByText('AT-PL-001')).toBeInTheDocument();
    expect(screen.getByText('Gomero Austral')).toBeInTheDocument();

    // Botanical reference section is NOT rendered
    expect(
      screen.queryByRole('heading', { name: /Conocimiento Botánico de Referencia/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Fuente: Open Plantbook/i)
    ).not.toBeInTheDocument();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
