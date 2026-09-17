'use client';

import React, { useState } from 'react';
import {
  Sprout,
  Flower2,
  Apple,
  Sparkles,
  TreePine,
  ChevronDown,
  ChevronUp,
  LucideIcon,
} from 'lucide-react';
import { PhenologyEventType, RegionalPlantSpeciesEntity } from '@/core/domain/entities';
import { SeasonalFloraItem } from '@/core/domain/repositories';
import { RegionalSpeciesCard } from './RegionalSpeciesCard';
import styles from './SeasonalSection.module.css';

export interface SeasonalSectionProps {
  eventType: PhenologyEventType;
  items: SeasonalFloraItem[];
  currentMonth: number;
  initialLimit?: number;
  onOpenDetail?: (species: RegionalPlantSpeciesEntity) => void;
}

interface SectionConfig {
  title: string;
  icon: LucideIcon;
  id: string;
}

const SECTION_CONFIGS: Record<PhenologyEventType, SectionConfig> = {
  SPROUTING: {
    title: 'Brotan este mes',
    icon: Sprout,
    id: 'seasonal-sprouting',
  },
  FLOWERING: {
    title: 'Florecen este mes',
    icon: Flower2,
    id: 'seasonal-flowering',
  },
  FRUITING: {
    title: 'Fructifican este mes',
    icon: Apple,
    id: 'seasonal-fruiting',
  },
  SOWING: {
    title: 'Buen momento para sembrar',
    icon: Sparkles,
    id: 'seasonal-sowing',
  },
  PLANTING: {
    title: 'Buen momento para plantar',
    icon: TreePine,
    id: 'seasonal-planting',
  },
};

const DEFAULT_SEASONAL_LIMIT = 4;

export const SeasonalSection: React.FC<SeasonalSectionProps> = ({
  eventType,
  items,
  currentMonth,
  initialLimit = DEFAULT_SEASONAL_LIMIT,
  onOpenDetail,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!items || items.length === 0) {
    return null;
  }

  const config = SECTION_CONFIGS[eventType];
  const IconComponent = config?.icon || Sprout;
  const title = config?.title || eventType;
  const sectionId = config?.id || `seasonal-${eventType.toLowerCase()}`;

  const hasMore = items.length > initialLimit;
  const displayedItems = isExpanded || !hasMore ? items : items.slice(0, initialLimit);

  return (
    <section
      id={sectionId}
      className={styles.section}
      aria-label={title}
      data-testid={`seasonal-section-${eventType.toLowerCase()}`}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.titleGroup}>
          <div className={styles.iconWrapper} aria-hidden="true">
            <IconComponent size={16} />
          </div>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
        <span className={styles.countBadge} aria-label={`${items.length} especies`}>
          {items.length} {items.length === 1 ? 'especie' : 'especies'}
        </span>
      </div>

      <div className={styles.grid}>
        {displayedItems.map((item) => (
          <RegionalSpeciesCard
            key={`${item.species.id}-${eventType}`}
            species={item.species}
            activePhenology={item.phenology}
            currentMonth={currentMonth}
            highlightEvent={eventType}
            ecologicalRegion={item.ecological_region}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      {hasMore && (
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Mostrar menos especies de ${title}` : `Ver todas las ${items.length} especies de ${title}`}
          >
            {isExpanded ? (
              <>
                <span>Mostrar menos</span>
                <ChevronUp size={15} aria-hidden="true" />
              </>
            ) : (
              <>
                <span>Ver todas las {items.length} especies</span>
                <ChevronDown size={15} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};
