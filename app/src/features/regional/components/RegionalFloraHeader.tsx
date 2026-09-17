import React from 'react';
import { MapPin, Globe } from 'lucide-react';
import { GrowingRegionEntity, EcologicalRegionEntity } from '@/core/domain/entities';
import { MONTH_FULL_NAMES } from '../utils/floraFormatters';
import styles from './RegionalFloraHeader.module.css';

export interface RegionalFloraHeaderProps {
  month: number;
  growingRegion?: GrowingRegionEntity | null;
  primaryEcologicalRegion?: EcologicalRegionEntity | null;
}

export const RegionalFloraHeader: React.FC<RegionalFloraHeaderProps> = ({
  month,
  growingRegion,
  primaryEcologicalRegion,
}) => {
  const monthName = MONTH_FULL_NAMES[month] || 'Mes actual';

  const localityParts = [
    growingRegion?.locality || 'Arroyito',
    growingRegion?.province || 'Córdoba',
    growingRegion?.country || 'Argentina',
  ].filter(Boolean);
  const locationSubtitle = localityParts.join(' · ');

  // Ecorregión real si existe; sin fallbacks inventados
  const ecoregionName =
    primaryEcologicalRegion?.name ||
    growingRegion?.ecological_regions?.[0]?.ecological_region?.name ||
    null;

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <span className={styles.regionBadge}>
          <MapPin size={12} aria-hidden="true" />
          {growingRegion?.code || 'ARROYITO_CBA'}
        </span>
        {ecoregionName && (
          <span className={styles.ecoregionBadge}>
            <Globe size={12} aria-hidden="true" style={{ marginRight: 4 }} />
            Ecorregión: {ecoregionName}
          </span>
        )}
      </div>

      <h1 className={styles.title}>{monthName} en tu región</h1>
      <p className={styles.subtitle}>{locationSubtitle}</p>
    </header>
  );
};
