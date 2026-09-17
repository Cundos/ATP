// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { useQrScanner } from '../hooks/useQrScanner';

type QrScannerResult = ReturnType<typeof useQrScanner>;

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('useQrScanner hook (ATP-MOB-003)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports fallback message on web when Capacitor is not native', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => false,
      },
    }));

    const { useQrScanner: hook } = await import('../hooks/useQrScanner');

    let resultHook!: { current: QrScannerResult };
    await act(async () => {
      const rendered = renderHook(() => hook());
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(resultHook.current.isNative).toBe(false);

    await act(async () => {
      await resultHook.current.startScan();
    });

    expect(resultHook.current.errorMessage).toContain('disponible en la app móvil Android');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('scans valid QR code natively and navigates to plant detail', async () => {
    const onSuccess = vi.fn();
    const scanMock = vi.fn().mockResolvedValue({
      barcodes: [
        {
          displayValue: 'https://app-iota-three-66.vercel.app/plants/AT-PL-007',
          format: 'QR_CODE',
        },
      ],
    });

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor-mlkit/barcode-scanning', () => ({
      BarcodeScanner: {
        checkPermissions: vi.fn().mockResolvedValue({ camera: 'granted' }),
        requestPermissions: vi.fn().mockResolvedValue({ camera: 'granted' }),
        isGoogleBarcodeScannerModuleAvailable: vi.fn().mockResolvedValue({ available: true }),
        installGoogleBarcodeScannerModule: vi.fn().mockResolvedValue(undefined),
        scan: scanMock,
      },
      BarcodeFormat: { QrCode: 'QR_CODE' },
    }));

    const { useQrScanner: hook } = await import('../hooks/useQrScanner');

    let resultHook!: { current: QrScannerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onSuccess }));
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(resultHook.current.isNative).toBe(true);

    await act(async () => {
      await resultHook.current.startScan();
    });

    expect(scanMock).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('AT-PL-007');
    expect(mockPush).toHaveBeenCalledWith('/plants/AT-PL-007');
    expect(resultHook.current.errorMessage).toBeNull();
  });

  it('shows error when external or unapproved QR code is scanned', async () => {
    const onError = vi.fn();
    const scanMock = vi.fn().mockResolvedValue({
      barcodes: [
        {
          displayValue: 'https://malicious-site.com/plants/AT-PL-001',
          format: 'QR_CODE',
        },
      ],
    });

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor-mlkit/barcode-scanning', () => ({
      BarcodeScanner: {
        checkPermissions: vi.fn().mockResolvedValue({ camera: 'granted' }),
        requestPermissions: vi.fn().mockResolvedValue({ camera: 'granted' }),
        isGoogleBarcodeScannerModuleAvailable: vi.fn().mockResolvedValue({ available: true }),
        scan: scanMock,
      },
      BarcodeFormat: { QrCode: 'QR_CODE' },
    }));

    const { useQrScanner: hook } = await import('../hooks/useQrScanner');

    let resultHook!: { current: QrScannerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onError }));
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    await act(async () => {
      await resultHook.current.startScan();
    });

    expect(resultHook.current.errorMessage).toBe('Este código no pertenece a Atilio Plants.');
    expect(onError).toHaveBeenCalledWith('Este código no pertenece a Atilio Plants.');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles user cancellation gracefully without showing errors', async () => {
    const onCancel = vi.fn();
    const scanMock = vi.fn().mockResolvedValue({
      barcodes: [],
    });

    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor-mlkit/barcode-scanning', () => ({
      BarcodeScanner: {
        checkPermissions: vi.fn().mockResolvedValue({ camera: 'granted' }),
        requestPermissions: vi.fn().mockResolvedValue({ camera: 'granted' }),
        isGoogleBarcodeScannerModuleAvailable: vi.fn().mockResolvedValue({ available: true }),
        scan: scanMock,
      },
      BarcodeFormat: { QrCode: 'QR_CODE' },
    }));

    const { useQrScanner: hook } = await import('../hooks/useQrScanner');

    let resultHook!: { current: QrScannerResult };
    await act(async () => {
      const rendered = renderHook(() => hook({ onCancel }));
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    await act(async () => {
      await resultHook.current.startScan();
    });

    expect(onCancel).toHaveBeenCalled();
    expect(resultHook.current.errorMessage).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('displays permission denied message when camera permission is denied', async () => {
    vi.doMock('@capacitor/core', () => ({
      Capacitor: {
        isNativePlatform: () => true,
      },
    }));

    vi.doMock('@capacitor-mlkit/barcode-scanning', () => ({
      BarcodeScanner: {
        checkPermissions: vi.fn().mockResolvedValue({ camera: 'denied' }),
        requestPermissions: vi.fn().mockResolvedValue({ camera: 'denied' }),
        isGoogleBarcodeScannerModuleAvailable: vi.fn().mockResolvedValue({ available: true }),
        scan: vi.fn(),
      },
      BarcodeFormat: { QrCode: 'QR_CODE' },
    }));

    const { useQrScanner: hook } = await import('../hooks/useQrScanner');

    let resultHook!: { current: QrScannerResult };
    await act(async () => {
      const rendered = renderHook(() => hook());
      resultHook = rendered.result;
      await new Promise((r) => setTimeout(r, 20));
    });

    await act(async () => {
      await resultHook.current.startScan();
    });

    expect(resultHook.current.errorMessage).toContain('Permiso de cámara denegado');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
