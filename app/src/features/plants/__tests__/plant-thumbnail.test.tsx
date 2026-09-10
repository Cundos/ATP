// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PlantThumbnail } from '../components/PlantThumbnail';

describe('PlantThumbnail Component', () => {
  it('renders botanical placeholder with aria-hidden when no photoPath is provided', () => {
    const { container } = render(<PlantThumbnail plantName="Gomero" />);
    
    // No img element
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    
    // Placeholder container exists and has aria-hidden="true"
    const placeholder = container.querySelector('[aria-hidden="true"]');
    expect(placeholder).toBeInTheDocument();
  });

  it('renders image with correct same-origin src and accessible alt text when photoPath is provided', () => {
    render(
      <PlantThumbnail
        photoPath="photos/AT-PL-001/019550b1-3e28-769a-9e32-cba98305c453.webp"
        plantName="Gomero"
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      '/api/photos/view/photos/AT-PL-001/019550b1-3e28-769a-9e32-cba98305c453.webp'
    );
    expect(img).toHaveAttribute('alt', 'Foto principal de Gomero');
  });

  it('applies size class correctly', () => {
    const { container: containerSm } = render(<PlantThumbnail plantName="Pothos" size="sm" />);
    expect(containerSm.firstChild).toHaveClass(/sm/);

    const { container: containerLg } = render(<PlantThumbnail plantName="Pothos" size="lg" />);
    expect(containerLg.firstChild).toHaveClass(/lg/);
  });
});
