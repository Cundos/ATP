// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlantFormInputSchema } from '../schemas/plant-form.schema';
import { PlantForm } from '../components/PlantForm';
import { PlantEntity, LocationEntity } from '@/core/domain/entities';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Server Actions
vi.mock('../actions', () => ({
  createPlantAction: vi.fn(),
  updatePlantAction: vi.fn(),
}));

describe('PlantFormInputSchema (Zod Validation)', () => {
  it('debe validar exitosamente cuando common_name es provisto y aplicar defaults', () => {
    const rawInput = {
      common_name: 'Gomero',
    };

    const result = PlantFormInputSchema.safeParse(rawInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.common_name).toBe('Gomero');
      expect(result.data.health_status).toBe('UNKNOWN');
      expect(result.data.acquisition_date).toBeNull();
      expect(result.data.location_id).toBeNull();
      expect(result.data.scientific_name).toBeNull();
      expect(result.data.cultivar).toBeNull();
      expect(result.data.notes).toBeNull();
      expect(result.data.pot_info).toBeNull();
      expect(result.data.substrate_info).toBeNull();
      expect(result.data.light_conditions).toBeNull();
      expect(result.data.watering_notes).toBeNull();
    }
  });

  it('debe rechazar common_name vacío o compuesto solo por espacios', () => {
    const emptyResult = PlantFormInputSchema.safeParse({ common_name: '' });
    expect(emptyResult.success).toBe(false);

    const spacesResult = PlantFormInputSchema.safeParse({ common_name: '   ' });
    expect(spacesResult.success).toBe(false);
  });

  it('debe parsear acquisition_date válida en formato YYYY-MM-DD y convertir a Date', () => {
    const result = PlantFormInputSchema.safeParse({
      common_name: 'Croton',
      acquisition_date: '2026-09-05',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.acquisition_date).toBeInstanceOf(Date);
      expect(result.data.acquisition_date?.toISOString()).toContain('2026-09-05');
    }
  });

  it('debe transformar acquisition_date vacía a null sin fallar', () => {
    const result = PlantFormInputSchema.safeParse({
      common_name: 'Monstera',
      acquisition_date: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.acquisition_date).toBeNull();
    }
  });

  it('debe rechazar una fecha con formato inválido', () => {
    const result = PlantFormInputSchema.safeParse({
      common_name: 'Monstera',
      acquisition_date: 'fecha-invalida',
    });

    expect(result.success).toBe(false);
  });

  it('debe transformar location_id vacía o "none" a null', () => {
    const resultEmpty = PlantFormInputSchema.safeParse({
      common_name: 'Pothos',
      location_id: '',
    });
    expect(resultEmpty.success).toBe(true);
    if (resultEmpty.success) {
      expect(resultEmpty.data.location_id).toBeNull();
    }

    const resultNone = PlantFormInputSchema.safeParse({
      common_name: 'Pothos',
      location_id: 'none',
    });
    expect(resultNone.success).toBe(true);
    if (resultNone.success) {
      expect(resultNone.data.location_id).toBeNull();
    }
  });

  it('debe preservar campos del perfil de cultivo cuando son proporcionados', () => {
    const result = PlantFormInputSchema.safeParse({
      common_name: 'Calathea',
      pot_info: 'Terracota N° 16',
      substrate_info: 'Sustrato aireado',
      light_conditions: 'Sombra brillante',
      watering_notes: 'Riego con agua reposada',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pot_info).toBe('Terracota N° 16');
      expect(result.data.substrate_info).toBe('Sustrato aireado');
      expect(result.data.light_conditions).toBe('Sombra brillante');
      expect(result.data.watering_notes).toBe('Riego con agua reposada');
    }
  });
});

