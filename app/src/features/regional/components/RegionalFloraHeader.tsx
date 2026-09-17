import React from 'react';
import { MapPin, Globe } from 'lucide-react';
import { GrowingRegionEntity, EcologicalRegionEntity } from '@/core/domain/entities';
import styles from './RegionalFloraHeader.module.css';

export interface RegionalFloraHeaderProps {
  month: number;
  growingRegion?: GrowingRegionEntity | null;
  primaryEcologicalRegion?: EcologicalRegionEntity | null;
}

const MONTH_NAMES: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

export const RegionalFloraHeader: React.FC<RegionalFloraHeaderProps> = ({
  month,
  growingRegion,
  primaryEcologicalRegion,
}) => {
  const monthName = MONTH_NAMES[month] || 'Mes actual';

  const localityParts = [
    growingRegion?.locality || 'Arroyito',
    growingRegion?.province || 'Córdoba',
    growingRegion?.country || 'Argentina',
  ].filter(Boolean);
  const locationSubtitle = localityParts.join(' · ');

  const ecoregionName = primaryEcologicalRegion?.name || 'Espinal';

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
