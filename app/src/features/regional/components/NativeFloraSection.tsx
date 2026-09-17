'use client';

import React, { useState, useMemo } from 'react';
import { Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import { RegionalPlantSpeciesEntity, EcologicalRegionEntity } from '@/core/domain/entities';
import { formatGrowthHabit, formatGrowthHabitPlural } from '../utils/floraFormatters';
import { RegionalSpeciesCard } from './RegionalSpeciesCard';
import styles from './NativeFloraSection.module.css';

export interface NativeFloraSectionProps {
  nativeSpecies: RegionalPlantSpeciesEntity[];
  currentMonth: number;
  ecologicalRegion?: EcologicalRegionEntity;
  initialLimit?: number;
  onOpenDetail?: (species: RegionalPlantSpeciesEntity) => void;
}

const DEFAULT_INITIAL_LIMIT = 4;

export const NativeFloraSection: React.FC<NativeFloraSectionProps> = ({
  nativeSpecies,
  currentMonth,
  ecologicalRegion,
  initialLimit = DEFAULT_INITIAL_LIMIT,
  onOpenDetail,
}) => {
  const [selectedHabit, setSelectedHabit] = useState<string>('ALL');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const habitStats = useMemo(() => {
    const map = new Map<string, number>();
    if (nativeSpecies) {
      for (const sp of nativeSpecies) {
        if (sp.growth_habit) {
          map.set(sp.growth_habit, (map.get(sp.growth_habit) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [nativeSpecies]);

  const filteredSpecies = useMemo(() => {
    if (!nativeSpecies) return [];
    if (selectedHabit === 'ALL') {
      return nativeSpecies;
    }
    return nativeSpecies.filter((sp) => sp.growth_habit === selectedHabit);
  }, [nativeSpecies, selectedHabit]);

  const displayedSpecies = useMemo(() => {
    if (isExpanded || filteredSpecies.length <= initialLimit) {
      return filteredSpecies;
    }
    return filteredSpecies.slice(0, initialLimit);
  }, [filteredSpecies, isExpanded, initialLimit]);

  if (!nativeSpecies || nativeSpecies.length === 0) {
    return null;
  }

  const hasMore = filteredSpecies.length > initialLimit;

  return (
    <section
      id="native-flora"
      className={styles.section}
      aria-label="Nativas de tu región"
      data-testid="native-flora-section"
    >
      <div className={styles.sectionHeader}>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <div className={styles.iconWrapper} aria-hidden="true">
              <Leaf size={16} />
            </div>
            <h2 className={styles.sectionTitle}>Nativas de tu región</h2>
          </div>
          <span className={styles.countBadge} aria-label={`${nativeSpecies.length} especies nativas`}>
            {nativeSpecies.length} registradas
          </span>
        </div>

        {/* Resumen por hábito */}
        {habitStats.length > 0 && (
          <div className={styles.habitBreakdown} aria-label="Distribución por hábito">
            {habitStats.map(([habit, count]) => {
              const label = formatGrowthHabitPlural(habit) || formatGrowthHabit(habit) || habit;
              return (
                <span key={habit} className={styles.breakdownItem}>
                  <strong>{label}:</strong> {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {habitStats.length > 1 && (
        <div className={styles.filterTabs} role="tablist" aria-label="Filtrar por hábito de crecimiento">
          <button
            type="button"
            role="tab"
            aria-selected={selectedHabit === 'ALL'}
            className={`${styles.filterTab} ${selectedHabit === 'ALL' ? styles.filterTabActive : ''}`}
            onClick={() => {
              setSelectedHabit('ALL');
              setIsExpanded(false);
            }}
          >
            Todas ({nativeSpecies.length})
          </button>
          {habitStats.map(([habit, count]) => {
            const humanLabel = formatGrowthHabitPlural(habit) || formatGrowthHabit(habit) || habit;
            return (
              <button
                key={habit}
                type="button"
                role="tab"
                aria-selected={selectedHabit === habit}
                className={`${styles.filterTab} ${selectedHabit === habit ? styles.filterTabActive : ''}`}
                onClick={() => {
                  setSelectedHabit(habit);
                  setIsExpanded(false);
                }}
              >
                {humanLabel} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.grid}>
        {displayedSpecies.map((species) => (
          <RegionalSpeciesCard
            key={species.id}
            species={species}
            activePhenology={species.phenology_records || []}
            currentMonth={currentMonth}
            ecologicalRegion={ecologicalRegion}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      {hasMore && (
        <div className={styles.showMoreRow}>
          <button
            type="button"
            className={styles.showMoreButton}
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Mostrar menos nativas' : `Ver todas las ${filteredSpecies.length} nativas`}
          >
            {isExpanded ? (
              <>
                <span>Mostrar menos</span>
                <ChevronUp size={15} aria-hidden="true" />
              </>
            ) : (
              <>
                <span>Ver todas las {filteredSpecies.length} nativas</span>
                <ChevronDown size={15} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};
