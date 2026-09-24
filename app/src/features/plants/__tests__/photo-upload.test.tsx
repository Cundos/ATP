// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { PhotoUpload } from '../components/PhotoUpload';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
  }),
}));

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
    expect(galleryInput).toHaveAttribute('accept', 'image/*,.heic,.heif');
    expect(galleryInput).not.toHaveAttribute('capture');

    const cameraInput = container.querySelector('input[data-testid="photo-camera-input"]') as HTMLInputElement;
    expect(cameraInput).toBeInTheDocument();
    expect(cameraInput).toHaveAttribute('accept', 'image/*');
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

  it('triggers file input directly on web environment when clicking placeholder', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));

    const { container } = render(<PhotoUpload />);
    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const galleryClickSpy = vi.spyOn(galleryInput, 'click').mockImplementation(() => {});

    const placeholder = screen.getByLabelText(/Agregar fotografía al ejemplar/i);
    fireEvent.click(placeholder);

    await new Promise((r) => setTimeout(r, 20));

    expect(galleryClickSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens choice modal in native platform on clicking placeholder, allowing Tomar foto, Elegir de galería or Cancelar (ATP-MOB-002.2)', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    const getPhotoMock = vi.fn().mockResolvedValue({
      webPath: 'blob:capacitor://fake-cam',
      format: 'jpeg',
    });

    vi.doMock('@capacitor/camera', () => ({
      Camera: {
        getPhoto: getPhotoMock,
      },
      CameraResultType: { Uri: 'uri' },
      CameraSource: { Camera: 'CAMERA', Photos: 'PHOTOS' },
    }));

    const { PhotoUpload: NativePhotoUpload } = await import('../components/PhotoUpload');
    render(<NativePhotoUpload />);

    // Wait for native platform detection
    await new Promise((r) => setTimeout(r, 30));

    const placeholder = screen.getByLabelText(/Agregar fotografía al ejemplar/i);
    fireEvent.click(placeholder);

    // Verify modal is displayed
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Agregar fotografía')).toBeInTheDocument();
    expect(within(dialog).getByText('Elegí de dónde querés obtener la imagen para este ejemplar.')).toBeInTheDocument();

    // Verify buttons inside dialog
    const takePhotoBtn = within(dialog).getByRole('button', { name: /tomar foto/i });
    const galleryBtn = within(dialog).getByRole('button', { name: /elegir de galería/i });
    const cancelBtn = within(dialog).getByRole('button', { name: /cancelar/i });

    expect(takePhotoBtn).toBeInTheDocument();
    expect(galleryBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    // Test Cancelar closes modal
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen modal and test Tomar foto
    fireEvent.click(placeholder);
    const dialog2 = screen.getByRole('dialog');
    expect(dialog2).toBeInTheDocument();
    const takePhotoBtn2 = within(dialog2).getByRole('button', { name: /tomar foto/i });
    fireEvent.click(takePhotoBtn2);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('PlantPhotoUploadModal Component (ATP-PHOTO-003)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uploads photo directly via fetch to /api/photos/upload and calls onSuccessToast', async () => {
    const { PlantPhotoUploadModal } = await import('../components/PlantPhotoUploadModal');
    const onClose = vi.fn();
    const onSuccessToast = vi.fn();

    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ success: true }),
      });

    const { container } = render(
      <PlantPhotoUploadModal
        isOpen={true}
        onClose={onClose}
        plantId="test-plant-id"
        permanentCode="AT-PL-001"
        hasExistingPhotos={false}
        onSuccessToast={onSuccessToast}
      />
    );

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const testFile = new File(['fake-content'], 'plant.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [testFile] } });

    const submitBtn = screen.getByRole('button', { name: /guardar foto/i });
    fireEvent.click(submitBtn);

    await new Promise((r) => setTimeout(r, 10));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/photos/upload',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );

    const callArgs = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1];
    const sentFormData = callArgs[1].body as FormData;
    const sentFile = sentFormData.get('file') as File;
    expect(sentFile.name).toBe(testFile.name);
    expect(sentFormData.get('plantId')).toBe('test-plant-id');
    expect(sentFormData.get('permanentCode')).toBe('AT-PL-001');

    await new Promise((r) => setTimeout(r, 10));
    expect(onSuccessToast).toHaveBeenCalledWith('Fotografía guardada con éxito.');
  });

  it('handles 413 Payload Too Large error cleanly with Spanish message', async () => {
    const { PlantPhotoUploadModal } = await import('../components/PlantPhotoUploadModal');
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: async () => ({ error: { code: 'PAYLOAD_TOO_LARGE' } }),
      });

    const { container } = render(
      <PlantPhotoUploadModal
        isOpen={true}
        onClose={vi.fn()}
        plantId="test-plant-id"
        permanentCode="AT-PL-001"
        hasExistingPhotos={true}
      />
    );

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const testFile = new File(['fake-content'], 'huge.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [testFile] } });

    const submitBtn = screen.getByRole('button', { name: /guardar foto/i });
    fireEvent.click(submitBtn);

    await new Promise((r) => setTimeout(r, 20));

    expect(await screen.findByText(/supera el tamaño máximo permitido/i)).toBeInTheDocument();
  });

  it('handles 503 Storage Unavailable error cleanly with Spanish message', async () => {
    const { PlantPhotoUploadModal } = await import('../components/PlantPhotoUploadModal');
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { code: 'STORAGE_UNAVAILABLE' } }),
      });

    const { container } = render(
      <PlantPhotoUploadModal
        isOpen={true}
        onClose={vi.fn()}
        plantId="test-plant-id"
        permanentCode="AT-PL-001"
        hasExistingPhotos={true}
      />
    );

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const testFile = new File(['fake-content'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [testFile] } });

    const submitBtn = screen.getByRole('button', { name: /guardar foto/i });
    fireEvent.click(submitBtn);

    await new Promise((r) => setTimeout(r, 20));

    expect(await screen.findByText(/almacenamiento de fotografías no está disponible/i)).toBeInTheDocument();
  });

  it('displays diagnostic box and error when both fetch and XHR fail', async () => {
    const { PlantPhotoUploadModal } = await import('../components/PlantPhotoUploadModal');
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const { container } = render(
      <PlantPhotoUploadModal
        isOpen={true}
        onClose={vi.fn()}
        plantId="test-plant-id"
        permanentCode="AT-PL-001"
        hasExistingPhotos={true}
      />
    );

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const testFile = new File(['fake-content'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(galleryInput, { target: { files: [testFile] } });

    const submitBtn = screen.getByRole('button', { name: /guardar foto/i });
    fireEvent.click(submitBtn);

    await new Promise((r) => setTimeout(r, 30));

    expect(await screen.findByText(/Fallo en la subida de fotografía./i)).toBeInTheDocument();
    expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('PHOTO_CLIENT_STAGE_ERROR');
    expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('stage: XHR');
    expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('Fetch: [TypeError] Failed to fetch');
  });

  it('captures pre-fetch errors in outer catch with stage FORMDATA', async () => {
    const { PlantPhotoUploadModal } = await import('../components/PlantPhotoUploadModal');
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const originalAppend = FormData.prototype.append;
    FormData.prototype.append = vi.fn().mockImplementation(() => {
      throw new Error('Simulated FormData append failure');
    });

    try {
      const { container } = render(
        <PlantPhotoUploadModal
          isOpen={true}
          onClose={vi.fn()}
          plantId="test-plant-id"
          permanentCode="AT-PL-001"
          hasExistingPhotos={true}
        />
      );

      const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
      const testFile = new File(['fake-content'], 'photo.jpg', { type: 'image/jpeg' });
      fireEvent.change(galleryInput, { target: { files: [testFile] } });

      const submitBtn = screen.getByRole('button', { name: /guardar foto/i });
      fireEvent.click(submitBtn);

      await new Promise((r) => setTimeout(r, 30));

      expect(await screen.findByText(/Error preparando o enviando la fotografía./i)).toBeInTheDocument();
      expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('PHOTO_CLIENT_STAGE_ERROR');
      expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('stage: FORMDATA');
      expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('Simulated FormData append failure');
    } finally {
      FormData.prototype.append = originalAppend;
    }
  });

  it('captures pre-fetch errors in outer catch with stage READ_FILE', async () => {
    const { PlantPhotoUploadModal } = await import('../components/PlantPhotoUploadModal');
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const { container } = render(
      <PlantPhotoUploadModal
        isOpen={true}
        onClose={vi.fn()}
        plantId="test-plant-id"
        permanentCode="AT-PL-001"
        hasExistingPhotos={true}
      />
    );

    const galleryInput = container.querySelector('input[data-testid="photo-gallery-input"]') as HTMLInputElement;
    const testFile = new File(['fake-content'], 'photo.jpg', { type: 'image/jpeg' });
    testFile.arrayBuffer = vi.fn().mockRejectedValue(new Error('Simulated arrayBuffer read failure'));
    fireEvent.change(galleryInput, { target: { files: [testFile] } });

    const submitBtn = screen.getByRole('button', { name: /guardar foto/i });
    fireEvent.click(submitBtn);

    await new Promise((r) => setTimeout(r, 30));

    expect(await screen.findByText(/Error preparando o enviando la fotografía./i)).toBeInTheDocument();
    expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('PHOTO_CLIENT_STAGE_ERROR');
    expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('stage: READ_FILE');
    expect(screen.getByTestId('upload-diagnostic-info')).toHaveTextContent('Simulated arrayBuffer read failure');
  });
});


