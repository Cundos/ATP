import React from 'react';
import { Sprout } from 'lucide-react';
import styles from './PlantThumbnail.module.css';

export interface PlantThumbnailProps {
  photoPath?: string | null;
  plantName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PlantThumbnail: React.FC<PlantThumbnailProps> = ({
  photoPath,
  plantName,
  size = 'md',
  className = '',
}) => {
  const photoUrl = photoPath ? `/api/photos/view/${photoPath.replace(/^\/+/, '')}` : null;
  const iconSize = size === 'sm' ? 24 : size === 'md' ? 32 : 48;

  return (
    <div className={`${styles.thumbnailContainer} ${styles[size]} ${className}`}>
      {photoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photoUrl}
          alt={`Foto principal de ${plantName}`}
          className={styles.image}
          loading="lazy"
        />
      ) : (
        <div className={styles.placeholder} aria-hidden="true">
          <Sprout size={iconSize} className={styles.placeholderIcon} />
        </div>
      )}
    </div>
  );
};
