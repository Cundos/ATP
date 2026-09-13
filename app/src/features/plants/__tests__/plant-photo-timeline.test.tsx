// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlantPhotoTimeline } from '../components/PlantPhotoTimeline';
import { PhotoEntity } from '@/core/domain/entities';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('PlantPhotoTimeline Component (ATP-FEAT-002)', () => {
  const mockPlantId = '01932f91-0000-7000-8000-000000000001';
  const mockPermanentCode = 'AT-PL-007';

  const mockPhotos: PhotoEntity[] = [
    {
      id: 'photo-1',
      plant_id: mockPlantId,
      file_path: 'photos/AT-PL-007/photo1.webp',
      file_name: 'photo1.webp',
      mime_type: 'image/webp',
      file_size: 150000,
      is_primary: true,
      captured_at: null,
      taken_at: new Date('2026-01-10T12:00:00Z'),
      caption: 'Primera fotografía al adquirir el ejemplar',
      created_at: new Date('2026-01-10T12:00:00Z'),
    },
    {
      id: 'photo-2',
      plant_id: mockPlantId,
      file_path: 'photos/AT-PL-007/photo2.webp',
      file_name: 'photo2.webp',
      mime_type: 'image/webp',
      file_size: 160000,
      is_primary: false,
      captured_at: null,
      taken_at: new Date('2026-03-15T10:00:00Z'),
      caption: 'Brote nuevo de primavera',
      created_at: new Date('2026-03-15T10:00:00Z'),
    },
  ];

  it('renders empty state when no photos are provided', () => {
    render(
      <PlantPhotoTimeline
        plantId={mockPlantId}
        permanentCode={mockPermanentCode}
        photos={[]}
      />
    );

    expect(screen.getByTestId('photo-timeline-empty')).toBeInTheDocument();
    expect(
      screen.getByText('Todavía no hay fotografías históricas.')
    ).toBeInTheDocument();
  });

  it('renders photos chronologically in descending order and highlights primary photo', () => {
    render(
      <PlantPhotoTimeline
        plantId={mockPlantId}
        permanentCode={mockPermanentCode}
        photos={mockPhotos}
      />
    );

    // Section header
    expect(screen.getByText('Evolución visual')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // count badge

    // Primary badge
    expect(screen.getByTestId('primary-photo-badge')).toBeInTheDocument();
    expect(screen.getByText('Foto principal')).toBeInTheDocument();

    // Captions
    expect(
      screen.getByText('Primera fotografía al adquirir el ejemplar')
    ).toBeInTheDocument();
    expect(screen.getByText('Brote nuevo de primavera')).toBeInTheDocument();

    // The cards should appear in chronological desc order: photo-2 (March 2026) before photo-1 (Jan 2026)
    const cards = screen.getAllByRole('button').filter((btn) =>
      btn.getAttribute('data-testid')?.startsWith('photo-timeline-card-')
    );
    expect(cards[0]).toHaveAttribute('data-testid', 'photo-timeline-card-photo-2');
    expect(cards[1]).toHaveAttribute('data-testid', 'photo-timeline-card-photo-1');
  });

  it('supports toggling comparison mode and selecting photos', () => {
    render(
      <PlantPhotoTimeline
        plantId={mockPlantId}
        permanentCode={mockPermanentCode}
        photos={mockPhotos}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-comparison-btn');
    expect(toggleBtn).toBeInTheDocument();

    // Toggle comparison mode on
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Salir de Comparar')).toBeInTheDocument();
    expect(screen.getByText('0 / 2 seleccionadas')).toBeInTheDocument();

    // Click photo 1
    const card1 = screen.getByTestId('photo-timeline-card-photo-1');
    fireEvent.click(card1);
    expect(screen.getByText('1 / 2 seleccionadas')).toBeInTheDocument();

    // Click photo 2
    const card2 = screen.getByTestId('photo-timeline-card-photo-2');
    fireEvent.click(card2);
    expect(screen.getByText('2 / 2 seleccionadas')).toBeInTheDocument();

    // Comparison execution button should now be enabled
    const compareExecBtn = screen.getByTestId('execute-comparison-btn');
    expect(compareExecBtn).not.toBeDisabled();
  });
});
