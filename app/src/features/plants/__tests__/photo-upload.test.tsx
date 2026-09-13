// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PhotoUpload } from '../components/PhotoUpload';

describe('PhotoUpload Component', () => {
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-uuid');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('renders dual file inputs: gallery input without capture and camera input with environment capture', () => {
    const { container } = render(<PhotoUpload />);

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    expect(galleryInput).toBeInTheDocument();
    expect(galleryInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(galleryInput).not.toHaveAttribute('capture');

    const cameraInput = container.querySelector('input[data-testid="photo-camera-input"]') as HTMLInputElement;
    expect(cameraInput).toBeInTheDocument();
    expect(cameraInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(cameraInput).toHaveAttribute('capture', 'environment');
  });

  it('displays placeholder box and action buttons when no photo is selected', () => {
    render(<PhotoUpload />);
    expect(screen.getByText(/Elegí una foto de galería o tomá una nueva/i)).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG o WebP \(hasta 20 MB\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Elegir de galería/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tomar foto/i })).toBeInTheDocument();
  });

  it('displays currentPhotoUrl in edit mode when provided', () => {
    render(<PhotoUpload currentPhotoUrl="/api/photos/view/photos/AT-PL-001/current.webp" />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/photos/view/photos/AT-PL-001/current.webp');
    expect(screen.getByRole('button', { name: /Elegir de galería/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tomar foto/i })).toBeInTheDocument();
  });

  it('generates object URL preview when a valid image file is selected via gallery input', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<PhotoUpload onFileSelect={onFileSelect} />);

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const testFile = new File(['fake-image-bytes'], 'plant.png', { type: 'image/png' });

    fireEvent.change(galleryInput, { target: { files: [testFile] } });

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(testFile);
    expect(onFileSelect).toHaveBeenCalledWith(testFile);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'blob:http://localhost/test-uuid');
    expect(screen.getByText('Nueva foto')).toBeInTheDocument();
    expect(screen.getByText('Quitar selección')).toBeInTheDocument();
  });

  it('generates object URL preview when a valid image file is selected via camera input', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<PhotoUpload onFileSelect={onFileSelect} />);

    const cameraInput = container.querySelector('input[data-testid="photo-camera-input"]') as HTMLInputElement;
    const testFile = new File(['fake-image-bytes-cam'], 'photo.jpg', { type: 'image/jpeg' });

    fireEvent.change(cameraInput, { target: { files: [testFile] } });

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(testFile);
    expect(onFileSelect).toHaveBeenCalledWith(testFile);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'blob:http://localhost/test-uuid');
    expect(screen.getByText('Nueva foto')).toBeInTheDocument();
    expect(screen.getByText('Quitar selección')).toBeInTheDocument();
  });

  it('validates client-side MIME type and shows clear error in Spanish on unsupported files', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<PhotoUpload onFileSelect={onFileSelect} />);

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const invalidFile = new File(['fake-pdf'], 'document.pdf', { type: 'application/pdf' });

    fireEvent.change(galleryInput, { target: { files: [invalidFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Formato no compatible. Usá archivos JPEG, PNG o WebP.'
    );
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('validates client-side size and rejects files exceeding 20 MB', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<PhotoUpload onFileSelect={onFileSelect} />);

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const oversizedFile = new File(['x'.repeat(100)], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizedFile, 'size', { value: 25 * 1024 * 1024 });

    fireEvent.change(galleryInput, { target: { files: [oversizedFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La imagen supera el límite máximo de 20 MB.'
    );
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('clears selection and revokes object URL when Quitar selección is clicked', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<PhotoUpload onFileSelect={onFileSelect} />);

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const testFile = new File(['fake-bytes'], 'plant.jpg', { type: 'image/jpeg' });

    fireEvent.change(galleryInput, { target: { files: [testFile] } });
    expect(screen.getByText('Quitar selección')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Quitar selección'));

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
    expect(onFileSelect).toHaveBeenCalledWith(null);
    expect(screen.queryByText('Nueva foto')).not.toBeInTheDocument();
  });

  it('disables file inputs and buttons when disabled prop is true', () => {
    const { container } = render(<PhotoUpload disabled={true} />);

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const cameraInput = container.querySelector('input[data-testid="photo-camera-input"]') as HTMLInputElement;
    expect(galleryInput).toBeDisabled();
    expect(cameraInput).toBeDisabled();

    const galleryBtn = screen.getByRole('button', { name: /Elegir de galería/i });
    const cameraBtn = screen.getByRole('button', { name: /Tomar foto/i });
    expect(galleryBtn).toBeDisabled();
    expect(cameraBtn).toBeDisabled();
  });
});
