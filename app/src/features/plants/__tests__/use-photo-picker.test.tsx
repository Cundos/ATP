// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { usePhotoPicker } from '../hooks/usePhotoPicker';

type PhotoPickerResult = ReturnType<typeof usePhotoPicker>;

describe('usePhotoPicker hook (ATP-MOB-002)', () => {
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-uuid');
    global.URL.revokeObjectURL = vi.fn();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    global.fetch = originalFetch;
  });

  it('detects web environment when Capacitor is not native and falls back to input clicks', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));

    const { usePhotoPicker: hook } = await import('../hooks/usePhotoPicker');

    let resultHook!: { current: PhotoPickerResult };
    await act(async () => {
      const rendered = renderHook(() => hook());
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(resultHook.current.isNative).toBe(false);

    // Mock input elements
    const mockGalleryClick = vi.fn();
    const mockCameraClick = vi.fn();
    // @ts-expect-error - mock ref for testing
    resultHook.current.galleryInputRef.current = { click: mockGalleryClick };
    // @ts-expect-error - mock ref for testing
    resultHook.current.cameraInputRef.current = { click: mockCameraClick };

    await act(async () => {
      await resultHook.current.handleTriggerGallery();
    });
    expect(mockGalleryClick).toHaveBeenCalledTimes(1);

    await act(async () => {
      await resultHook.current.handleTriggerCamera();
    });
    expect(mockCameraClick).toHaveBeenCalledTimes(1);
  });

  it('captures photo natively via @capacitor/camera and constructs valid File', async () => {
    const onFileSelect = vi.fn();
    const getPhotoMock = vi.fn().mockResolvedValue({
      webPath: 'blob:capacitor://fake-image',
      format: 'jpeg',
    });

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor/camera', () => ({
      Camera: {
        getPhoto: getPhotoMock,
      },
      CameraResultType: { Uri: 'uri' },
      CameraSource: { Camera: 'CAMERA', Photos: 'PHOTOS' },
    }));

    const mockBlob = new Blob(['fake-jpg-binary'], { type: 'image/jpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    });

    const { usePhotoPicker: hook } = await import('../hooks/usePhotoPicker');

    let resultHook!: { current: PhotoPickerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onFileSelect }));
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(resultHook.current.isNative).toBe(true);

    await act(async () => {
      await resultHook.current.handleTriggerCamera();
    });

    expect(getPhotoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quality: 85,
        source: 'CAMERA',
        resultType: 'uri',
      })
    );

    expect(resultHook.current.selectedFile).not.toBeNull();
    expect(resultHook.current.selectedFile?.type).toBe('image/jpeg');
    expect(resultHook.current.previewUrl).toBe('blob:http://localhost/mock-uuid');
    expect(resultHook.current.clientError).toBeNull();
    expect(onFileSelect).toHaveBeenCalledWith(expect.any(File));
  });

  it('picks from gallery natively via @capacitor/camera', async () => {
    const onFileSelect = vi.fn();
    const getPhotoMock = vi.fn().mockResolvedValue({
      webPath: 'blob:capacitor://fake-gallery-image',
      format: 'png',
    });

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor/camera', () => ({
      Camera: {
        getPhoto: getPhotoMock,
      },
      CameraResultType: { Uri: 'uri' },
      CameraSource: { Camera: 'CAMERA', Photos: 'PHOTOS' },
    }));

    const mockBlob = new Blob(['fake-png-binary'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    });

    const { usePhotoPicker: hook } = await import('../hooks/usePhotoPicker');

    let resultHook!: { current: PhotoPickerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onFileSelect }));
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    await act(async () => {
      await resultHook.current.handleTriggerGallery();
    });

    expect(getPhotoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quality: 85,
        source: 'PHOTOS',
        resultType: 'uri',
      })
    );

    expect(resultHook.current.selectedFile).not.toBeNull();
    expect(resultHook.current.selectedFile?.type).toBe('image/png');
    expect(resultHook.current.clientError).toBeNull();
  });

  it('handles user cancellation gracefully without showing errors', async () => {
    const onFileSelect = vi.fn();
    const getPhotoMock = vi.fn().mockRejectedValue(new Error('User cancelled photos app'));

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor/camera', () => ({
      Camera: {
        getPhoto: getPhotoMock,
      },
      CameraResultType: { Uri: 'uri' },
      CameraSource: { Camera: 'CAMERA', Photos: 'PHOTOS' },
    }));

    const { usePhotoPicker: hook } = await import('../hooks/usePhotoPicker');

    let resultHook!: { current: PhotoPickerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onFileSelect }));
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    await act(async () => {
      await resultHook.current.handleTriggerCamera();
    });

    expect(resultHook.current.clientError).toBeNull();
    expect(resultHook.current.selectedFile).toBeNull();
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('displays clear Spanish error message when camera or photos permission is denied', async () => {
    const onFileSelect = vi.fn();
    const getPhotoMock = vi.fn().mockRejectedValue(new Error('Permission denied'));

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor/camera', () => ({
      Camera: {
        getPhoto: getPhotoMock,
      },
      CameraResultType: { Uri: 'uri' },
      CameraSource: { Camera: 'CAMERA', Photos: 'PHOTOS' },
    }));

    const { usePhotoPicker: hook } = await import('../hooks/usePhotoPicker');

    let resultHook!: { current: PhotoPickerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onFileSelect }));
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    const mockCameraClick = vi.fn();
    // @ts-expect-error - mock ref for testing
    resultHook.current.cameraInputRef.current = { click: mockCameraClick };

    await act(async () => {
      await resultHook.current.handleTriggerCamera();
    });

    expect(resultHook.current.clientError).toContain('Permiso denegado');
    expect(resultHook.current.clientError).toContain('Ajustes del dispositivo');
    expect(mockCameraClick).not.toHaveBeenCalled();
  });

  it('displays controlled error in native platform when camera throws generic error and does NOT fallback to file input (ATP-MOB-002.3)', async () => {
    const onFileSelect = vi.fn();
    const getPhotoMock = vi.fn().mockRejectedValue(new Error('Hardware camera initialization failure'));

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
      },
    }));

    vi.doMock('@capacitor/camera', () => ({
      Camera: {
        getPhoto: getPhotoMock,
      },
      CameraResultType: { Uri: 'uri' },
      CameraSource: { Camera: 'CAMERA', Photos: 'PHOTOS' },
    }));

    const { usePhotoPicker: hook } = await import('../hooks/usePhotoPicker');

    let resultHook!: { current: PhotoPickerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onFileSelect }));
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    const mockCameraClick = vi.fn();
    // @ts-expect-error - mock ref for testing
    resultHook.current.cameraInputRef.current = { click: mockCameraClick };

    await act(async () => {
      await resultHook.current.handleTriggerCamera();
    });

    expect(resultHook.current.clientError).toContain('Error al capturar fotografía: Hardware camera initialization failure');
    expect(mockCameraClick).not.toHaveBeenCalled();
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('validates web file changes and rejects unsupported format or oversized file', async () => {
    const onFileSelect = vi.fn();
    const { usePhotoPicker: hook } = await import('../hooks/usePhotoPicker');

    let resultHook!: { current: PhotoPickerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onFileSelect }));
      resultHook = rendered.result;
    });

    const invalidFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    act(() => {
      // @ts-expect-error - mock change event
      resultHook.current.handleFileChange({ target: { files: [invalidFile] } });
    });

    expect(resultHook.current.clientError).toBe('Formato no compatible. Usá archivos JPEG, PNG o WebP.');
    expect(onFileSelect).not.toHaveBeenCalled();

    const oversizedFile = new File(['data'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversizedFile, 'size', { value: 25 * 1024 * 1024 });

    act(() => {
      // @ts-expect-error - mock change event
      resultHook.current.handleFileChange({ target: { files: [oversizedFile] } });
    });

    expect(resultHook.current.clientError).toBe('La imagen supera el límite máximo de 20 MB.');
  });

  it('clears selection and revokes URL on handleRemoveSelection', async () => {
    const onFileSelect = vi.fn();
    const { usePhotoPicker: hook } = await import('../hooks/usePhotoPicker');

    let resultHook!: { current: PhotoPickerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onFileSelect }));
      resultHook = rendered.result;
    });

    const validFile = new File(['image'], 'leaf.jpg', { type: 'image/jpeg' });
    act(() => {
      // @ts-expect-error - mock change event
      resultHook.current.handleFileChange({ target: { files: [validFile] } });
    });

    expect(resultHook.current.selectedFile).toBe(validFile);
    expect(onFileSelect).toHaveBeenCalledWith(validFile);

    act(() => {
      resultHook.current.handleRemoveSelection();
    });

    expect(resultHook.current.selectedFile).toBeNull();
    expect(resultHook.current.previewUrl).toBeNull();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    expect(onFileSelect).toHaveBeenCalledWith(null);
  });
});
