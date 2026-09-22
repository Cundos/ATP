'use client';

import React, { useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import styles from './PhotoUpload.module.css';

export interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  onFileSelect?: (file: File | null) => void;
  onNativeDetected?: (isNative: boolean) => void;
  disabled?: boolean;
  name?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentPhotoUrl,
  onFileSelect,
  onNativeDetected,
  disabled = false,
  name = 'photo',
}) => {
  const {
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
  } = usePhotoPicker({
    onFileSelect,
    disabled,
  });

  React.useEffect(() => {
    onNativeDetected?.(isNative);
  }, [isNative, onNativeDetected]);

  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState<boolean>(false);

  const activeDisplayUrl = previewUrl || currentPhotoUrl;

  const handlePlaceholderClick = () => {
    if (disabled || isLoading) return;
    if (isNative) {
      setIsChoiceModalOpen(true);
    } else {
      handleTriggerGallery();
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <Camera size={16} aria-hidden="true" />
        <span>Fotografía del ejemplar {currentPhotoUrl ? '(opcional para reemplazar)' : '(opcional)'}</span>
      </label>

      {/* Hidden file inputs are ONLY rendered for real browser web fallback, never in native app */}
      {!isNative && (
        <>
          <input
            ref={galleryInputRef}
            id="plant-photo-gallery-input"
            data-testid="photo-gallery-input"
            name={name}
            type="file"
            accept="image/*,.heic,.heif"
            disabled={disabled || isLoading}
            onChange={handleFileChange}
            className={styles.hiddenInput}
            aria-label="Elegir fotografía de galería o archivos"
          />

          <input
            ref={cameraInputRef}
            id="plant-photo-camera-input"
            data-testid="photo-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled || isLoading}
            onChange={handleFileChange}
            className={styles.hiddenInput}
            aria-label="Tomar fotografía con la cámara"
          />
        </>
      )}

      {activeDisplayUrl ? (
        <div className={styles.previewContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeDisplayUrl}
            alt={previewUrl ? 'Vista previa de la fotografía seleccionada' : 'Fotografía principal actual'}
            className={styles.previewImage}
          />
          {previewUrl && (
            <span className={styles.badgeOverlay}>Nueva foto</span>
          )}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={handlePlaceholderClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlePlaceholderClick();
            }
          }}
          className={styles.placeholderBox}
          aria-label="Agregar fotografía al ejemplar"
        >
          <Camera size={32} className={styles.placeholderIcon} aria-hidden="true" />
          <span className={styles.placeholderText}>Elegí una foto de galería o tomá una nueva</span>
          <span className={styles.placeholderSubtext}>JPEG, PNG o WebP (hasta 20 MB)</span>
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actionsRow}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || isLoading}
          onClick={handleTriggerGallery}
          leftIcon={<ImageIcon size={15} />}
        >
          Elegir de galería
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || isLoading}
          onClick={handleTriggerCamera}
          leftIcon={<Camera size={15} />}
        >
          {isLoading ? 'Abriendo cámara...' : 'Tomar foto'}
        </Button>

        {selectedFile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isLoading}
            onClick={handleRemoveSelection}
            leftIcon={<X size={15} />}
          >
            Quitar selección
          </Button>
        )}
      </div>

      {clientError && (
        <p className={styles.errorMessage} role="alert">
          {clientError}
        </p>
      )}

      {/* Native Photo Source Choice Modal / Action Sheet */}
      <Modal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        title="Agregar fotografía"
        description="Elegí de dónde querés obtener la imagen para este ejemplar."
      >
        <div className={styles.choiceModalContent}>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            leftIcon={<Camera size={20} />}
            onClick={() => {
              setIsChoiceModalOpen(false);
              handleTriggerCamera();
            }}
            className={styles.choiceOptionBtn}
          >
            Tomar foto
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            leftIcon={<ImageIcon size={20} />}
            onClick={() => {
              setIsChoiceModalOpen(false);
              handleTriggerGallery();
            }}
            className={styles.choiceOptionBtn}
          >
            Elegir de galería
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => setIsChoiceModalOpen(false)}
            className={styles.choiceCancelBtn}
          >
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  );
};
