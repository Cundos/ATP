// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlantCareContextSection } from '../components/PlantCareContextSection';
import { PlantCareContextDTO } from '@/core/domain/entities';

describe('PlantCareContextSection (ATP-CARE-001)', () => {
  const mockCareContext: PlantCareContextDTO = {
    plant_id: '0191e4f2-90ab-7000-8000-000000000001',
    permanent_code: 'AT-PL-007',
    evaluated_at: '2026-09-13T12:00:00Z',
    data_quality: {
      has_telemetry: true,
      has_botanical_reference: true,
      has_recent_events: true,
      has_photos: true,
      warnings: ['Nivel de batería bajo (22%).'],
    },
    current_conditions: {
      soil_moisture: {
        value: 20,
        unit: '%',
        observed_at: '2026-09-13T12:00:00Z',
        min_reference: 30,
        max_reference: 60,
        classification: 'LOW',
      },
      battery: {
        value: 22,
        unit: '%',
        classification: 'LOW',
      },
      sensor_status: 'ONLINE',
    },
    recent_context: {
      last_operational_events: [],
      last_photo_at: '2026-09-10T12:00:00Z',
      recent_photo_caption: 'Brotes primaverales',
    },
    assessment: {
      status: 'ACTION_RECOMMENDED',
      headline: 'Humedad de suelo por debajo del rango óptimo',
      summary: 'La humedad actual (20%) es inferior al mínimo recomendado (30%).',
      recommendations: [
        {
          code: 'WATERING_RECOMMENDED',
          priority: 'HIGH',
          title: 'Evaluar riego del ejemplar',
          explanation: 'La humedad del sustrato descendió por debajo del umbral mínimo de referencia botánica.',
          evidence: ['Humedad actual: 20%', 'Mínimo de referencia: 30%'],
        },
      ],
    },
  };

  it('renders section title and status badge', () => {
    render(<PlantCareContextSection careContext={mockCareContext} />);

    expect(screen.getByText('Estado de Cuidado')).toBeDefined();
    expect(screen.getByTestId('care-status-badge')).toBeDefined();
    expect(screen.getByText('Acción Sugerida')).toBeDefined();
  });

  it('displays headline, summary, and warnings', () => {
    render(<PlantCareContextSection careContext={mockCareContext} />);

    expect(screen.getByTestId('care-headline').textContent).toBe(
      'Humedad de suelo por debajo del rango óptimo'
    );
    expect(screen.getByTestId('care-summary').textContent).toContain('20%');
    expect(screen.getByText('Nivel de batería bajo (22%).')).toBeDefined();
  });

  it('displays evaluated conditions grid (moisture, sensor, photo)', () => {
    render(<PlantCareContextSection careContext={mockCareContext} />);

    expect(screen.getByText('20%')).toBeDefined();
    expect(screen.getByText('Rango: 30% – 60%')).toBeDefined();
    expect(screen.getByText('En línea')).toBeDefined();
    expect(screen.getByText('Batería: 22%')).toBeDefined();
    expect(screen.getByText('Brotes primaverales')).toBeDefined();
  });

  it('renders recommendations with priority badges and evidence', () => {
    render(<PlantCareContextSection careContext={mockCareContext} />);

    expect(screen.getByText('Evaluar riego del ejemplar')).toBeDefined();
    expect(screen.getByText('Alta')).toBeDefined();
    expect(screen.getByText('Ver justificación y lecturas')).toBeDefined();
    expect(screen.getByText('Humedad actual: 20%')).toBeDefined();
  });
});
