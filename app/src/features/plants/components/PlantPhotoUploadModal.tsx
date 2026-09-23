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

  const resetForm = () => {
    setSelectedFile(null);
    setTakenAt(new Date().toISOString().split('T')[0]);
    setCaption('');
    setMakePrimary(!hasExistingPhotos);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isUploading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile || isUploading) return;

    console.log('[PhotoUpload] submit-start', {
      hasSelectedFile: selectedFile !== null,
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      fileSize: selectedFile.size,
      isNative: isNativeDetected,
    });

    setIsUploading(true);
    setErrorMessage(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
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

      console.log('[PhotoUpload] fetch-start');

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
        onSuccessToast?.('Fotografía guardada con éxito.');
        handleClose();
        router.refresh();
        return;
      }

      console.error('[PlantPhotoUploadModal] Upload failed:', {
        status: response.status,
        statusText: response.statusText,
        data,
      });

      // Map explicit HTTP error statuses to user-friendly messages in Spanish
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
    } catch (err: unknown) {
      clearTimeout(timeout);
      console.error('[PhotoUpload] fetch-error', err);

      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMessage('La subida tardó demasiado y fue cancelada. Intentá nuevamente.');
      } else {
        setErrorMessage('Error de conexión al subir la imagen. Verificá tu red e intentá nuevamente.');
      }
    } finally {
      console.log('[PhotoUpload] upload-finished');
      setIsUploading(false);
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
              {errorMessage}
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
