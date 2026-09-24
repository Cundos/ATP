'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { PhotoUpload } from './PhotoUpload';
import styles from './PlantPhotoUploadModal.module.css';

export interface PlantPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantId: string;
  permanentCode: string;
  hasExistingPhotos: boolean;
  onSuccessToast?: (msg: string) => void;
}

export const PlantPhotoUploadModal: React.FC<PlantPhotoUploadModalProps> = ({
  isOpen,
  onClose,
  plantId,
  permanentCode,
  hasExistingPhotos,
  onSuccessToast,
}) => {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [takenAt, setTakenAt] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [caption, setCaption] = useState<string>('');
  const [makePrimary, setMakePrimary] = useState<boolean>(!hasExistingPhotos);
  const [isNativeDetected, setIsNativeDetected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setTakenAt(new Date().toISOString().split('T')[0]);
    setCaption('');
    setMakePrimary(!hasExistingPhotos);
    setErrorMessage(null);
    setDiagnosticInfo(null);
  };

  const handleClose = () => {
    if (isUploading) return;
    resetForm();
    onClose();
  };

  // Helper for XHR upload fallback
  const uploadViaXHR = (formData: FormData): Promise<{ status: number; ok: boolean; responseText: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/photos/upload');
      xhr.timeout = 45000;

      xhr.onload = () => {
        resolve({
          status: xhr.status,
          ok: xhr.status >= 200 && xhr.status < 300,
          responseText: xhr.responseText,
        });
      };

      xhr.onerror = () => {
        reject(new Error(`XHR network error (status: ${xhr.status})`));
      };

      xhr.ontimeout = () => {
        reject(new Error('XHR request timed out after 45s'));
      };

      xhr.onabort = () => {
        reject(new Error('XHR request was aborted'));
      };

      xhr.send(formData);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile || isUploading) return;

    let stage: 'SUBMIT' | 'PROBE' | 'READ_FILE' | 'FORMDATA' | 'FETCH' | 'XHR' = 'SUBMIT';

    console.log('[PhotoUpload] submit-start', {
      hasSelectedFile: selectedFile !== null,
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      fileSize: selectedFile.size,
      isNative: isNativeDetected,
    });

    setIsUploading(true);
    setErrorMessage(null);
    setDiagnosticInfo(null);

    let uploadSucceeded = false;
    let successMessage = '';

    try {
      // 2. Pre-probe GET /api/photos/upload/probe
      stage = 'PROBE';
      console.log('[PhotoUpload] probe-start');
      try {
        const probeRes = await fetch('/api/photos/upload/probe');
        console.log('[PhotoUpload] probe-response', probeRes.status);
      } catch (probeErr: unknown) {
        console.warn('[PhotoUpload] probe-failed', probeErr);
      }

      // 3. Materialize and normalize File in memory before multipart (ATP-PHOTO-008)
      stage = 'READ_FILE';
      console.log('[PhotoUpload] read-file-start');
      const arrayBuffer = await selectedFile.arrayBuffer();
      console.log('[PhotoUpload] read-file-success', { byteLength: arrayBuffer.byteLength });

      const normalizedBlob = new Blob(
        [arrayBuffer],
        { type: selectedFile.type || 'application/octet-stream' }
      );

      const normalizedFile = new File(
        [normalizedBlob],
        selectedFile.name,
        {
          type: selectedFile.type || 'application/octet-stream',
          lastModified: Date.now(),
        }
      );

      // 4. Prepare FormData with normalized in-memory File
      stage = 'FORMDATA';
      const formData = new FormData();
      formData.append('file', normalizedFile, normalizedFile.name);
      formData.append('plantId', plantId);
      formData.append('permanentCode', permanentCode);
      if (takenAt) {
        formData.append('taken_at', takenAt);
      }
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }
      if (makePrimary) {
        formData.append('make_primary', 'true');
      }

      console.log('[PhotoUpload] multipart-ready');

      // 4. Primary attempt: fetch
      stage = 'FETCH';
      let fetchClientError: Error | null = null;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      try {
        console.log('[PhotoUpload] fetch-start (multipart)');
        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        console.log('[PhotoUpload] fetch-response', response.status);

        let data;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (response.ok && response.status === 201) {
          uploadSucceeded = true;
          successMessage = 'Fotografía guardada con éxito.';
        } else {
          console.error('[PlantPhotoUploadModal] Upload failed:', {
            status: response.status,
            statusText: response.statusText,
            data,
          });

          if (response.status === 413) {
            setErrorMessage('La imagen supera el tamaño máximo permitido (20 MB).');
          } else if (response.status === 415) {
            setErrorMessage('Formato de imagen no compatible. Usá archivos JPEG, PNG o WebP.');
          } else if (response.status === 422) {
            setErrorMessage('La imagen no pudo ser procesada. Verificá que el archivo no esté dañado.');
          } else if (response.status === 503) {
            setErrorMessage('El almacenamiento de fotografías no está disponible en este momento. Intentá más tarde.');
          } else if (data?.error?.message) {
            setErrorMessage(data.error.message);
          } else {
            setErrorMessage('No se pudo guardar la fotografía. Intentá nuevamente.');
          }
        }
      } catch (err: unknown) {
        clearTimeout(timeout);
        console.error('[PhotoUpload] fetch-error', err);
        fetchClientError = err instanceof Error ? err : new Error(String(err));
      }

      // 5. Fallback controlled XHR ONLY if fetch was initiated and threw a client exception
      if (!uploadSucceeded && fetchClientError) {
        stage = 'XHR';
        console.warn('[PhotoUpload] fetch threw client exception, attempting controlled XHR fallback...', fetchClientError);

        try {
          console.log('[PhotoUpload] xhr-start (multipart fallback)');
          const xhrResult = await uploadViaXHR(formData);
          console.log('[PhotoUpload] xhr-response', xhrResult.status);

          if (xhrResult.ok && xhrResult.status === 201) {
            uploadSucceeded = true;
            successMessage = 'Fotografía guardada con éxito (vía fallback).';
          } else {
            let xhrData: { error?: { message?: string } } | null = null;
            try {
              xhrData = JSON.parse(xhrResult.responseText);
            } catch {
              xhrData = null;
            }

            if (xhrResult.status === 413) {
              setErrorMessage('La imagen supera el tamaño máximo permitido (20 MB).');
            } else if (xhrResult.status === 415) {
              setErrorMessage('Formato de imagen no compatible. Usá archivos JPEG, PNG o WebP.');
            } else if (xhrResult.status === 422) {
              setErrorMessage('La imagen no pudo ser procesada. Verificá que el archivo no esté dañado.');
            } else if (xhrResult.status === 503) {
              setErrorMessage('El almacenamiento de fotografías no está disponible en este momento. Intentá más tarde.');
            } else if (xhrData?.error?.message) {
              setErrorMessage(xhrData.error.message);
            } else {
              setErrorMessage('No se pudo guardar la fotografía vía fallback. Intentá nuevamente.');
            }
          }
        } catch (xhrErr: unknown) {
          console.error('[PhotoUpload] xhr-error', xhrErr);
          const xErr = xhrErr as Error;

          // Both fetch and XHR failed: show comprehensive diagnostic info
          setErrorMessage('Fallo en la subida de fotografía.');
          setDiagnosticInfo(
            `PHOTO_CLIENT_STAGE_ERROR\n` +
            `stage: ${stage}\n` +
            `Fetch: [${fetchClientError.name}] ${fetchClientError.message}\n` +
            `XHR: [${xErr?.name || 'Error'}] ${xErr?.message || String(xErr)}\n` +
            `fileName: ${selectedFile.name}\n` +
            `fileType: ${selectedFile.type || '(empty string)'}\n` +
            `fileSize: ${selectedFile.size}\n` +
            `isNative: ${isNativeDetected}`
          );
        }
      }
    } catch (outerErr: unknown) {
      console.error('[PhotoUpload] outer-catch-error', outerErr);
      const oErr = outerErr as Error;
      setErrorMessage('Error preparando o enviando la fotografía.');
      setDiagnosticInfo(
        `PHOTO_CLIENT_STAGE_ERROR\n` +
        `stage: ${stage}\n` +
        `name: ${oErr?.name || 'Error'}\n` +
        `message: ${oErr?.message || String(oErr)}\n` +
        `fileName: ${selectedFile.name}\n` +
        `fileType: ${selectedFile.type || '(empty string)'}\n` +
        `fileSize: ${selectedFile.size}\n` +
        `isNative: ${isNativeDetected}`
      );
    } finally {
      console.log('[PhotoUpload] upload-finished');
      setIsUploading(false);
    }

    if (uploadSucceeded) {
      onSuccessToast?.(successMessage || 'Fotografía guardada con éxito.');
      resetForm();
      onClose();
      router.refresh();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Registrar Fotografía de Evolución"
        description={`Subí una nueva foto para el ejemplar ${permanentCode} para registrar su desarrollo.`}
        footer={
          <>
            <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
              Cancelar
            </Button>
            <Button
              form="plant-photo-upload-form"
              type="submit"
              variant="primary"
              isLoading={isUploading}
              disabled={isUploading || !selectedFile}
              leftIcon={<CheckCircle2 size={16} />}
            >
              {isUploading ? 'Guardando...' : 'Guardar Foto'}
            </Button>
          </>
        }
      >
        <form id="plant-photo-upload-form" onSubmit={handleSubmit} className={styles.form}>
          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              <div>{errorMessage}</div>
              {diagnosticInfo && (
                <div className={styles.diagnosticBox} data-testid="upload-diagnostic-info">
                  {diagnosticInfo}
                </div>
              )}
            </div>
          )}

          <div className={styles.fieldGroup}>
            <PhotoUpload
              onFileSelect={(file) => {
                setSelectedFile(file);
                if (file && errorMessage) setErrorMessage(null);
              }}
              onNativeDetected={setIsNativeDetected}
              disabled={isUploading}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="photo-taken-at" className={styles.label}>
              <Calendar size={15} aria-hidden="true" />
              <span>Fecha de la toma</span>
            </label>
            <input
              id="photo-taken-at"
              name="taken_at"
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className={styles.input}
              disabled={isUploading}
            />
            <span className={styles.hint}>
              Podés registrar la fecha real en que fue tomada la fotografía.
            </span>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="photo-caption" className={styles.label}>
              <FileText size={15} aria-hidden="true" />
              <span>Nota u observación breve (opcional)</span>
            </label>
            <textarea
              id="photo-caption"
              name="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ej: Trasplante a maceta de 15cm, brote nuevo de primavera, etc."
              maxLength={300}
              className={styles.textarea}
              disabled={isUploading}
            />
          </div>

          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={makePrimary}
              onChange={(e) => setMakePrimary(e.target.checked)}
              className={styles.checkbox}
              disabled={isUploading}
            />
            <span className={styles.checkboxLabel}>
              Establecer como fotografía principal de la planta
            </span>
          </label>
        </form>
      </Modal>
    </>
  );
};
