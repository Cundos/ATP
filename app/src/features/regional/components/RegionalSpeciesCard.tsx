import React from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
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
  onOpenDetail?: (species: RegionalPlantSpeciesEntity) => void;
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
  onOpenDetail,
}) => {
  const commonName =
    species.common_names && species.common_names.length > 0
      ? species.common_names.join(' / ')
      : species.canonical_name || species.scientific_name;

  const eventsToShow = highlightEvent
    ? [highlightEvent]
    : Array.from(new Set(activePhenology.map((p) => p.event_type)));

  // Calcular rangos reales usando el helper formatMonthRanges
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

  const handleCardClick = () => {
    if (onOpenDetail) {
      onOpenDetail(species);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <article
      className={`${styles.card} ${onOpenDetail ? styles.cardClickable : ''}`}
      aria-label={`Especie regional: ${commonName}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={onOpenDetail ? 0 : undefined}
      role={onOpenDetail ? 'button' : undefined}
      data-testid={`species-card-${species.id}`}
    >
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

      <div className={styles.footerRow}>
        {eventsToShow.length > 0 ? (
          <div className={styles.eventBadgeGroup} aria-label="Eventos activos">
            {eventsToShow.map((evt) => (
              <span
                key={evt}
                className={`${styles.eventBadge} ${EVENT_CLASSES[evt] || ''}`}
              >
                <Sparkles size={11} aria-hidden="true" />
                {EVENT_LABELS[evt]} {monthsRangeLabel ? `· ${monthsRangeLabel}` : ''}
              </span>
            ))}
          </div>
        ) : (
          <div />
        )}

        {onOpenDetail && (
          <span className={styles.detailLink} aria-hidden="true">
            <span>Detalle</span>
            <ChevronRight size={14} />
          </span>
        )}
      </div>
    </article>
  );
};
