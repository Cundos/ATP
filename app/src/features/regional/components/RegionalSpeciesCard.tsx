import React from 'react';
import { ExternalLink, BookOpen, Sparkles } from 'lucide-react';
import {
  RegionalPlantSpeciesEntity,
  PlantPhenologyEntity,
  PhenologyEventType,
  EcologicalRegionEntity,
} from '@/core/domain/entities';
import {
  formatMonthRanges,
  formatGrowthHabit,
  MONTH_SHORT_NAMES,
} from '../utils/floraFormatters';
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

  // Ecorregión real (sin inventar fallback como 'Espinal')
  const ecoregionName =
    ecologicalRegion?.name || species.ecological_region?.name || null;

  // Fuente real (sin inventar fallback como 'Flora Argentina / Institución botánica')
  const source =
    activePhenology[0]?.source ||
    species.phenology_records?.find((p) => p.source)?.source ||
    null;

  const sourceName = source?.name || null;
  const sourceUrl = source?.url || null;

  const eventsToShow = highlightEvent
    ? [highlightEvent]
    : Array.from(new Set(activePhenology.map((p) => p.event_type)));

  // Calcular rangos reales usando el helper puro formatMonthRanges
  const matchingEventRecords = species.phenology_records?.filter(
    (p) => !highlightEvent || p.event_type === highlightEvent
  );
  const monthsForEvent = matchingEventRecords
    ? Array.from(new Set(matchingEventRecords.map((r) => r.month))).sort((a, b) => a - b)
    : [];

  let monthsRangeLabel = '';
  if (monthsForEvent.length > 0) {
    monthsRangeLabel = formatMonthRanges(monthsForEvent);
  } else if (currentMonth && MONTH_SHORT_NAMES[currentMonth]) {
    monthsRangeLabel = MONTH_SHORT_NAMES[currentMonth];
  }

  const humanHabit = formatGrowthHabit(species.growth_habit);

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
          {humanHabit && (
            <span className={styles.habitBadge}>{humanHabit}</span>
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
        {ecoregionName ? (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Ecorregión:</span>
            <span className={styles.metaValue}>{ecoregionName}</span>
          </div>
        ) : (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Ecorregión:</span>
            <span className={styles.metaValue}>No informada</span>
          </div>
        )}
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
        <span className={styles.sourceLabel} title={sourceName ? `Fuente: ${sourceName}` : 'Fuente no informada'}>
          <BookOpen size={12} aria-hidden="true" />
          Fuente: {sourceName || 'Fuente no informada'}
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
