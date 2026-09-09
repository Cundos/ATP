// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardView, DashboardMetricCard } from '../components';
import { PlantEntity } from '@/core/domain/entities';

// Dataset mock representativo (13 plantas: 10 HEALTHY, 2 ATTENTION, 1 RECOVERY, 0 UNKNOWN)
const mockPlantsDataset: PlantEntity[] = [
  // 10 HEALTHY
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `id-healthy-${i + 1}`,
    permanent_code: `AT-PL-${String(i + 1).padStart(3, '0')}`,
    common_name: `Planta Saludable ${i + 1}`,
    scientific_name: null,
    cultivar: null,
    health_status: 'HEALTHY' as const,
    lifecycle_status: 'ACTIVE' as const,
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-01T10:00:00Z'),
    updated_at: new Date('2026-01-01T10:00:00Z'),
  })),
  // 2 ATTENTION
  {
    id: 'id-att-1',
    permanent_code: 'AT-PL-011',
    common_name: 'Planta Atención 1',
    scientific_name: null,
    cultivar: null,
    health_status: 'ATTENTION' as const,
    lifecycle_status: 'ACTIVE' as const,
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-02T10:00:00Z'),
    updated_at: new Date('2026-01-02T10:00:00Z'),
  },
  {
    id: 'id-att-2',
    permanent_code: 'AT-PL-012',
    common_name: 'Planta Atención 2',
    scientific_name: null,
    cultivar: null,
    health_status: 'ATTENTION' as const,
    lifecycle_status: 'ACTIVE' as const,
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-02T10:00:00Z'),
    updated_at: new Date('2026-01-02T10:00:00Z'),
  },
  // 1 RECOVERY
  {
    id: 'id-rec-1',
    permanent_code: 'AT-PL-013',
    common_name: 'Planta Recuperación 1',
    scientific_name: null,
    cultivar: null,
    health_status: 'RECOVERY' as const,
    lifecycle_status: 'ACTIVE' as const,
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date('2026-01-03T10:00:00Z'),
    updated_at: new Date('2026-01-03T10:00:00Z'),
  },
];

