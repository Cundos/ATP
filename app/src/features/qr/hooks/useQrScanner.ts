'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseAtilioQr } from '../utils/parseAtilioQr';

export interface UseQrScannerOptions {
  onSuccess?: (permanentCode: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  allowedHosts?: string[];
}

export interface UseQrScannerResult {
  isNative: boolean;
  isScanning: boolean;
  isProcessing: boolean;
  errorMessage: string | null;
  startScan: () => Promise<void>;
  cancelScan: () => void;
  clearError: () => void;
}

export function useQrScanner(options: UseQrScannerOptions = {}): UseQrScannerResult {
  const { onSuccess, onError, onCancel, allowedHosts } = options;
  const router = useRouter();

  const [isNative, setIsNative] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isScanningRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);

  // Safe client-side native platform check
  useEffect(() => {
    let mounted = true;
    import('@capacitor/core')
      .then(({ Capacitor }) => {
        if (mounted) {
          setIsNative(Capacitor.isNativePlatform());
        }
      })
      .catch(() => {
        if (mounted) {
          setIsNative(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const cancelScan = useCallback(() => {
    isScanningRef.current = false;
    isProcessingRef.current = false;
    setIsScanning(false);
    setIsProcessing(false);
    onCancel?.();
  }, [onCancel]);

  const startScan = useCallback(async () => {
    if (isScanningRef.current || isProcessingRef.current) {
      return;
    }

    setErrorMessage(null);

    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) {
        const fallbackMsg = 'El escáner QR nativo está disponible en la app móvil Android.';
        setErrorMessage(fallbackMsg);
        onError?.(fallbackMsg);
        return;
      }

      const { BarcodeScanner, BarcodeFormat } = await import(
        '@capacitor-mlkit/barcode-scanning'
      );

      // Check and request camera permission
      const permStatus = await BarcodeScanner.checkPermissions();
      if (permStatus.camera !== 'granted') {
        const reqResult = await BarcodeScanner.requestPermissions();
        if (reqResult.camera !== 'granted') {
          const deniedMsg =
            'Permiso de cámara denegado. Podés habilitarlo desde los Ajustes del dispositivo.';
          setErrorMessage(deniedMsg);
          onError?.(deniedMsg);
          return;
        }
      }

      // Ensure Google Barcode Scanner Module is available on Android ML Kit
      try {
        const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if (!moduleStatus.available) {
          await BarcodeScanner.installGoogleBarcodeScannerModule();
        }
      } catch {
        // Continue if module check is not supported
      }

      isScanningRef.current = true;
      setIsScanning(true);

      const scanResult = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      isScanningRef.current = false;
      setIsScanning(false);

      if (!scanResult.barcodes || scanResult.barcodes.length === 0) {
        // User cancelled the scan via back button or close action
        onCancel?.();
        return;
      }

      const rawValue =
        scanResult.barcodes[0]?.displayValue ||
        scanResult.barcodes[0]?.rawValue ||
        '';

      const parsed = parseAtilioQr(rawValue, allowedHosts);

      if (!parsed.valid || !parsed.targetPath || !parsed.permanentCode) {
        const invalidMsg =
          parsed.error || 'Este código QR no pertenece a Atilio Plants.';
        setErrorMessage(invalidMsg);
        onError?.(invalidMsg);
        return;
      }

      // Single-fire lock to prevent duplicate scans
      isProcessingRef.current = true;
      setIsProcessing(true);

      onSuccess?.(parsed.permanentCode);
      router.push(parsed.targetPath);
    } catch (err: unknown) {
      isScanningRef.current = false;
      setIsScanning(false);

      const errMsg = err instanceof Error ? err.message : String(err);

      // User cancellation detection across Android ML Kit implementations
      if (/cancel|dismiss|closed|back/i.test(errMsg)) {
        onCancel?.();
        return;
      }

      if (/permission|denied|auth/i.test(errMsg)) {
        const deniedMsg =
          'Permiso de cámara denegado. Podés habilitarlo desde los Ajustes del dispositivo.';
        setErrorMessage(deniedMsg);
        onError?.(deniedMsg);
        return;
      }

      const genericError = 'No se pudo completar el escaneo. Intentá nuevamente.';
      setErrorMessage(genericError);
      onError?.(genericError);
    }
  }, [allowedHosts, onError, onSuccess, onCancel, router]);

  return {
    isNative,
    isScanning,
    isProcessing,
    errorMessage,
    startScan,
    cancelScan,
    clearError,
  };
}
