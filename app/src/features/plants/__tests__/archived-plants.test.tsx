// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArchivedPlantsView } from '../components/ArchivedPlantsView';
import { PlantDetailView } from '../components/PlantDetailView';
import { PlantEntity } from '@/core/domain/entities';
import { archivePlantAction, restorePlantAction } from '../actions';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock Server Actions
vi.mock('../actions', () => ({
  archivePlantAction: vi.fn(),
  restorePlantAction: vi.fn(),
}));

describe('SCR-006: Plantas Archivadas & Lifecycle UI', () => {
  const mockArchivedPlants: PlantEntity[] = [
    {
      id: 'arch-1',
      permanent_code: 'AT-PL-002',
      common_name: 'Pothos Dorado',
      scientific_name: 'Epipremnum aureum',
      cultivar: null,
      health_status: 'HEALTHY',
      lifecycle_status: 'ARCHIVED',
      acquisition_date: new Date('2026-01-15T12:00:00Z'),
      location_id: 'loc-1',
      notes: 'Ejemplar dado de baja tras división.',
      reference_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      location: {
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mostrar EmptyState cuando no hay plantas archivadas', () => {
    render(<ArchivedPlantsView initialPlants={[]} />);

    expect(screen.getByText('No hay plantas archivadas')).toBeDefined();
    expect(
      screen.getByText(/no existen ejemplares dados de baja en la colección/i)
    ).toBeDefined();
    expect(screen.getByRole('link', { name: /volver al inventario/i })).toBeDefined();
  });

  it('debe listar los ejemplares archivados con código permanente, nombre y badge de salud', () => {
    render(<ArchivedPlantsView initialPlants={mockArchivedPlants} />);

    expect(screen.getByText('AT-PL-002')).toBeDefined();
    expect(screen.getByText('Pothos Dorado')).toBeDefined();
    expect(screen.getByText('Epipremnum aureum')).toBeDefined();
    expect(screen.getByText('Saludable')).toBeDefined();
    expect(screen.getByText('Balcón')).toBeDefined();
    expect(screen.getByRole('button', { name: /restaurar ejemplar at-pl-002/i })).toBeDefined();
  });

  it('debe abrir modal de confirmación al presionar Restaurar y ejecutar la acción de restauración', async () => {
    vi.mocked(restorePlantAction).mockResolvedValue({
      success: true,
      permanent_code: 'AT-PL-002',
      message: 'Ejemplar restaurado correctamente',
    });

    render(<ArchivedPlantsView initialPlants={mockArchivedPlants} />);

    const restoreBtn = screen.getByRole('button', { name: /restaurar ejemplar at-pl-002/i });
    fireEvent.click(restoreBtn);

    // Modal abierto
    expect(screen.getByText('¿Restaurar este ejemplar?')).toBeDefined();
    expect(
      screen.getByText(/el ejemplar at-pl-002 \(pothos dorado\) volverá a estar activo/i)
    ).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: /confirmar restauración/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(restorePlantAction).toHaveBeenCalledWith('arch-1');
    });
  });

  it('debe permitir archivar un ejemplar desde la Ficha Individual y redirigir a /plants/archived', async () => {
    const activePlant: PlantEntity = {
      id: 'plant-active-1',
      permanent_code: 'AT-PL-001',
      common_name: 'Gomero',
      scientific_name: 'Ficus elastica',
      cultivar: null,
      health_status: 'HEALTHY',
      lifecycle_status: 'ACTIVE',
      acquisition_date: null,
      location_id: null,
      notes: null,
      reference_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    vi.mocked(archivePlantAction).mockResolvedValue({
      success: true,
      permanent_code: 'AT-PL-001',
      message: 'Ejemplar archivado correctamente',
    });

    render(<PlantDetailView plant={activePlant} />);

    const archiveBtn = screen.getByRole('button', { name: /archivar ejemplar at-pl-001/i });
    fireEvent.click(archiveBtn);

    expect(screen.getByText('¿Archivar este ejemplar?')).toBeDefined();
    const confirmBtn = screen.getByRole('button', { name: /confirmar archivo/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(archivePlantAction).toHaveBeenCalledWith('plant-active-1');
      expect(mockPush).toHaveBeenCalledWith('/plants/archived');
    });
  });
});