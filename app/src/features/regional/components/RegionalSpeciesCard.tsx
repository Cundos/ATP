import React from 'react';
import { ExternalLink, BookOpen, Sparkles } from 'lucide-react';
import {
  RegionalPlantSpeciesEntity,
  PlantPhenologyEntity,
  PhenologyEventType,
  EcologicalRegionEntity,
} from '@/core/domain/entities';
import styles from './RegionalSpeciesCard.module.css';

export interface RegionalSpeciesCardProps {
  species: RegionalPlantSpeciesEntity;
  activePhenology?: PlantPhenologyEntity[];
  currentMonth?: number;
  highlightEvent?: PhenologyEventType;
  ecologicalRegion?: EcologicalRegionEntity;
}

const EVENT_LABELS: Record<PhenologyEventType, string> = {
  SPROUTING: 'Brotación',
  FLOWERING: 'Floración',
  FRUITING: 'Fructificación',
  SOWING: 'Siembra',
  PLANTING: 'Plantación',
};

const EVENT_CLASSES: Record<PhenologyEventType, string> = {
  SPROUTING: styles.eventSprouting,
  FLOWERING: styles.eventFlowering,
  FRUITING: styles.eventFruiting,
  SOWING: styles.eventSowing,
  PLANTING: styles.eventPlanting,
};

const MONTH_SHORT_NAMES = [
  '',
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export const RegionalSpeciesCard: React.FC<RegionalSpeciesCardProps> = ({
  species,
  activePhenology = [],
  currentMonth,
  highlightEvent,
  ecologicalRegion,
}) => {
  const commonName =
    species.common_names && species.common_names.length > 0
      ? species.common_names.join(' / ')
      : species.canonical_name || species.scientific_name;

  const ecoregionName =
    ecologicalRegion?.name || species.ecological_region?.name || 'Espinal';

  const source =
    activePhenology[0]?.source ||
    species.phenology_records?.find((p) => p.source)?.source;

  const sourceName = source?.name || 'Flora Argentina / Institución botánica';
  const sourceUrl = source?.url;

  const eventsToShow = highlightEvent
    ? [highlightEvent]
    : Array.from(new Set(activePhenology.map((p) => p.event_type)));

  const matchingEventRecords = species.phenology_records?.filter(
    (p) => !highlightEvent || p.event_type === highlightEvent
  );
  const monthsForEvent = matchingEventRecords
    ? Array.from(new Set(matchingEventRecords.map((r) => r.month))).sort((a, b) => a - b)
    : [];

  let monthsRangeLabel = '';
  if (monthsForEvent.length > 0) {
    if (monthsForEvent.length === 1) {
      monthsRangeLabel = MONTH_SHORT_NAMES[monthsForEvent[0]];
    } else {
      monthsRangeLabel = `${MONTH_SHORT_NAMES[monthsForEvent[0]]} – ${MONTH_SHORT_NAMES[monthsForEvent[monthsForEvent.length - 1]]}`;
    }
  } else if (currentMonth) {
    monthsRangeLabel = MONTH_SHORT_NAMES[currentMonth];
  }

  return (
    <article className={styles.card} aria-label={`Especie regional: ${commonName}`}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h3 className={styles.commonName}>{commonName}</h3>
          <p className={styles.scientificName}>{species.scientific_name}</p>
        </div>

        <div className={styles.badgeGroup}>
          {species.native_status === 'NATIVE' && (
            <span className={styles.nativeBadge}>Nativa</span>
          )}
          {species.growth_habit && (
            <span className={styles.habitBadge}>{species.growth_habit}</span>
          )}
        </div>
      </div>

      {eventsToShow.length > 0 && (
        <div className={styles.badgeGroup} aria-label="Eventos estacionales activos">
          {eventsToShow.map((evt) => (
            <span
              key={evt}
              className={`${styles.eventBadge} ${EVENT_CLASSES[evt] || ''}`}
            >
              <Sparkles size={11} aria-hidden="true" />
              {EVENT_LABELS[evt]} {monthsRangeLabel ? `(${monthsRangeLabel})` : ''}
            </span>
          ))}
        </div>
      )}

      <div className={styles.metaGrid}>
        {species.family && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Familia:</span>
            <span className={styles.metaValue}>{species.family}</span>
          </div>
        )}
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Ecorregión:</span>
          <span className={styles.metaValue}>{ecoregionName}</span>
        </div>
        {species.notes && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Observaciones:</span>
            <span className={styles.metaValue}>{species.notes}</span>
          </div>
        )}
        {species.conservation_status && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Conservación:</span>
            <span className={styles.metaValue}>{species.conservation_status}</span>
          </div>
        )}
      </div>

      <footer className={styles.sourceRow}>
        <span className={styles.sourceLabel} title={`Fuente: ${sourceName}`}>
          <BookOpen size={12} aria-hidden="true" />
          Fuente: {sourceName}
        </span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
            aria-label={`Abrir fuente oficial de ${species.scientific_name} en nueva pestaña`}
          >
            Ver fuente <ExternalLink size={10} style={{ marginLeft: 2, display: 'inline' }} />
          </a>
        )}
      </footer>
    </article>
  );
};
