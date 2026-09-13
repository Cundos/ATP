'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './PhotoUpload.module.css';

export interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  onFileSelect?: (file: File | null) => void;
  disabled?: boolean;
  name?: string;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentPhotoUrl,
  onFileSelect,
  disabled = false,
  name = 'photo',
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  // Cleanup object URL on change or unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientError(null);
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    // Client-side MIME validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setClientError('Formato no compatible. Usá archivos JPEG, PNG o WebP.');
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    // Client-side size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError('La imagen supera el límite máximo de 20 MB.');
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleRemoveSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setClientError(null);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  const handleTriggerGallery = () => {
    if (!disabled && galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const handleTriggerCamera = () => {
    if (!disabled && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const activeDisplayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <Camera size={16} aria-hidden="true" />
        <span>Fotografía del ejemplar {currentPhotoUrl ? '(opcional para reemplazar)' : '(opcional)'}</span>
      </label>

      {/* Hidden gallery file input (without capture attribute) */}
      <input
        ref={galleryInputRef}
        id="plant-photo-gallery-input"
        data-testid="photo-gallery-input"
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        onChange={handleFileChange}
        className={styles.hiddenInput}
        aria-label="Elegir fotografía de galería o archivos"
      />

      {/* Hidden camera file input (with capture environment attribute) */}
      <input
        ref={cameraInputRef}
        id="plant-photo-camera-input"
        data-testid="photo-camera-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        disabled={disabled}
        onChange={handleFileChange}
        className={styles.hiddenInput}
        aria-label="Tomar fotografía con la cámara"
      />

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
          onClick={handleTriggerGallery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTriggerGallery();
            }
          }}
          className={styles.placeholderBox}
          aria-label="Elegir fotografía de la galería o archivos"
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
          disabled={disabled}
          onClick={handleTriggerGallery}
          leftIcon={<ImageIcon size={15} />}
        >
          Elegir de galería
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={handleTriggerCamera}
          leftIcon={<Camera size={15} />}
        >
          Tomar foto
        </Button>

        {selectedFile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
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
    </div>
  );
};
