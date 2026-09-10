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

  it('renders mobile-first input file with environment capture and allowed MIME types', () => {
    const { container } = render(<PhotoUpload />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(input).toHaveAttribute('capture', 'environment');
  });

  it('displays placeholder box when no photo is selected or provided', () => {
    render(<PhotoUpload />);
    expect(screen.getByText(/Tocar para tomar o seleccionar foto/i)).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG o WebP \(hasta 20 MB\)/i)).toBeInTheDocument();
  });

  it('displays currentPhotoUrl in edit mode when provided', () => {
    render(<PhotoUpload currentPhotoUrl="/api/photos/view/photos/AT-PL-001/current.webp" />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/photos/view/photos/AT-PL-001/current.webp');
    expect(screen.getByText(/Cambiar foto/i)).toBeInTheDocument();
  });

  it('generates object URL preview when a valid image file is selected', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<PhotoUpload onFileSelect={onFileSelect} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['fake-image-bytes'], 'plant.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [testFile] } });

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

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['fake-pdf'], 'document.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Formato no compatible. Usá archivos JPEG, PNG o WebP.'
    );
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('validates client-side size and rejects files exceeding 20 MB', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<PhotoUpload onFileSelect={onFileSelect} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const oversizedFile = new File(['x'.repeat(100)], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizedFile, 'size', { value: 25 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [oversizedFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La imagen supera el límite máximo de 20 MB.'
    );
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('clears selection and revokes object URL when Quitar selección is clicked', () => {
    const onFileSelect = vi.fn();
    const { container } = render(<PhotoUpload onFileSelect={onFileSelect} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['fake-bytes'], 'plant.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [testFile] } });
    expect(screen.getByText('Quitar selección')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Quitar selección'));

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
    expect(onFileSelect).toHaveBeenCalledWith(null);
    expect(screen.queryByText('Nueva foto')).not.toBeInTheDocument();
  });

  it('disables file input and buttons when disabled prop is true', () => {
    const { container } = render(<PhotoUpload disabled={true} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();

    const button = screen.getByRole('button', { name: /Tomar \/ Seleccionar foto/i });
    expect(button).toBeDisabled();
  });
});
