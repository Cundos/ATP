import React from 'react';
import { Metadata } from 'next';
import {
  getSeasonalRegionalFloraUseCase,
  getNativeRegionalFloraUseCase,
  getRegionalGrowingContextUseCase,
} from '@/infrastructure/services/serviceContainer';
import { RegionalFloraView } from '@/features/regional/components';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Este mes en tu región — Atilio Plants',
  description: 'Flora autóctona regional y eventos fenológicos de temporada.',
};

interface RegionalPageProps {
  searchParams: Promise<{
    month?: string;
    region?: string;
  }>;
}

export default async function RegionalFloraPage({ searchParams }: RegionalPageProps) {
  const params = await searchParams;

  // Resolver mes actual en runtime (1 a 12), con soporte para query param ?month=
  const now = new Date();
  let month = now.getMonth() + 1;

  if (params?.month) {
    const parsedMonth = parseInt(params.month, 10);
    if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
      month = parsedMonth;
    }
  }

  const regionCode = params?.region?.trim().toUpperCase() || 'ARROYITO_CBA';

  const growingContextUseCase = getRegionalGrowingContextUseCase();
  const seasonalUseCase = getSeasonalRegionalFloraUseCase();
  const nativeFloraUseCase = getNativeRegionalFloraUseCase();

  // Consultas al servidor usando los casos de uso
  const [
    growingRegion,
    sproutingItems,
    floweringItems,
    fruitingItems,
    sowingItems,
    plantingItems,
    nativeSpecies,
  ] = await Promise.all([
    growingContextUseCase.execute({ growing_region_code: regionCode }),
    seasonalUseCase.execute({
      month,
      growing_region_code: regionCode,
      event_type: 'SPROUTING',
    }),
    seasonalUseCase.execute({
      month,
      growing_region_code: regionCode,
      event_type: 'FLOWERING',
    }),
    seasonalUseCase.execute({
      month,
      growing_region_code: regionCode,
      event_type: 'FRUITING',
    }),
    seasonalUseCase.execute({
      month,
      growing_region_code: regionCode,
      event_type: 'SOWING',
    }),
    seasonalUseCase.execute({
      month,
      growing_region_code: regionCode,
      event_type: 'PLANTING',
    }),
    nativeFloraUseCase.execute({
      growing_region_code: regionCode,
      native_status: 'NATIVE',
    }),
  ]);

  const primaryEcologicalRegion =
    growingRegion?.ecological_regions?.find((er) => er.is_primary)?.ecological_region ||
    growingRegion?.ecological_regions?.[0]?.ecological_region ||
    null;

  return (
    <section>
      <RegionalFloraView
        month={month}
        growingRegion={growingRegion}
        primaryEcologicalRegion={primaryEcologicalRegion}
        sproutingItems={sproutingItems}
        floweringItems={floweringItems}
        fruitingItems={fruitingItems}
        sowingItems={sowingItems}
        plantingItems={plantingItems}
        nativeSpecies={nativeSpecies}
      />
    </section>
  );
}
