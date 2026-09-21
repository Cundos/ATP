'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  HelpCircle,
} from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import {
  PlantIdentificationCandidate,
  PlantIdentificationResult,
} from '@/core/domain/entities/PlantIdentification';
import styles from './AiPlantIdentifier.module.css';

export interface AiPlantIdentificationApplyPayload {
  scientificName: string;
  commonName: string;
  confidence: number;
  photoFile: File;
  rawCandidate?: PlantIdentificationCandidate | null;
}

export interface AiPlantIdentifierProps {
  onApply: (payload: AiPlantIdentificationApplyPayload) => void;
  disabled?: boolean;
}

export const AiPlantIdentifier: React.FC<AiPlantIdentifierProps> = ({
  onApply,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedPhoto, setAnalyzedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<PlantIdentificationResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] =
    useState<PlantIdentificationCandidate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setAnalyzedPhoto(null);
    setResult(null);
    setSelectedCandidate(null);
    setErrorMessage(null);
    setIsAnalyzing(false);
  }, [previewUrl]);

  const handleClose = () => {
    resetState();
    setIsOpen(false);
  };

  const analyzeImageFile = async (file: File) => {
    setErrorMessage(null);
    setAnalyzedPhoto(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsAnalyzing(true);
    setIsOpen(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/integrations/ai/identify', {
        method: 'POST',
        body: formData,
      });

      const data: PlantIdentificationResult = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(
          data.error ||
            'No se pudo completar la identificación con IA. Revisá la conexión o la clave de API.'
        );
        setResult(null);
        return;
      }

      setResult(data);
      if (data.primaryCandidate) {
        setSelectedCandidate(data.primaryCandidate);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al conectar con la IA.';
      setErrorMessage(msg);
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      analyzeImageFile(files[0]);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleNativeCamera = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Camera, CameraResultType, CameraSource } = await import(
          '@capacitor/camera'
        );
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
          quality: 85,
          allowEditing: false,
        });

        if (photo.webPath) {
          const res = await fetch(photo.webPath);
          const blob = await res.blob();
          const file = new File([blob], `ai-scan-${Date.now()}.jpg`, {
            type: blob.type || 'image/jpeg',
          });
          analyzeImageFile(file);
          return;
        }
      }
    } catch {
      // Fallback to web camera input
    }
    cameraInputRef.current?.click();
  };

  const handleNativeGallery = async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Camera, CameraResultType, CameraSource } = await import(
          '@capacitor/camera'
        );
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: CameraSource.Photos,
          quality: 85,
          allowEditing: false,
        });

        if (photo.webPath) {
          const res = await fetch(photo.webPath);
          const blob = await res.blob();
          const file = new File([blob], `ai-gallery-${Date.now()}.jpg`, {
            type: blob.type || 'image/jpeg',
          });
          analyzeImageFile(file);
          return;
        }
      }
    } catch {
      // Fallback to web gallery input
    }
    galleryInputRef.current?.click();
  };

  const handleApply = () => {
    if (!selectedCandidate || !analyzedPhoto) return;

    onApply({
      scientificName: selectedCandidate.scientificName,
      commonName: selectedCandidate.commonName,
      confidence: selectedCandidate.confidence,
      photoFile: analyzedPhoto,
      rawCandidate: selectedCandidate,
    });

    handleClose();
  };

  return (
    <div className={styles.container}>
      {/* Hidden file inputs for web browser */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className={styles.hiddenInput}
        aria-label="Subir foto para identificación con IA"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className={styles.hiddenInput}
        aria-label="Tomar foto con la cámara para identificación con IA"
      />

      <Button
        type="button"
        size="md"
        fullWidth
        disabled={disabled}
        onClick={handleNativeCamera}
        leftIcon={<Sparkles size={18} />}
        className={styles.triggerButton}
      >
        Identificar Planta con Foto (IA)
      </Button>

      {/* Modal Dialog for Results and Loading */}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Identificación Botánica con IA"
        description="Gemini Vision analiza la foto para sugerir la especie botánica."
      >
        <div className={styles.modalBody}>
          {/* Loading State */}
          {isAnalyzing && (
            <div className={styles.loadingContainer}>
              <Loader2 size={36} className={styles.spinner} />
              <div>
                <p className={styles.loadingTitle}>Analizando especie botánica...</p>
                <p className={styles.loadingSubtext}>
                  Consultando Google Gemini para reconocer la planta y sus características.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {errorMessage && !isAnalyzing && (
            <div className={styles.errorBox} role="alert">
              <AlertCircle size={20} />
              <div>
                <strong>Error en la identificación</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Non-Plant Result State */}
          {result && !result.isPlant && !isAnalyzing && !errorMessage && (
            <div className={styles.notPlantBox}>
              <HelpCircle size={36} color="var(--color-text-muted, #94a3b8)" />
              <p className={styles.loadingTitle}>No se reconoció una planta</p>
              <p className={styles.loadingSubtext}>
                {result.notes ||
                  'La imagen no parece mostrar hojas, flores o vegetación reconocible. Probá tomando una foto más cercana y enfocada.'}
              </p>
            </div>
          )}

          {/* Successful Identification Result */}
          {result && result.isPlant && selectedCandidate && !isAnalyzing && (
            <div className={styles.resultCard}>
              <div className={styles.resultHeader}>
                <span className={styles.badgeAi}>
                  <Sparkles size={14} /> Gemini Vision
                </span>
                <span
                  className={`${styles.confidenceBadge} ${
                    selectedCandidate.confidence < 0.6
                      ? styles.confidenceBadgeLow
                      : selectedCandidate.confidence < 0.85
                      ? styles.confidenceBadgeMedium
                      : ''
                  }`}
                >
                  Certeza: {Math.round(selectedCandidate.confidence * 100)}%
                </span>
              </div>

              <div className={styles.resultContent}>
                {previewUrl && (
                  <div className={styles.resultImageContainer}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Foto analizada"
                      className={styles.resultImage}
                    />
                  </div>
                )}

                <div className={styles.resultDetails}>
                  <h3 className={styles.scientificName}>
                    {selectedCandidate.scientificName}
                  </h3>
                  <p className={styles.commonName}>
                    {selectedCandidate.commonName}
                  </p>
                  {selectedCandidate.family && (
                    <p className={styles.family}>
                      Familia: {selectedCandidate.family}
                    </p>
                  )}
                  {selectedCandidate.description && (
                    <p className={styles.description}>
                      {selectedCandidate.description}
                    </p>
                  )}
                </div>
              </div>

              {selectedCandidate.healthObservation && (
                <div className={styles.healthBox}>
                  <strong>Aspecto visual:</strong>
                  <span>{selectedCandidate.healthObservation}</span>
                </div>
              )}

              {/* Alternative species if any */}
              {result.alternativeCandidates &&
                result.alternativeCandidates.length > 0 && (
                  <div className={styles.alternativesSection}>
                    <p className={styles.alternativesTitle}>
                      Otras especies parecidas detectadas:
                    </p>
                    {result.alternativeCandidates.map((alt, idx) => (
                      <div
                        key={idx}
                        className={styles.alternativeItem}
                        onClick={() => setSelectedCandidate(alt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setSelectedCandidate(alt);
                        }}
                      >
                        <div>
                          <strong>{alt.scientificName}</strong> ({alt.commonName})
                        </div>
                        <span>{Math.round(alt.confidence * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Action buttons inside modal */}
          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              leftIcon={<X size={14} />}
            >
              Cerrar
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleNativeCamera}
              leftIcon={<RefreshCw size={14} />}
            >
              Otra foto
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleNativeGallery}
              leftIcon={<ImageIcon size={14} />}
            >
              De galería
            </Button>

            {result?.isPlant && selectedCandidate && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApply}
                leftIcon={<Check size={14} />}
              >
                Aplicar al formulario
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
