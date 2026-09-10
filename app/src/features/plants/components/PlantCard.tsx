import React from 'react';
import Link from 'next/link';
import { MapPin, Tag } from 'lucide-react';
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

  return (
    <article className={styles.card} aria-label={`Planta ${plant.permanent_code}: ${plant.common_name}`}>
      <Link
        href={`/plants/${plant.permanent_code}`}
        className={styles.linkWrapper}
        aria-label={`Ver ficha de ${plant.common_name} (${plant.permanent_code})`}
      >
        <div className={styles.header}>
          <span className={styles.permanentCode}>
            <Tag size={14} className={styles.codeIcon} aria-hidden="true" />
            {plant.permanent_code}
          </span>
          <HealthBadge status={plant.health_status} size="sm" />
        </div>

        <div className={styles.bodyRow}>
          <PlantThumbnail
            photoPath={primaryPhoto?.file_path}
            plantName={plant.common_name}
            size="md"
            className={styles.thumbnail}
          />
          <div className={styles.mainInfo}>
            <h2 className={styles.commonName}>{plant.common_name}</h2>
            {plant.scientific_name && (
              <p className={styles.scientificName}>{plant.scientific_name}</p>
            )}
            {plant.cultivar && (
              <p className={styles.cultivar}>
                <span className={styles.cultivarLabel}>Cultivar:</span> {plant.cultivar}
              </p>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={hasLocation ? styles.location : styles.noLocation}>
            <MapPin size={14} className={styles.locationIcon} aria-hidden="true" />
            <span>{hasLocation ? plant.location?.name : 'Sin ubicación'}</span>
          </div>
        </div>
      </Link>
    </article>
  );
};
