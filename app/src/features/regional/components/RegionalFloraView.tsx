import React from 'react';
import { Leaf } from 'lucide-react';
import {
  GrowingRegionEntity,
  EcologicalRegionEntity,
  RegionalPlantSpeciesEntity,
} from '@/core/domain/entities';
import { SeasonalFloraItem } from '@/core/domain/repositories';
import { EmptyState } from '@/components/ui';
import { RegionalFloraHeader } from './RegionalFloraHeader';
import { SeasonalSection } from './SeasonalSection';
import { NativeFloraSection } from './NativeFloraSection';
import styles from './RegionalFloraView.module.css';

export interface RegionalFloraViewProps {
  month: number;
  growingRegion?: GrowingRegionEntity | null;
  primaryEcologicalRegion?: EcologicalRegionEntity | null;
  sproutingItems: SeasonalFloraItem[];
  floweringItems: SeasonalFloraItem[];
  fruitingItems: SeasonalFloraItem[];
  sowingItems: SeasonalFloraItem[];
  plantingItems: SeasonalFloraItem[];
  nativeSpecies: RegionalPlantSpeciesEntity[];
}

export const RegionalFloraView: React.FC<RegionalFloraViewProps> = ({
  month,
  growingRegion,
  primaryEcologicalRegion,
  sproutingItems,
  floweringItems,
  fruitingItems,
  sowingItems,
  plantingItems,
  nativeSpecies,
}) => {
  const totalSeasonalCount =
    sproutingItems.length +
    floweringItems.length +
    fruitingItems.length +
    sowingItems.length +
    plantingItems.length;

  const hasAnyData = totalSeasonalCount > 0 || nativeSpecies.length > 0;

  return (
    <div className={styles.container}>
      <RegionalFloraHeader
        month={month}
        growingRegion={growingRegion}
        primaryEcologicalRegion={primaryEcologicalRegion}
      />

      {!hasAnyData ? (
        <div className={styles.emptyStateContainer}>
          <EmptyState
            icon={<Leaf size={32} />}
            title="Sin información disponible"
            description="No hay información estacional disponible para esta región y mes."
          />
        </div>
      ) : (
        <>
          {/* 1. Brotan este mes */}
          <SeasonalSection
            eventType="SPROUTING"
            items={sproutingItems}
            currentMonth={month}
          />

          {/* 2. Florecen este mes */}
          <SeasonalSection
            eventType="FLOWERING"
            items={floweringItems}
            currentMonth={month}
          />

          {/* 3. Fructifican este mes */}
          <SeasonalSection
            eventType="FRUITING"
            items={fruitingItems}
            currentMonth={month}
          />

          {/* 4. Buen momento para sembrar */}
          <SeasonalSection
            eventType="SOWING"
            items={sowingItems}
            currentMonth={month}
          />

          {/* 5. Buen momento para plantar */}
          <SeasonalSection
            eventType="PLANTING"
            items={plantingItems}
            currentMonth={month}
          />

          {/* 6. Nativas de tu región */}
          <NativeFloraSection
            nativeSpecies={nativeSpecies}
            currentMonth={month}
            ecologicalRegion={primaryEcologicalRegion ?? undefined}
          />
        </>
      )}
    </div>
  );
};
