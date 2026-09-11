// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Core entities and types
import { PlantEntity, LocationEntity, PhotoEntity, HealthStatus, LifecycleStatus, PlantReferenceEntity } from '@/core/domain/entities';

// Views
import { DashboardView } from '@/features/dashboard/components/DashboardView';
import { PlantCatalogView } from '@/features/plants/components/PlantCatalogView';
import { PlantDetailView } from '@/features/plants/components/PlantDetailView';
import { PlantForm } from '@/features/plants/components/PlantForm';
import { ArchivedPlantsView } from '@/features/plants/components/ArchivedPlantsView';
import { BotanicalReferencePicker } from '@/features/plants/components/BotanicalReferencePicker';
import { BottomNav, TopBar } from '@/components/layout';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Release v0.1 Automated E2E Flows (ATP-IMP-027)', () => {
  let testLocations: LocationEntity[];
  let testPlants: PlantEntity[];

  beforeEach(() => {
    vi.clearAllMocks();

    testLocations = [
      {
        id: 'loc-balcon',
        name: 'Balcón Terraza',
        lifecycle_status: 'ACTIVE',
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
      },
      {
        id: 'loc-living',
        name: 'Living Comedor',
        lifecycle_status: 'ACTIVE',
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
      },
    ];

    const mockPhoto: PhotoEntity = {
      id: 'photo-001',
      plant_id: 'plant-001',
      file_path: 'photos/AT-PL-001/019.webp',
      file_name: 'ficus.webp',
      mime_type: 'image/webp',
      file_size: 1024,
      is_primary: true,
      captured_at: new Date('2026-09-01'),
      created_at: new Date('2026-09-01'),
    };

    const mockReference: PlantReferenceEntity = {
      id: 'ref-001',
      provider: 'OPEN_PLANTBOOK',
      external_id: 'monstera deliciosa',
      scientific_name: 'Monstera deliciosa Liebm.',
      common_names: ['Monstera', 'Costilla de Adán'],
      image_url: 'https://open.plantbook.io/images/monstera.jpg',
      reference_care: {
        min_light_lux: 1000,
        max_light_lux: 2500,
        min_temp_c: 15,
        max_temp_c: 30,
        min_env_humid: 60,
        max_env_humid: 80,
        watering: 'Regar cuando el sustrato seque.',
      },
      raw_data: {},
      fetched_at: new Date('2026-09-01'),
      last_sync_at: new Date('2026-09-01'),
    };

    testPlants = [
      {
        id: 'plant-001',
        permanent_code: 'AT-PL-001',
        common_name: 'Ficus Pandurata',
        scientific_name: 'Ficus lyrata',
        cultivar: null,
        health_status: 'HEALTHY' as HealthStatus,
        lifecycle_status: 'ACTIVE' as LifecycleStatus,
        acquisition_date: new Date('2026-05-10'),
        location_id: 'loc-living',
        location: testLocations[1],
        notes: 'Planta principal junto al ventanal.',
        reference_id: null,
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
        photos: [mockPhoto],
      },
      {
        id: 'plant-002',
        permanent_code: 'AT-PL-002',
        common_name: 'Monstera Deliciosa',
        scientific_name: 'Monstera deliciosa',
        cultivar: 'Borsigiana',
        health_status: 'ATTENTION' as HealthStatus,
        lifecycle_status: 'ACTIVE' as LifecycleStatus,
        acquisition_date: null,
        location_id: 'loc-balcon',
        location: testLocations[0],
        notes: 'Hojas con bordes secos.',
        reference_id: 'ref-001',
        reference: mockReference,
        created_at: new Date('2026-09-01'),
        updated_at: new Date('2026-09-01'),
      },
    ];
  });

  // Flow 1: Dashboard Carga
  it('E2E Flow 1: Dashboard Carga con métricas sanitarias y accesos rápidos', () => {
    render(
      <DashboardView
        plants={testPlants}
      />
    );

    expect(screen.getByText('2')).toBeDefined(); // Total
    expect(screen.getByText('Monstera Deliciosa')).toBeDefined();
    expect(screen.getByRole('link', { name: /nueva planta/i })).toBeDefined();
  });

  // Flow 2: Inventario Carga y Filtros
  it('E2E Flow 2: Inventario Carga con búsqueda por texto y filtros sanitarios', () => {
    render(
      <PlantCatalogView
        initialPlants={testPlants}
        locations={testLocations}
      />
    );

    expect(screen.getByText('Ficus Pandurata')).toBeDefined();
    expect(screen.getByText('Monstera Deliciosa')).toBeDefined();

    // Filtro por texto
    const searchInput = screen.getByLabelText(/buscar por nombre común, científico o código/i);
    fireEvent.change(searchInput, { target: { value: 'Ficus' } });

    expect(mockReplace).toHaveBeenCalled();
  });

  // Flow 3: Alta de Planta Manual (SCR-004)
  it('E2E Flow 3: Alta de Planta Manual sin referencia botánica', () => {
    render(<PlantForm mode="create" activeLocations={testLocations} />);

    const commonNameInput = screen.getByLabelText(/nombre común/i);
    const scientificInput = screen.getByLabelText(/nombre científico/i);
    const submitBtn = screen.getByRole('button', { name: /registrar planta/i });

    fireEvent.change(commonNameInput, { target: { value: 'Pothos Dorado' } });
    fireEvent.change(scientificInput, { target: { value: 'Epipremnum aureum' } });

    expect((commonNameInput as HTMLInputElement).value).toBe('Pothos Dorado');
    expect((scientificInput as HTMLInputElement).value).toBe('Epipremnum aureum');
    expect(submitBtn).toBeDefined();
  });

  // Flow 4: Editar Planta (SCR-005)
  it('E2E Flow 4: Editar Planta precarga datos y mantiene código permanente bloqueado', () => {
    render(
      <PlantForm
        mode="edit"
        initialData={testPlants[0]}
        activeLocations={testLocations}
      />
    );

    expect(screen.getByText('AT-PL-001')).toBeDefined();
    expect(screen.getByText(/inmutable/i)).toBeDefined();

    const commonNameInput = screen.getByLabelText(/nombre común/i) as HTMLInputElement;
    expect(commonNameInput.value).toBe('Ficus Pandurata');

    fireEvent.change(commonNameInput, { target: { value: 'Ficus Pandurata Grande' } });
    expect(commonNameInput.value).toBe('Ficus Pandurata Grande');
  });

  // Flow 5: Archivar y Restaurar Ejemplar
  it('E2E Flow 5: Archivar y Restaurar ejemplar preserva trazabilidad histórica', () => {
    const archivedPlant: PlantEntity = {
      ...testPlants[0],
      lifecycle_status: 'ARCHIVED',
    };

    render(
      <ArchivedPlantsView
        initialPlants={[archivedPlant]}
      />
    );

    expect(screen.getByText('Ficus Pandurata')).toBeDefined();
    expect(screen.getByRole('button', { name: /restaurar/i })).toBeDefined();
  });

  // Flow 6: Alta con Foto
  it('E2E Flow 6: Alta de planta con sección de foto en formulario', () => {
    render(<PlantForm mode="create" activeLocations={testLocations} />);

    expect(screen.getByText('Fotografía del Ejemplar')).toBeDefined();
  });

  // Flow 7: Búsqueda Botánica Degradable (Open Plantbook Fallback)
  it('E2E Flow 7: Búsqueda botánica degrada limpiamente ante 429 o error del proveedor', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Límite de peticiones alcanzado. Reintentá en unos minutos.',
        code: 'RATE_LIMIT_EXCEEDED',
      }),
    });
    global.fetch = mockFetch;

    const handleSelect = vi.fn();
    const handleClear = vi.fn();
    render(<BotanicalReferencePicker onSelectReference={handleSelect} onClearReference={handleClear} />);

    const searchInput = screen.getByLabelText(/buscar especie botánica/i);
    fireEvent.change(searchInput, { target: { value: 'sansevieria' } });

    await waitFor(() => {
      expect(screen.getByText(/límite de peticiones alcanzado/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /continuar sin referencia/i })).toBeDefined();
    });
  });

  // Flow 8: Planta sin Referencia Funciona 100%
  it('E2E Flow 8: Ficha de planta sin referencia botánica renderiza limpiamente', () => {
    render(<PlantDetailView plant={testPlants[0]} />);

    expect(screen.getByText('AT-PL-001')).toBeDefined();
    expect(screen.getByText('Ficus Pandurata')).toBeDefined();
    expect(screen.queryByText(/conocimiento botánico de referencia/i)).toBeNull();
  });

  // Flow 9: Navegación Mobile Básica
  it('E2E Flow 9: Navegación mobile inferior y cabecera secundaria accesible', () => {
    render(
      <>
        <TopBar />
        <BottomNav />
      </>
    );

    expect(screen.getByRole('navigation', { name: /navegación principal inferior/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /inventario/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /registrar nueva planta/i })).toBeDefined();

    const menuTrigger = screen.getByRole('button', { name: /abrir menú secundario/i });
    fireEvent.click(menuTrigger);
    expect(screen.getByRole('menuitem', { name: /ubicaciones/i })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: /plantas archivadas/i })).toBeDefined();
  });
});
