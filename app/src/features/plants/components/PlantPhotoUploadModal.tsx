'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { PhotoUpload } from './PhotoUpload';
import { addPlantPhotoAction } from '../actions';
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
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [takenAt, setTakenAt] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [caption, setCaption] = useState<string>('');
  const [makePrimary, setMakePrimary] = useState<boolean>(!hasExistingPhotos);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setTakenAt(new Date().toISOString().split('T')[0]);
    setCaption('');
    setMakePrimary(!hasExistingPhotos);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isPending) return;
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Por favor seleccioná una fotografía para subir.');
      return;
    }

    setErrorMessage(null);
    const formData = new FormData();
    formData.append('photo', selectedFile);
    if (takenAt) {
      formData.append('taken_at', takenAt);
    }
    if (caption.trim()) {
      formData.append('caption', caption.trim());
    }
    if (makePrimary) {
      formData.append('make_primary', 'true');
    }

    startTransition(async () => {
      const result = await addPlantPhotoAction(plantId, null, formData);
      if (result.success) {
        onSuccessToast?.(result.message || 'Fotografía guardada con éxito.');
        handleClose();
        router.refresh();
      } else {
        setErrorMessage(result.message || 'No se pudo guardar la fotografía.');
      }
    });
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
            <Button variant="ghost" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={isPending}
              disabled={isPending || !selectedFile}
              leftIcon={<CheckCircle2 size={16} />}
            >
              {isPending ? 'Guardando...' : 'Guardar Foto'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className={styles.form}>
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
              disabled={isPending}
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
              disabled={isPending}
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
              disabled={isPending}
            />
          </div>

          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={makePrimary}
              onChange={(e) => setMakePrimary(e.target.checked)}
              className={styles.checkbox}
              disabled={isPending}
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
