'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UsePhotoPickerOptions {
  onFileSelect?: (file: File | null) => void;
  disabled?: boolean;
  maxFileSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export const DEFAULT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const DEFAULT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function usePhotoPicker(options: UsePhotoPickerOptions = {}) {
  const {
    onFileSelect,
    disabled = false,
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
    allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
  } = options;

  const [isNative, setIsNative] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect Capacitor native platform safely on client side
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

  // Cleanup object URL on unmount or when previewUrl changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const updateSelectedFile = useCallback(
    (file: File | null) => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (file) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setSelectedFile(file);
        setClientError(null);

        // Sync with hidden file input for standard form submission
        try {
          if (galleryInputRef.current && typeof DataTransfer !== 'undefined') {
            const dt = new DataTransfer();
            dt.items.add(file);
            galleryInputRef.current.files = dt.files;
          }
        } catch {
          // Ignore if DataTransfer is not supported
        }
      } else {
        setPreviewUrl(null);
        setSelectedFile(null);
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }

      if (onFileSelect) {
        onFileSelect(file);
      }
    },
    [previewUrl, onFileSelect]
  );

  const validateAndProcessFile = useCallback(
    (file: File): boolean => {
      if (!allowedMimeTypes.includes(file.type)) {
        setClientError('Formato no compatible. Usá archivos JPEG, PNG o WebP.');
        return false;
      }

      if (file.size > maxFileSizeBytes) {
        setClientError('La imagen supera el límite máximo de 20 MB.');
        return false;
      }

      updateSelectedFile(file);
      return true;
    },
    [allowedMimeTypes, maxFileSizeBytes, updateSelectedFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setClientError(null);
      const files = e.target.files;
      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];
      const valid = validateAndProcessFile(file);
      if (!valid) {
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }
    },
    [validateAndProcessFile]
  );

  const handleNativeCapture = useCallback(
    async (sourceType: 'camera' | 'photos') => {
      if (disabled || isLoading) return;

      setIsLoading(true);
      setClientError(null);

      try {
        const { Capacitor } = await import('@capacitor/core');
        console.log('[PhotoPicker] handleNativeCapture - platform:', Capacitor.getPlatform?.() ?? 'unknown', 'sourceType:', sourceType);

        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        console.log('[PhotoPicker] Invoking Camera.getPhoto({ source:', sourceType === 'camera' ? 'Camera' : 'Photos', '})');

        const photo = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: sourceType === 'camera' ? CameraSource.Camera : CameraSource.Photos,
          correctOrientation: true,
        });

        console.log('[PhotoPicker] Camera.getPhoto result received, format:', photo.format);

        const fetchUrl = photo.webPath || photo.path;
        if (!fetchUrl) {
          throw new Error('No se recibió la ruta de la fotografía capturada.');
        }

        const response = await fetch(fetchUrl);
        const blob = await response.blob();

        const format = (photo.format || 'jpeg').toLowerCase();
        const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
        const fileExt = format === 'jpg' ? 'jpeg' : format;
        const fileName = `plant_${Date.now()}.${fileExt}`;

        const file = new File([blob], fileName, { type: mimeType });
        validateAndProcessFile(file);
      } catch (err: unknown) {
        console.error('[PhotoPicker] Error in handleNativeCapture:', err);
        const errMsg = err instanceof Error ? err.message : String(err);

        // Graceful user cancellation detection across devices/emulators
        if (/cancel|dismiss|closed|back/i.test(errMsg)) {
          // User deliberately cancelled the picker or camera — no visible error
          return;
        }

        if (/permission|denied|auth/i.test(errMsg)) {
          const actionText = sourceType === 'camera' ? 'a la cámara' : 'a las fotos';
          setClientError(`Permiso denegado. Podés habilitar el acceso ${actionText} desde los Ajustes del dispositivo.`);
          return;
        }

        setClientError(`Error al capturar fotografía: ${errMsg || 'Intentá nuevamente.'}`);
      } finally {
        setIsLoading(false);
      }
    },
    [disabled, isLoading, validateAndProcessFile]
  );

  const handleTriggerGallery = useCallback(async () => {
    if (disabled || isLoading) return;

    let native = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      native = Capacitor.isNativePlatform();
      console.log('[PhotoPicker] handleTriggerGallery - isNative:', native, 'platform:', Capacitor.getPlatform?.() ?? 'unknown');
    } catch {
      // In web or environments where @capacitor/core isn't native
    }

    if (native) {
      // En plataforma nativa Capacitor: NUNCA degradar a input file
      await handleNativeCapture('photos');
      return;
    }

    // Fallback exclusivo para navegador web
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  }, [disabled, isLoading, handleNativeCapture]);

  const handleTriggerCamera = useCallback(async () => {
    if (disabled || isLoading) return;

    let native = false;
    try {
      const { Capacitor } = await import('@capacitor/core');
      native = Capacitor.isNativePlatform();
      console.log('[PhotoPicker] handleTriggerCamera - isNative:', native, 'platform:', Capacitor.getPlatform?.() ?? 'unknown');
    } catch {
      // In web or environments where @capacitor/core isn't native
    }

    if (native) {
      // En plataforma nativa Capacitor: NUNCA degradar a input file
      await handleNativeCapture('camera');
      return;
    }

    // Fallback exclusivo para navegador web
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, [disabled, isLoading, handleNativeCapture]);

  const handleRemoveSelection = useCallback(() => {
    updateSelectedFile(null);
    setClientError(null);
  }, [updateSelectedFile]);

  return {
    isNative,
    selectedFile,
    previewUrl,
    clientError,
    isLoading,
    galleryInputRef,
    cameraInputRef,
    handleTriggerGallery,
    handleTriggerCamera,
    handleFileChange,
    handleRemoveSelection,
    setClientError,
  };
}
