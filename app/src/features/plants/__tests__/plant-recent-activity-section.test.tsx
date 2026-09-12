// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlantRecentActivitySection } from '../components/PlantRecentActivitySection';
import { PlantOperationalEventEntity } from '@/core/domain/entities';

describe('PlantRecentActivitySection Component (ATP-HA-003)', () => {
  it('does not render anything if events list is empty', () => {
    const { container } = render(<PlantRecentActivitySection events={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders list of events in descending order with human-readable labels and formatted values', () => {
    const mockEvents: PlantOperationalEventEntity[] = [
      {
        id: 'event-1',
        plant_id: 'plant-1',
        source: 'HOME_ASSISTANT',
        event_type: 'SOIL_MOISTURE_LOW',
        event_key: 'home-assistant:ha-001',
        occurred_at: new Date(Date.now() - 1000 * 60 * 12), // 12 min ago
        received_at: new Date(),
        value_number: 14.2,
        value_text: null,
        unit: '%',
        metadata: null,
        created_at: new Date(),
      },
      {
        id: 'event-2',
        plant_id: 'plant-1',
        source: 'HOME_ASSISTANT',
        event_type: 'SENSOR_ONLINE',
        event_key: 'home-assistant:ha-002',
        occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 h ago
        received_at: new Date(),
        value_number: null,
        value_text: null,
        unit: null,
        metadata: null,
        created_at: new Date(),
      },
      {
        id: 'event-3',
        plant_id: 'plant-1',
        source: 'HOME_ASSISTANT',
        event_type: 'IRRIGATION_FINISHED',
        event_key: 'home-assistant:ha-003',
        occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 d ago
        received_at: new Date(),
        value_number: null,
        value_text: null,
        unit: null,
        metadata: null,
        created_at: new Date(),
      },
    ];

    render(<PlantRecentActivitySection events={mockEvents} />);

    expect(screen.getByRole('heading', { name: /actividad reciente/i })).toBeDefined();
    expect(screen.getByText(/3 eventos/i)).toBeDefined();

    expect(screen.getByText('Humedad baja')).toBeDefined();
    expect(screen.getByText('14.2 %')).toBeDefined();
    expect(screen.getByText('hace 12 min')).toBeDefined();

    expect(screen.getByText('Sensor en línea')).toBeDefined();
    expect(screen.getByText('hace 3 h')).toBeDefined();

    expect(screen.getByText('Riego finalizado')).toBeDefined();
    expect(screen.getByText('hace 2 d')).toBeDefined();
  });
});