describe('ATP-IMP-012: Dashboard Summary (SCR-001) Tests', () => {
  describe('DashboardMetricCard Component', () => {
    it('renderiza label, valor numérico y unidad de ejemplares', () => {
      render(
        <DashboardMetricCard
          label="Saludables"
          value={10}
          href="/inventory?health=HEALTHY"
          healthStatus="HEALTHY"
        />
      );

      expect(screen.getByText('Saludables')).toBeDefined();
      expect(screen.getByText('10')).toBeDefined();
      expect(screen.getByText('ejemplares')).toBeDefined();
      const link = screen.getByRole('link', { name: /saludables: 10 plantas/i });
      expect(link.getAttribute('href')).toBe('/inventory?health=HEALTHY');
    });

    it('utiliza singular "ejemplar" cuando el valor es 1', () => {
      render(
        <DashboardMetricCard
          label="Recuperación"
          value={1}
          href="/inventory?health=RECOVERY"
          healthStatus="RECOVERY"
        />
      );

      expect(screen.getByText('1')).toBeDefined();
      expect(screen.getByText('ejemplar')).toBeDefined();
    });
  });

  describe('DashboardView Component', () => {
    it('muestra métricas correctas derivadas del dataset real (Total: 13, HEALTHY: 10, ATTENTION: 2, RECOVERY: 1, UNKNOWN: 0)', () => {
      render(<DashboardView plants={mockPlantsDataset} />);

      // Total
      expect(screen.getByText('Total Colección Activa')).toBeDefined();
      expect(screen.getByText('13')).toBeDefined();

      // Saludables
      expect(screen.getByText('Saludables')).toBeDefined();
      expect(screen.getByText('10')).toBeDefined();

      // Atención
      expect(screen.getByText('Atención')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined();

      // Recuperación
      expect(screen.getByText('Recuperación')).toBeDefined();
      expect(screen.getByText('1')).toBeDefined();

      // Sin evaluar
      expect(screen.getByText('Sin evaluar')).toBeDefined();
      expect(screen.getByText('0')).toBeDefined();
    });

    it('el enlace de Total apunta a /inventory', () => {
      render(<DashboardView plants={mockPlantsDataset} />);
      const link = screen.getByRole('link', { name: /total colección activa: 13 plantas/i });
      expect(link.getAttribute('href')).toBe('/inventory');
    });

    it('el enlace de Saludables apunta a /inventory?health=HEALTHY', () => {
      render(<DashboardView plants={mockPlantsDataset} />);
      const link = screen.getByRole('link', { name: /saludables: 10 plantas/i });
      expect(link.getAttribute('href')).toBe('/inventory?health=HEALTHY');
    });

    it('el enlace de Atención apunta a /inventory?health=ATTENTION', () => {
      render(<DashboardView plants={mockPlantsDataset} />);
      const link = screen.getByRole('link', { name: /atención: 2 plantas/i });
      expect(link.getAttribute('href')).toBe('/inventory?health=ATTENTION');
    });

    it('el enlace de Recuperación apunta a /inventory?health=RECOVERY', () => {
      render(<DashboardView plants={mockPlantsDataset} />);
      const link = screen.getByRole('link', { name: /recuperación: 1 plantas/i });
      expect(link.getAttribute('href')).toBe('/inventory?health=RECOVERY');
    });

    it('el enlace de Sin evaluar apunta a /inventory?health=UNKNOWN', () => {
      render(<DashboardView plants={mockPlantsDataset} />);
      const link = screen.getByRole('link', { name: /sin evaluar: 0 plantas/i });
      expect(link.getAttribute('href')).toBe('/inventory?health=UNKNOWN');
    });

    it('la acción principal CTA apunta a /plants/new', () => {
      render(<DashboardView plants={mockPlantsDataset} />);
      const newPlantButton = screen.getByRole('button', { name: /nueva planta/i });
      const link = newPlantButton.closest('a');
      expect(link?.getAttribute('href')).toBe('/plants/new');
    });

    it('los enlaces de accesos rápidos apuntan a /inventory, /locations y /plants/archived', () => {
      render(<DashboardView plants={mockPlantsDataset} />);

      const inventoryLink = screen.getByRole('link', { name: /inventario completo/i });
      expect(inventoryLink.getAttribute('href')).toBe('/inventory');

      const locationsLink = screen.getByRole('link', { name: /ubicaciones/i });
      expect(locationsLink.getAttribute('href')).toBe('/locations');

      const archivedLink = screen.getByRole('link', { name: /plantas archivadas/i });
      expect(archivedLink.getAttribute('href')).toBe('/plants/archived');
    });


    it('el mensaje contextual refleja adecuadamente los ejemplares que requieren seguimiento', () => {
      render(<DashboardView plants={mockPlantsDataset} />);

      // 2 ATTENTION + 1 RECOVERY = 3 que requieren seguimiento
      expect(screen.getByText('3 ejemplares requieren seguimiento')).toBeDefined();
      expect(screen.getByText('2 en atención y 1 en recuperación.')).toBeDefined();
    });

    it('el mensaje contextual indica "Colección sin alertas activas" cuando no hay ATTENTION ni RECOVERY', () => {
      const allHealthyPlants: PlantEntity[] = mockPlantsDataset.slice(0, 5); // solo healthy
      render(<DashboardView plants={allHealthyPlants} />);

      expect(screen.getByText('Colección sin alertas activas')).toBeDefined();
      expect(
        screen.getByText('Todos tus ejemplares evaluados se encuentran en estado saludable.')
      ).toBeDefined();
    });

    it('renderiza EmptyState cuando la colección activa está vacía (0 plantas)', () => {
      render(<DashboardView plants={[]} />);

      expect(screen.getByText('Tu colección está vacía')).toBeDefined();
      expect(
        screen.getByText('Aún no tienes plantas activas registradas en tu inventario botánico.')
      ).toBeDefined();
      expect(screen.getByRole('button', { name: /registrar primera planta/i })).toBeDefined();
    });
  });
});
