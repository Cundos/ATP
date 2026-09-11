'use client';

import React, { useState } from 'react';
import styles from './BotanicalReferenceSection.module.css';

export interface ReferenceBotanicalImageProps {
  imageUrl: string;
  scientificName: string;
}

/**
 * Minimal Client Component for botanical reference thumbnail with onError fallback.
 * Strictly receives ONLY imageUrl and scientificName (0 internal IDs or raw data).
 */
export const ReferenceBotanicalImage: React.FC<ReferenceBotanicalImageProps> = ({
  imageUrl,
  scientificName,
}) => {
  const [imageError, setImageError] = useState(false);

  if (imageError || !imageUrl) {
    return null;
  }

  return (
    <div className={styles.referenceImageWrapper}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={`Referencia botánica para ${scientificName}`}
        className={styles.referenceImage}
        onError={() => setImageError(true)}
        loading="lazy"
      />
      <span className={styles.imageCaption}>Imagen de referencia botánica</span>
    </div>
  );
};