describe('PlantForm Component (SCR-004 Alta y SCR-005 Edición)', () => {
  const mockActiveLocations: LocationEntity[] = [
    {
      id: 'loc-1',
      name: 'Balcón',
      lifecycle_status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'loc-2',
      name: 'Living',
      lifecycle_status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  const mockExistingPlant: PlantEntity = {
    id: 'plant-123',
    permanent_code: 'AT-PL-001',
    common_name: 'Gomero',
    scientific_name: 'Ficus elastica',
    cultivar: 'Robusta',
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: new Date('2026-05-10T12:00:00Z'),
    location_id: 'loc-2',
    notes: 'Planta madre en excelente estado.',
    reference_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    profile: {
      id: 'prof-1',
      plant_id: 'plant-123',
      pot_info: 'Maceta N° 24',
      substrate_info: 'Tierra fértil con compost',
      light_conditions: 'Luz indirecta moderada',
      watering_notes: 'Semanal en verano',
      created_at: new Date(),
      updated_at: new Date(),
    },
    location: {
      id: 'loc-2',
      name: 'Living',
      lifecycle_status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el formulario de alta en modo create con valores por defecto', () => {
    render(<PlantForm mode="create" activeLocations={mockActiveLocations} />);

    // Verifica presencia de inputs
    const commonNameInput = screen.getByLabelText(/nombre común/i) as HTMLInputElement;
    expect(commonNameInput.value).toBe('');

    const scientificInput = screen.getByLabelText(/nombre científico/i) as HTMLInputElement;
    expect(scientificInput.value).toBe('');

    const cultivarInput = screen.getByLabelText(/cultivar/i) as HTMLInputElement;
    expect(cultivarInput.value).toBe('');

    const healthSelect = screen.getByLabelText(/estado sanitario/i) as HTMLSelectElement;
    expect(healthSelect.value).toBe('UNKNOWN');

    const locationSelect = screen.getByLabelText(/ubicación física/i) as HTMLSelectElement;
    expect(locationSelect.value).toBe('');

    const dateInput = screen.getByLabelText(/fecha de adquisición/i) as HTMLInputElement;
    expect(dateInput.value).toBe('');

    // Botón de submit
    expect(screen.getByRole('button', { name: /registrar planta/i })).toBeDefined();

    // No debe mostrar tarjeta de código permanente inmutable en alta
    expect(screen.queryByText(/código de ejemplar/i)).toBeNull();
  });

  it('debe listar las ubicaciones activas disponibles en el selector', () => {
    render(<PlantForm mode="create" activeLocations={mockActiveLocations} />);

    const locationSelect = screen.getByLabelText(/ubicación física/i);
    expect(locationSelect).toBeDefined();

    expect(screen.getByRole('option', { name: /sin ubicación/i })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Balcón' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Living' })).toBeDefined();
  });

  it('debe renderizar el formulario de edición precargando los datos del ejemplar', () => {
    render(
      <PlantForm
        mode="edit"
        initialData={mockExistingPlant}
        activeLocations={mockActiveLocations}
      />
    );

    // Muestra el código permanente bloqueado e inmutable
    expect(screen.getByText('AT-PL-001')).toBeDefined();
    expect(screen.getByText(/inmutable/i)).toBeDefined();

    // Valores precargados
    const commonNameInput = screen.getByLabelText(/nombre común/i) as HTMLInputElement;
    expect(commonNameInput.value).toBe('Gomero');

    const scientificInput = screen.getByLabelText(/nombre científico/i) as HTMLInputElement;
    expect(scientificInput.value).toBe('Ficus elastica');

    const cultivarInput = screen.getByLabelText(/cultivar/i) as HTMLInputElement;
    expect(cultivarInput.value).toBe('Robusta');

    const healthSelect = screen.getByLabelText(/estado sanitario/i) as HTMLSelectElement;
    expect(healthSelect.value).toBe('HEALTHY');

    const locationSelect = screen.getByLabelText(/ubicación física/i) as HTMLSelectElement;
    expect(locationSelect.value).toBe('loc-2');

    const dateInput = screen.getByLabelText(/fecha de adquisición/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2026-05-10');

    // Perfil de cultivo precargado
    const potInput = screen.getByLabelText(/maceta/i) as HTMLInputElement;
    expect(potInput.value).toBe('Maceta N° 24');

    const substrateInput = screen.getByLabelText(/sustrato/i) as HTMLInputElement;
    expect(substrateInput.value).toBe('Tierra fértil con compost');

    const lightInput = screen.getByLabelText(/condiciones de luz/i) as HTMLInputElement;
    expect(lightInput.value).toBe('Luz indirecta moderada');

    const wateringInput = screen.getByLabelText(/notas de riego/i) as HTMLTextAreaElement;
    expect(wateringInput.value).toBe('Semanal en verano');

    // Notas generales precargadas
    const notesInput = screen.getByLabelText(/notas generales/i) as HTMLTextAreaElement;
    expect(notesInput.value).toBe('Planta madre en excelente estado.');

    // Botón de submit en edición
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDefined();
  });

  it('debe mostrar error de validación cliente si se intenta enviar con nombre común vacío', async () => {
    render(<PlantForm mode="create" activeLocations={mockActiveLocations} />);

    const submitBtn = screen.getByRole('button', { name: /registrar planta/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorMsg = screen.getByText(/el nombre común es obligatorio y no puede estar vacío/i);
      expect(errorMsg).toBeDefined();
    });
  });
});