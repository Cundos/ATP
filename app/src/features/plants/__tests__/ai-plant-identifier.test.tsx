// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiPlantIdentifier } from '../components/AiPlantIdentifier';

describe('AiPlantIdentifier Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-preview');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders trigger button correctly', () => {
    const handleApply = vi.fn();
    render(<AiPlantIdentifier onApply={handleApply} />);

    expect(
      screen.getByRole('button', { name: /Identificar Planta con Foto \(IA\)/i })
    ).toBeInTheDocument();
  });

  it('handles image upload, calls identification API and applies result', async () => {
    const handleApply = vi.fn();

    const mockAiResponse = {
      success: true,
      isPlant: true,
      primaryCandidate: {
        scientificName: 'Citrus limon',
        commonName: 'Limonero',
        confidence: 0.94,
        family: 'Rutaceae',
        description: 'Árbol frutal cítrico',
        healthObservation: 'Hojas verdes saludables',
      },
      alternativeCandidates: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAiResponse,
    } as unknown as Response);

    render(<AiPlantIdentifier onApply={handleApply} />);

    const fileInput = screen.getByLabelText(
      /Subir foto para identificación con IA/i
    );
    const fakeFile = new File(['fake-image-bytes'], 'lemon.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.getByText('Citrus limon')).toBeInTheDocument();
      expect(screen.getByText('Limonero')).toBeInTheDocument();
      expect(screen.getByText(/Certeza: 94%/i)).toBeInTheDocument();
    });

    const applyButton = screen.getByRole('button', {
      name: /Aplicar al formulario/i,
    });
    fireEvent.click(applyButton);

    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith(
      expect.objectContaining({
        scientificName: 'Citrus limon',
        commonName: 'Limonero',
        confidence: 0.94,
      })
    );
  });

  it('handles non-plant images and informs the user', async () => {
    const handleApply = vi.fn();

    const mockAiResponse = {
      success: true,
      isPlant: false,
      notes: 'No parece ser una planta.',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAiResponse,
    } as unknown as Response);

    render(<AiPlantIdentifier onApply={handleApply} />);

    const fileInput = screen.getByLabelText(
      /Subir foto para identificación con IA/i
    );
    const fakeFile = new File(['fake-image-bytes'], 'chair.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/No se reconoció una planta/i)
      ).toBeInTheDocument();
    });

    expect(handleApply).not.toHaveBeenCalled();
  });

  it('handles API error properly and displays error alert', async () => {
    const handleApply = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        success: false,
        error: 'No se configuró la clave de API de Gemini.',
      }),
    } as unknown as Response);

    render(<AiPlantIdentifier onApply={handleApply} />);

    const fileInput = screen.getByLabelText(
      /Subir foto para identificación con IA/i
    );
    const fakeFile = new File(['fake-image-bytes'], 'test.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(
        screen.getByText(/No se configuró la clave de API de Gemini/i)
      ).toBeInTheDocument();
    });
  });
});
