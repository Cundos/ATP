// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlantDetailView } from '../components';
import { PlantEntity } from '@/core/domain/entities';

const mockPlantFull: PlantEntity = {
  id: '01931a00-0001-7000-8000-000000000001',
  permanent_code: 'AT-PL-001',
  common_name: 'Monstera Deliciosa',
  scientific_name: 'Monstera deliciosa',
  cultivar: 'Variegata',
  health_status: 'HEALTHY',
  lifecycle_status: 'ACTIVE',
  acquisition_date: new Date('2026-09-05T00:00:00Z'),
  notes: 'Ubicada junto a la ventana este con luz filtrada.',
  location_id: 'loc-1',
  location: {
    id: 'loc-1',
    name: 'Living',
    lifecycle_status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  },
  reference_id: null,
  profile: {
    id: 'prof-1',
    plant_id: '01931a00-0001-7000-8000-000000000001',
    pot_info: 'Maceta de barro 20cm con drenaje',
    substrate_info: 'Sustrato aireado con perlita y corteza de pino',
    light_conditions: 'Luz indirecta brillante',
    watering_notes: 'Regar cuando los primeros 3cm estén secos',
    created_at: new Date(),
    updated_at: new Date(),
  },
  created_at: new Date('2026-01-01T10:00:00Z'),
  updated_at: new Date('2026-01-01T10:00:00Z'),
};

const mockPlantBootstrapNulls: PlantEntity = {
  id: '01931a00-0002-7000-8000-000000000002',
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
  profile: null,
  created_at: new Date('2026-01-01T10:00:00Z'),
  updated_at: new Date('2026-01-01T10:00:00Z'),
};

describe('ATP-IMP-013: PlantDetailView (SCR-003) Tests', () => {
  it('renderiza permanent_code, common_name, scientific_name y HealthBadge', () => {
    render(<PlantDetailView plant={mockPlantFull} />);

    expect(screen.getByText('AT-PL-001')).toBeDefined();
    expect(screen.getByText('Monstera Deliciosa')).toBeDefined();
    expect(screen.getAllByText(/monstera deliciosa/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Saludable')).toBeDefined();
  });

  it('renderiza cultivar cuando existe', () => {
    render(<PlantDetailView plant={mockPlantFull} />);
    expect(screen.getAllByText(/variegata/i).length).toBeGreaterThan(0);
  });


  it('renderiza fecha de adquisición real formateada', () => {
    render(<PlantDetailView plant={mockPlantFull} />);
    // 05/09/2026
    expect(screen.getByText('05/09/2026')).toBeDefined();
  });

  it('renderiza "No declarada" cuando acquisition_date es null', () => {
    render(<PlantDetailView plant={mockPlantBootstrapNulls} />);
    expect(screen.getByText('No declarada')).toBeDefined();
  });

  it('renderiza ubicación real cuando existe', () => {
    render(<PlantDetailView plant={mockPlantFull} />);
    expect(screen.getByText('Living')).toBeDefined();
  });

  it('renderiza "Sin ubicación" cuando location_id es null', () => {
    render(<PlantDetailView plant={mockPlantBootstrapNulls} />);
    expect(screen.getByText('Sin ubicación')).toBeDefined();
  });

  it('renderiza datos del perfil de cultivo cuando existen', () => {
    render(<PlantDetailView plant={mockPlantFull} />);

    expect(screen.getByText('Maceta de barro 20cm con drenaje')).toBeDefined();
    expect(screen.getByText('Sustrato aireado con perlita y corteza de pino')).toBeDefined();
    expect(screen.getByText('Luz indirecta brillante')).toBeDefined();
    expect(screen.getByText('Regar cuando los primeros 3cm estén secos')).toBeDefined();
  });

  it('renderiza "Sin datos de cultivo" cuando no existe perfil', () => {
    render(<PlantDetailView plant={mockPlantBootstrapNulls} />);
    expect(screen.getByText('Sin datos de cultivo')).toBeDefined();
  });

  it('renderiza notas y observaciones cuando existen', () => {
    render(<PlantDetailView plant={mockPlantFull} />);
    expect(screen.getByText('Ubicada junto a la ventana este con luz filtrada.')).toBeDefined();
  });

  it('el enlace Editar apunta a /plants/{permanent_code}/edit', () => {
    render(<PlantDetailView plant={mockPlantFull} />);
    const editLink = screen.getByRole('link', { name: /editar/i });
    expect(editLink.getAttribute('href')).toBe('/plants/AT-PL-001/edit');
  });

  it('el enlace Volver al Inventario apunta a /inventory', () => {
    render(<PlantDetailView plant={mockPlantFull} />);
    const backLink = screen.getByRole('link', { name: /volver al inventario/i });
    expect(backLink.getAttribute('href')).toBe('/inventory');
  });

  it('el botón Archivar abre el modal accesible de confirmación', () => {
    render(<PlantDetailView plant={mockPlantFull} />);

    // Antes de abrir: modal no debe estar visible
    expect(screen.queryByRole('dialog')).toBeNull();

    // Abrir modal
    const archiveBtn = screen.getByRole('button', { name: /archivar ejemplar at-pl-001/i });
    fireEvent.click(archiveBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('¿Archivar este ejemplar?')).toBeDefined();
    expect(screen.getByRole('button', { name: /confirmar archivo/i })).toBeDefined();

    // Cerrar modal
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
