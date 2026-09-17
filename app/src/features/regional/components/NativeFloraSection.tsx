'use client';

import React, { useState, useMemo } from 'react';
import { Leaf } from 'lucide-react';
import { RegionalPlantSpeciesEntity, EcologicalRegionEntity } from '@/core/domain/entities';
import { RegionalSpeciesCard } from './RegionalSpeciesCard';
import styles from './NativeFloraSection.module.css';

export interface NativeFloraSectionProps {
  nativeSpecies: RegionalPlantSpeciesEntity[];
  currentMonth: number;
  ecologicalRegion?: EcologicalRegionEntity;
}

export const NativeFloraSection: React.FC<NativeFloraSectionProps> = ({
  nativeSpecies,
  currentMonth,
  ecologicalRegion,
}) => {
  const [selectedHabit, setSelectedHabit] = useState<string>('ALL');

  const habits = useMemo(() => {
    const set = new Set<string>();
    if (nativeSpecies) {
      for (const sp of nativeSpecies) {
        if (sp.growth_habit) {
          set.add(sp.growth_habit);
        }
      }
    }
    return Array.from(set).sort();
  }, [nativeSpecies]);

  const filteredSpecies = useMemo(() => {
    if (!nativeSpecies) return [];
    if (selectedHabit === 'ALL') {
      return nativeSpecies;
    }
    return nativeSpecies.filter((sp) => sp.growth_habit === selectedHabit);
  }, [nativeSpecies, selectedHabit]);

  if (!nativeSpecies || nativeSpecies.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="Nativas de tu región" data-testid="native-flora-section">
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
        <p className={styles.description}>
          Catálogo curado de especies autóctonas adaptadas al ecosistema local y con fenología documentada.
        </p>
      </div>

      {habits.length > 1 && (
        <div className={styles.filterTabs} role="tablist" aria-label="Filtrar por hábito de crecimiento">
          <button
            type="button"
            role="tab"
            aria-selected={selectedHabit === 'ALL'}
            className={`${styles.filterTab} ${selectedHabit === 'ALL' ? styles.filterTabActive : ''}`}
            onClick={() => setSelectedHabit('ALL')}
          >
            Todas ({nativeSpecies.length})
          </button>
          {habits.map((habit) => {
            const count = nativeSpecies.filter((s) => s.growth_habit === habit).length;
            return (
              <button
                key={habit}
                type="button"
                role="tab"
                aria-selected={selectedHabit === habit}
                className={`${styles.filterTab} ${selectedHabit === habit ? styles.filterTabActive : ''}`}
                onClick={() => setSelectedHabit(habit)}
              >
                {habit} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.grid}>
        {filteredSpecies.map((species) => (
          <RegionalSpeciesCard
            key={species.id}
            species={species}
            activePhenology={species.phenology_records || []}
            currentMonth={currentMonth}
            ecologicalRegion={ecologicalRegion}
          />
        ))}
      </div>
    </section>
  );
};
