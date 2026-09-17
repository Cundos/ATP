import React from 'react';
import {
  Sprout,
  Flower2,
  Apple,
  Sparkles,
  TreePine,
  LucideIcon,
} from 'lucide-react';
import { PhenologyEventType } from '@/core/domain/entities';
import { SeasonalFloraItem } from '@/core/domain/repositories';
import { RegionalSpeciesCard } from './RegionalSpeciesCard';
import styles from './SeasonalSection.module.css';

export interface SeasonalSectionProps {
  eventType: PhenologyEventType;
  items: SeasonalFloraItem[];
  currentMonth: number;
}

interface SectionConfig {
  title: string;
  icon: LucideIcon;
}

const SECTION_CONFIGS: Record<PhenologyEventType, SectionConfig> = {
  SPROUTING: {
    title: 'Brotan este mes',
    icon: Sprout,
  },
  FLOWERING: {
    title: 'Florecen este mes',
    icon: Flower2,
  },
  FRUITING: {
    title: 'Fructifican este mes',
    icon: Apple,
  },
  SOWING: {
    title: 'Buen momento para sembrar',
    icon: Sparkles,
  },
  PLANTING: {
    title: 'Buen momento para plantar',
    icon: TreePine,
  },
};

export const SeasonalSection: React.FC<SeasonalSectionProps> = ({
  eventType,
  items,
  currentMonth,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  const config = SECTION_CONFIGS[eventType];
  const IconComponent = config?.icon || Sprout;
  const title = config?.title || eventType;

  return (
    <section className={styles.section} aria-label={title} data-testid={`seasonal-section-${eventType.toLowerCase()}`}>
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
        {items.map((item) => (
          <RegionalSpeciesCard
            key={`${item.species.id}-${eventType}`}
            species={item.species}
            activePhenology={item.phenology}
            currentMonth={currentMonth}
            highlightEvent={eventType}
            ecologicalRegion={item.ecological_region}
          />
        ))}
      </div>
    </section>
  );
};
