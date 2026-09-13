'use client';

import React, { useState } from 'react';
import {
  History,
  Plus,
  SplitSquareHorizontal,
  Calendar,
  Star,
  Check,
  Camera,
} from 'lucide-react';
import { PhotoEntity } from '@/core/domain/entities';
import { formatPhotoDate, sortPhotosChronologically } from '@/core/domain/services';
import { Button, Toast } from '@/components/ui';
import { PlantPhotoUploadModal } from './PlantPhotoUploadModal';
import { PlantPhotoLightboxModal } from './PlantPhotoLightboxModal';
import { PlantPhotoComparisonModal } from './PlantPhotoComparisonModal';
import styles from './PlantPhotoTimeline.module.css';

export interface PlantPhotoTimelineProps {
  plantId: string;
  permanentCode: string;
  photos?: PhotoEntity[];
}

export const PlantPhotoTimeline: React.FC<PlantPhotoTimelineProps> = ({
  plantId,
  permanentCode,
  photos = [],
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPhotoForLightbox, setSelectedPhotoForLightbox] = useState<PhotoEntity | null>(null);

  // Comparison state
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  // Sort photos chronologically (descending: newest first)
  const sortedPhotos = sortPhotosChronologically(photos, 'desc');
  const hasPhotos = sortedPhotos.length > 0;

  const toggleComparisonMode = () => {
    if (isComparisonMode) {
      setIsComparisonMode(false);
      setSelectedForComparison([]);
    } else {
      setIsComparisonMode(true);
      setSelectedForComparison([]);
    }
  };

  const handlePhotoClick = (photo: PhotoEntity) => {
    if (isComparisonMode) {
      handleTogglePhotoSelection(photo.id);
    } else {
      setSelectedPhotoForLightbox(photo);
    }
  };

  const handleTogglePhotoSelection = (photoId: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      }
      if (prev.length >= 2) {
        // Replace second selection with the new one
        return [prev[0], photoId];
      }
      return [...prev, photoId];
    });
  };

  const handleOpenComparison = () => {
    if (selectedForComparison.length === 2) {
      setIsComparisonModalOpen(true);
    }
  };

  const comparisonPhotos: [PhotoEntity, PhotoEntity] | null =
    selectedForComparison.length === 2
      ? ([
          sortedPhotos.find((p) => p.id === selectedForComparison[0])!,
          sortedPhotos.find((p) => p.id === selectedForComparison[1])!,
        ] as [PhotoEntity, PhotoEntity])
      : null;

  return (
    <section
      className={styles.sectionCard}
      aria-labelledby="section-evolution-title"
      data-testid="section-evolution"
    >
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h2 id="section-evolution-title" className={styles.sectionTitle}>
            <History size={18} aria-hidden="true" />
            <span>Evolución visual</span>
          </h2>
          {hasPhotos && (
            <span className={styles.countBadge} aria-label={`${sortedPhotos.length} fotos`}>
              {sortedPhotos.length}
            </span>
          )}
        </div>

        <div className={styles.headerActions}>
          {hasPhotos && sortedPhotos.length >= 2 && (
            <Button
              variant={isComparisonMode ? 'primary' : 'secondary'}
              size="sm"
              onClick={toggleComparisonMode}
              leftIcon={<SplitSquareHorizontal size={15} />}
              data-testid="toggle-comparison-btn"
            >
              {isComparisonMode ? 'Salir de Comparar' : 'Comparar fotos'}
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Plus size={15} />}
            data-testid="add-evolution-photo-btn"
          >
            Agregar foto
          </Button>
        </div>
      </div>

      {/* Comparison Toolbar */}
      {isComparisonMode && (
        <div className={styles.comparisonBar} role="region" aria-label="Barra de comparación de fotos">
          <div className={styles.comparisonHint}>
            <span>Seleccioná 2 fotografías para comparar:</span>
            <span className={styles.comparisonCounter}>
              {selectedForComparison.length} / 2 seleccionadas
            </span>
          </div>

          <div className={styles.comparisonActions}>
            <Button
              variant="primary"
              size="sm"
              disabled={selectedForComparison.length !== 2}
              onClick={handleOpenComparison}
              leftIcon={<SplitSquareHorizontal size={15} />}
              data-testid="execute-comparison-btn"
            >
              Comparar seleccionadas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedForComparison([])}
              disabled={selectedForComparison.length === 0}
            >
              Limpiar selección
            </Button>
          </div>
        </div>
      )}

      {/* Timeline Grid or Empty State */}
      {hasPhotos ? (
        <div className={styles.timelineGrid}>
          {sortedPhotos.map((photo) => {
            const isSelected = selectedForComparison.includes(photo.id);
            const photoUrl = `/api/photos/view/${photo.file_path.replace(/^\/+/, '')}`;
            const formattedDate = formatPhotoDate(photo);

            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => handlePhotoClick(photo)}
                className={`${styles.photoCard} ${isSelected ? styles.photoCardSelected : ''}`}
                aria-label={`Foto del ${formattedDate}${photo.is_primary ? ' (Principal)' : ''}${photo.caption ? `: ${photo.caption}` : ''}`}
                data-testid={`photo-timeline-card-${photo.id}`}
              >
                <div className={styles.thumbnailWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={photo.caption || `Registro de ${formattedDate}`}
                    className={styles.thumbnailImage}
                    loading="lazy"
                  />
                  {photo.is_primary && (
                    <span className={styles.primaryBadge} data-testid="primary-photo-badge">
                      <Star size={11} fill="currentColor" aria-hidden="true" />
                      Foto principal
                    </span>
                  )}
                  {isComparisonMode && (
                    <span
                      className={`${styles.checkboxOverlay} ${
                        isSelected ? styles.checkboxOverlaySelected : ''
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.dateRow}>
                    <Calendar size={13} aria-hidden="true" />
                    <span>{formattedDate}</span>
                  </div>
                  {photo.caption && (
                    <p className={styles.captionSnippet} title={photo.caption}>
                      {photo.caption}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState} data-testid="photo-timeline-empty">
          <Camera size={32} className={styles.emptyIcon} aria-hidden="true" />
          <h3 className={styles.emptyTitle}>Todavía no hay fotografías históricas.</h3>
          <p className={styles.emptyText}>
            Registrá la evolución de tu ejemplar a lo largo del tiempo agregando nuevas fotos en cada etapa de su desarrollo.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Plus size={15} />}
          >
            Agregar primera foto
          </Button>
        </div>
      )}

      {/* Modales */}
      <PlantPhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        plantId={plantId}
        permanentCode={permanentCode}
        hasExistingPhotos={hasPhotos}
        onSuccessToast={(msg) => setToastMessage(msg)}
      />

      <PlantPhotoLightboxModal
        photo={selectedPhotoForLightbox}
        isOpen={Boolean(selectedPhotoForLightbox)}
        onClose={() => setSelectedPhotoForLightbox(null)}
        plantId={plantId}
        permanentCode={permanentCode}
        totalPhotosCount={sortedPhotos.length}
        onSuccessToast={(msg) => setToastMessage(msg)}
      />

      <PlantPhotoComparisonModal
        photos={comparisonPhotos}
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        permanentCode={permanentCode}
      />

      {toastMessage && (
        <Toast
          type="success"
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </section>
  );
};
