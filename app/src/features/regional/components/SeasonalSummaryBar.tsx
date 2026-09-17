import React from 'react';
import {
  Sprout,
  Flower2,
  Apple,
  Sparkles,
  TreePine,
  Leaf,
  LucideIcon,
} from 'lucide-react';
import styles from './SeasonalSummaryBar.module.css';

export interface SeasonalSummaryBarProps {
  sproutingCount: number;
  floweringCount: number;
  fruitingCount: number;
  sowingCount: number;
  plantingCount: number;
  nativeCount: number;
  onSelectSection?: (sectionId: string) => void;
}

interface CounterItem {
  id: string;
  label: string;
  count: number;
  icon: LucideIcon;
  colorClass: string;
}

export const SeasonalSummaryBar: React.FC<SeasonalSummaryBarProps> = ({
  sproutingCount,
  floweringCount,
  fruitingCount,
  sowingCount,
  plantingCount,
  nativeCount,
  onSelectSection,
}) => {
  const items: CounterItem[] = [
    {
      id: 'seasonal-sprouting',
      label: 'brotan',
      count: sproutingCount,
      icon: Sprout,
      colorClass: styles.itemSprouting,
    },
    {
      id: 'seasonal-flowering',
      label: 'florecen',
      count: floweringCount,
      icon: Flower2,
      colorClass: styles.itemFlowering,
    },
    {
      id: 'seasonal-fruiting',
      label: 'fructifican',
      count: fruitingCount,
      icon: Apple,
      colorClass: styles.itemFruiting,
    },
    {
      id: 'seasonal-sowing',
      label: 'para sembrar',
      count: sowingCount,
      icon: Sparkles,
      colorClass: styles.itemSowing,
    },
    {
      id: 'seasonal-planting',
      label: 'para plantar',
      count: plantingCount,
      icon: TreePine,
      colorClass: styles.itemPlanting,
    },
    {
      id: 'native-flora',
      label: 'nativas',
      count: nativeCount,
      icon: Leaf,
      colorClass: styles.itemNative,
    },
  ];

  const handleClick = (id: string) => {
    if (onSelectSection) {
      onSelectSection(id);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className={styles.summaryBar}
      role="region"
      aria-label="Resumen estacional del mes"
      data-testid="seasonal-summary-bar"
    >
      <div className={styles.chipsContainer}>
        {items.map(({ id, label, count, icon: Icon, colorClass }) => {
          const hasCount = count > 0;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.chip} ${colorClass} ${!hasCount ? styles.chipEmpty : ''}`}
              onClick={() => handleClick(id)}
              aria-label={`${count} ${label}`}
              title={`Ir a sección: ${count} ${label}`}
            >
              <span className={styles.iconWrapper} aria-hidden="true">
                <Icon size={14} />
              </span>
              <span className={styles.countText}>{count}</span>
              <span className={styles.labelText}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
