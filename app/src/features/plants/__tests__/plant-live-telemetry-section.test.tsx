// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlantLiveTelemetrySection } from '../components/PlantLiveTelemetrySection';
import { PlantLiveTelemetryDTO } from '@/core/application/use-cases/GetPlantLiveTelemetryUseCase';

describe('PlantLiveTelemetrySection Component (ATP-HA-002)', () => {
  it('does not render anything if binding is not configured', () => {
    const unconfiguredTelemetry: PlantLiveTelemetryDTO = {
      plant_id: 'plant-1',
      permanent_code: 'AT-PL-001',
      binding_configured: false,
      available: false,
      moisture: null,
      hardware: null,
    };

    const { container } = render(
      <PlantLiveTelemetrySection telemetry={unconfiguredTelemetry} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders graceful degradation notice when telemetry is unavailable', () => {
    const unavailableTelemetry: PlantLiveTelemetryDTO = {
      plant_id: 'plant-7',
      permanent_code: 'AT-PL-007',
      binding_configured: true,
      available: false,
      moisture: null,
      hardware: null,
      error_reason: 'Home Assistant no disponible',
    };

    render(<PlantLiveTelemetrySection telemetry={unavailableTelemetry} />);

    expect(screen.getByRole('heading', { name: /estado en tiempo real/i })).toBeDefined();
    expect(screen.getByText(/sin conexión/i)).toBeDefined();
    expect(screen.getByText(/home assistant no disponible/i)).toBeDefined();
  });

  it('renders full telemetry cards when available', () => {
    const availableTelemetry: PlantLiveTelemetryDTO = {
      plant_id: 'plant-7',
      permanent_code: 'AT-PL-007',
      binding_configured: true,
      available: true,
      moisture: {
        value: 48.5,
        unit: '%',
        visual_state: 'Óptimo',
        last_updated: '2026-09-12T19:30:00.000Z',
        available: true,
      },
      hardware: {
        battery: 92,
        online: true,
        stale: false,
        last_seen: '2026-09-12T19:30:00.000Z',
        available: true,
      },
    };

    render(<PlantLiveTelemetrySection telemetry={availableTelemetry} />);

    expect(screen.getByRole('heading', { name: /estado en tiempo real/i })).toBeDefined();
    expect(screen.getByText(/telemetría activa/i)).toBeDefined();
    expect(screen.getByText(/48.5/i)).toBeDefined();
    expect(screen.getByText('Óptimo')).toBeDefined();
    expect(screen.getByText(/92%/i)).toBeDefined();
    expect(screen.getByText(/en línea/i)).toBeDefined();
    expect(screen.getByText(/al día/i)).toBeDefined();
  });
});

