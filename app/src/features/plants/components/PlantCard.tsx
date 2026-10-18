import React from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { HealthBadge } from '@/components/ui';
import { PlantEntity } from '@/core/domain/entities';
import { PlantThumbnail } from './PlantThumbnail';
import styles from './PlantCard.module.css';

export interface PlantCardProps {
  plant: PlantEntity;
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant }) => {
  const hasLocation = Boolean(plant.location?.name);
  const primaryPhoto = plant.photos?.find((p) => p.is_primary) || plant.photos?.[0];

  const refCare = plant.reference?.reference_care as Record<string, unknown> | undefined;
  const lightSnippet =
    plant.profile?.light_conditions ||
    (typeof refCare?.sunlight === 'string' ? refCare.sunlight : null);
  const waterSnippet =
    plant.profile?.watering_notes ||
    (typeof refCare?.watering === 'string' ? refCare.watering : null);
  const tipSnippet =
    plant.notes ||
    plant.profile?.substrate_info ||
    (typeof refCare?.soil === 'string' ? refCare.soil : null);
  const needsAttention =
    plant.health_status === 'ATTENTION' || plant.health_status === 'RECOVERY';

  return (
    <article className={styles.card} aria-label={`Planta ${plant.permanent_code}: ${plant.common_name}`}>
      <Link
        href={`/plants/${plant.permanent_code}`}
        className={styles.linkWrapper}
        aria-label={`Ver ficha de ${plant.common_name} (${plant.permanent_code})`}
      >
        <div className={styles.imageContainer}>
          <PlantThumbnail
            photoPath={primaryPhoto?.file_path}
            plantName={plant.common_name}
            size="lg"
            className={styles.thumbnail}
          />
        </div>

        <div className={styles.content}>
          <div className={styles.metaRow}>
            <span className={styles.permanentCode}>{plant.permanent_code}</span>
            <HealthBadge status={plant.health_status} size="sm" />
          </div>

          <h2 className={styles.commonName}>{plant.common_name}</h2>

          {plant.scientific_name && (
            <p className={styles.scientificName}>{plant.scientific_name}</p>
          )}

          {plant.cultivar && (
            <p className={styles.cultivar}>
              <span className={styles.cultivarLabel}>Cultivar:</span> {plant.cultivar}
            </p>
          )}

          {(lightSnippet || waterSnippet || tipSnippet) && (
            <div className={styles.careSnippets}>
              {lightSnippet && (
                <div className={styles.careRow}>
                  <span className={styles.careLabel}>☀️ Luz:</span>{' '}
                  <span className={styles.careText}>{lightSnippet}</span>
                </div>
              )}
              {waterSnippet && (
                <div className={styles.careRow}>
                  <span className={styles.careLabel}>💧 Riego:</span>{' '}
                  <span className={styles.careText}>{waterSnippet}</span>
                </div>
              )}
              {tipSnippet && (
                <div className={styles.careRow}>
                  <span className={styles.careLabel}>🌱 Tip:</span>{' '}
                  <span className={styles.careText}>{tipSnippet}</span>
                </div>
              )}
            </div>
          )}

          {needsAttention && (
            <div className={styles.ojoBadge}>
              <span aria-hidden="true">⚠️</span>
              <span>
                {plant.health_status === 'ATTENTION'
                  ? 'Ojo: Revisar humedad y hojas'
                  : 'En recuperación activa'}
              </span>
            </div>
          )}

          <div className={styles.footer}>
            <div className={hasLocation ? styles.location : styles.noLocation}>
              <MapPin size={13} className={styles.locationIcon} aria-hidden="true" />
              <span>{hasLocation ? plant.location?.name : 'Sin ubicación'}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};


