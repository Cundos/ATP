'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { PhotoEntity } from '@/core/domain/entities';
import { formatPhotoDate, sortPhotosChronologically } from '@/core/domain/services';
import { Modal, Button } from '@/components/ui';
import styles from './PlantPhotoComparisonModal.module.css';

export interface PlantPhotoComparisonModalProps {
  photos: [PhotoEntity, PhotoEntity] | null;
  isOpen: boolean;
  onClose: () => void;
  permanentCode: string;
}

export const PlantPhotoComparisonModal: React.FC<PlantPhotoComparisonModalProps> = ({
  photos,
  isOpen,
  onClose,
  permanentCode,
}) => {
  if (!photos || photos.length !== 2) return null;

  // Sort photos chronologically ascending (older on left, newer on right) for evolution comparison
  const sorted = sortPhotosChronologically(photos, 'asc');
  const [photoA, photoB] = sorted;

  const urlA = `/api/photos/view/${photoA.file_path.replace(/^\/+/, '')}`;
  const urlB = `/api/photos/view/${photoB.file_path.replace(/^\/+/, '')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Comparación de Evolución — ${permanentCode}`}
      description="Compará el desarrollo del ejemplar entre dos fechas registradas."
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cerrar Comparación
        </Button>
      }
    >
      <div className={styles.comparisonGrid}>
        {/* Foto A (Anterior) */}
        <div className={styles.photoCard}>
          <div className={styles.cardHeader}>
            <span className={styles.photoLabel}>Registro Anterior</span>
            <span className={styles.dateBadge}>
              <Calendar size={13} aria-hidden="true" />
              {formatPhotoDate(photoA)}
            </span>
          </div>
          <div className={styles.imageContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlA}
              alt={photoA.caption || `Registro de ${formatPhotoDate(photoA)}`}
              className={styles.image}
            />
          </div>
          {photoA.caption ? (
            <p className={styles.caption}>{photoA.caption}</p>
          ) : (
            <p className={styles.noCaption}>Sin notas registradas</p>
          )}
        </div>

        {/* Foto B (Posterior) */}
        <div className={styles.photoCard}>
          <div className={styles.cardHeader}>
            <span className={styles.photoLabel}>Registro Posterior</span>
            <span className={styles.dateBadge}>
              <Calendar size={13} aria-hidden="true" />
              {formatPhotoDate(photoB)}
            </span>
          </div>
          <div className={styles.imageContainer}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlB}
              alt={photoB.caption || `Registro de ${formatPhotoDate(photoB)}`}
              className={styles.image}
            />
          </div>
          {photoB.caption ? (
            <p className={styles.caption}>{photoB.caption}</p>
          ) : (
            <p className={styles.noCaption}>Sin notas registradas</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
