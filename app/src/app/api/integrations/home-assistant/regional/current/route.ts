import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getSeasonalRegionalFloraUseCase,
  getNativeRegionalFloraUseCase,
  getRegionalGrowingContextUseCase,
} from '@/infrastructure/services/serviceContainer';
import {
  PhenologyEventType,
  RegionalPlantSpeciesEntity,
  PlantPhenologyEntity,
} from '@/core/domain/entities';
import { SeasonalFloraItem } from '@/core/domain/repositories';
import {
  formatMonthRanges,
  formatGrowthHabit,
  MONTH_FULL_NAMES,
  MONTH_SHORT_NAMES,
} from '@/features/regional/utils/floraFormatters';
import { RegionalFloraValidationError } from '@/core/application/errors';

export const dynamic = 'force-dynamic';

export interface HomeAssistantRegionalSpeciesDTO {
  common_name: string;
  scientific_name: string;
  growth_habit: string | null;
  native_status: string;
  relevant_months: string;
  source_name: string | null;
  source_url: string | null;
}

export interface HomeAssistantRegionalFloraResponseDTO {
  schema_version: '1';
  region: {
    code: string;
    name: string;
    province: string;
    country: string;
    ecological_region: string | null;
  };
  month: {
    number: number;
    name: string;
  };
  summary: {
    sprouting_count: number;
    flowering_count: number;
    fruiting_count: number;
    sowing_count: number;
    planting_count: number;
    native_count: number;
  };
  events: {
    sprouting: HomeAssistantRegionalSpeciesDTO[];
    flowering: HomeAssistantRegionalSpeciesDTO[];
    fruiting: HomeAssistantRegionalSpeciesDTO[];
    sowing: HomeAssistantRegionalSpeciesDTO[];
    planting: HomeAssistantRegionalSpeciesDTO[];
  };
  filter?: {
    event?: string;
    habit?: string;
  };
  generated_at: string;
}

const ALLOWED_EVENTS = new Set<PhenologyEventType>([
  'SPROUTING',
  'FLOWERING',
  'FRUITING',
  'SOWING',
  'PLANTING',
]);

const ALLOWED_HABITS = new Set<string>([
  'TREE',
  'SHRUB',
  'VINE',
  'HERB',
  'GRASS',
  'CACTUS',
]);

export function verifyBearerToken(authHeader: string | null, secret: string | undefined): boolean {
  if (!authHeader || !secret || secret.trim().length === 0) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const token = match[1].trim();
  if (token.length === 0) return false;

  const tokenHash = crypto.createHash('sha256').update(token).digest();
  const secretHash = crypto.createHash('sha256').update(secret.trim()).digest();

  return crypto.timingSafeEqual(tokenHash, secretHash);
}

function mapSpeciesToDTO(
  species: RegionalPlantSpeciesEntity,
  phenologyRecords: PlantPhenologyEntity[] = [],
  currentMonth: number,
  highlightEvent?: PhenologyEventType
): HomeAssistantRegionalSpeciesDTO {
  const commonName =
    species.common_names && species.common_names.length > 0
      ? species.common_names.join(' / ')
      : species.canonical_name || species.scientific_name;

  const matchingRecords = species.phenology_records?.filter(
    (p) => !highlightEvent || p.event_type === highlightEvent
  ) || phenologyRecords.filter((p) => !highlightEvent || p.event_type === highlightEvent);

  const months = Array.from(new Set(matchingRecords.map((r) => r.month))).sort((a, b) => a - b);

  let relevantMonths = '';
  if (months.length > 0) {
    relevantMonths = formatMonthRanges(months);
  } else if (currentMonth && MONTH_SHORT_NAMES[currentMonth]) {
    relevantMonths = MONTH_SHORT_NAMES[currentMonth];
  }

  const source =
    matchingRecords.find((p) => p.source)?.source ||
    species.phenology_records?.find((p) => p.source)?.source ||
    null;

  return {
    common_name: commonName,
    scientific_name: species.scientific_name,
    growth_habit: formatGrowthHabit(species.growth_habit),
    native_status: species.native_status,
    relevant_months: relevantMonths,
    source_name: source?.name || null,
    source_url: source?.url || null,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.HOME_ASSISTANT_READ_API_SECRET;

  if (!verifyBearerToken(authHeader, secret)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // 1. Month validation
  const monthParam = searchParams.get('month');
  let month = new Date().getMonth() + 1;
  if (monthParam !== null && monthParam.trim() !== '') {
    const parsedMonth = parseInt(monthParam.trim(), 10);
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return NextResponse.json(
        { error: 'El mes consultado debe ser un número entero entre 1 y 12.' },
        { status: 400 }
      );
    }
    month = parsedMonth;
  }

  // 2. Event filter validation
  const eventParam = searchParams.get('event');
  let validatedEvent: PhenologyEventType | undefined = undefined;
  if (eventParam !== null && eventParam.trim() !== '') {
    const normalizedEvent = eventParam.trim().toUpperCase() as PhenologyEventType;
    if (!ALLOWED_EVENTS.has(normalizedEvent)) {
      return NextResponse.json(
        {
          error:
            'Tipo de evento inválido. Valores permitidos: SPROUTING, FLOWERING, FRUITING, SOWING, PLANTING.',
        },
        { status: 400 }
      );
    }
    validatedEvent = normalizedEvent;
  }

  // 3. Habit filter validation
  const habitParam = searchParams.get('habit');
  let validatedHabit: string | undefined = undefined;
  if (habitParam !== null && habitParam.trim() !== '') {
    const normalizedHabit = habitParam.trim().toUpperCase();
    if (!ALLOWED_HABITS.has(normalizedHabit)) {
      return NextResponse.json(
        {
          error:
            'Hábito de crecimiento inválido. Valores permitidos: TREE, SHRUB, VINE, HERB, GRASS, CACTUS.',
        },
        { status: 400 }
      );
    }
    validatedHabit = normalizedHabit;
  }

  // 4. Region parameter
  const regionCode = (searchParams.get('region') || 'ARROYITO_CBA').trim().toUpperCase();

  try {
    const growingContextUseCase = getRegionalGrowingContextUseCase();
    const seasonalFloraUseCase = getSeasonalRegionalFloraUseCase();
    const nativeFloraUseCase = getNativeRegionalFloraUseCase();

    // Fetch region context
    const growingRegion = await growingContextUseCase.execute({
      growing_region_code: regionCode,
    });

    const primaryEcoRegion =
      growingRegion?.ecological_regions?.[0]?.ecological_region?.name || null;

    // Fetch seasonal items for each event type
    const [allSprouting, allFlowering, allFruiting, allSowing, allPlanting, nativeSpecies] =
      await Promise.all([
        seasonalFloraUseCase.execute({
          month,
          growing_region_code: regionCode,
          event_type: 'SPROUTING',
        }),
        seasonalFloraUseCase.execute({
          month,
          growing_region_code: regionCode,
          event_type: 'FLOWERING',
        }),
        seasonalFloraUseCase.execute({
          month,
          growing_region_code: regionCode,
          event_type: 'FRUITING',
        }),
        seasonalFloraUseCase.execute({
          month,
          growing_region_code: regionCode,
          event_type: 'SOWING',
        }),
        seasonalFloraUseCase.execute({
          month,
          growing_region_code: regionCode,
          event_type: 'PLANTING',
        }),
        nativeFloraUseCase.execute({
          growing_region_code: regionCode,
          growth_habit: validatedHabit,
          native_status: 'NATIVE',
        }),
      ]);

    // Helper filter by habit if requested
    const filterByHabit = (items: SeasonalFloraItem[]): SeasonalFloraItem[] => {
      if (!validatedHabit) return items;
      return items.filter((item) => item.species.growth_habit === validatedHabit);
    };

    const sproutingFiltered = filterByHabit(allSprouting);
    const floweringFiltered = filterByHabit(allFlowering);
    const fruitingFiltered = filterByHabit(allFruiting);
    const sowingFiltered = filterByHabit(allSowing);
    const plantingFiltered = filterByHabit(allPlanting);

    // Build events dictionary (respecting validatedEvent if passed)
    const eventsDTO = {
      sprouting:
        !validatedEvent || validatedEvent === 'SPROUTING'
          ? sproutingFiltered.map((i) =>
              mapSpeciesToDTO(i.species, i.phenology, month, 'SPROUTING')
            )
          : [],
      flowering:
        !validatedEvent || validatedEvent === 'FLOWERING'
          ? floweringFiltered.map((i) =>
              mapSpeciesToDTO(i.species, i.phenology, month, 'FLOWERING')
            )
          : [],
      fruiting:
        !validatedEvent || validatedEvent === 'FRUITING'
          ? fruitingFiltered.map((i) =>
              mapSpeciesToDTO(i.species, i.phenology, month, 'FRUITING')
            )
          : [],
      sowing:
        !validatedEvent || validatedEvent === 'SOWING'
          ? sowingFiltered.map((i) =>
              mapSpeciesToDTO(i.species, i.phenology, month, 'SOWING')
            )
          : [],
      planting:
        !validatedEvent || validatedEvent === 'PLANTING'
          ? plantingFiltered.map((i) =>
              mapSpeciesToDTO(i.species, i.phenology, month, 'PLANTING')
            )
          : [],
    };

    const filterObj: Record<string, string> = {};
    if (validatedEvent) filterObj.event = validatedEvent;
    if (validatedHabit) filterObj.habit = validatedHabit;

    const responseDTO: HomeAssistantRegionalFloraResponseDTO = {
      schema_version: '1',
      region: {
        code: growingRegion?.code || regionCode,
        name: growingRegion?.locality || growingRegion?.name || 'Arroyito',
        province: growingRegion?.province || 'Córdoba',
        country: growingRegion?.country || 'Argentina',
        ecological_region: primaryEcoRegion,
      },
      month: {
        number: month,
        name: MONTH_FULL_NAMES[month] || `Mes ${month}`,
      },
      summary: {
        sprouting_count: sproutingFiltered.length,
        flowering_count: floweringFiltered.length,
        fruiting_count: fruitingFiltered.length,
        sowing_count: sowingFiltered.length,
        planting_count: plantingFiltered.length,
        native_count: nativeSpecies.length,
      },
      events: eventsDTO,
      ...(Object.keys(filterObj).length > 0 ? { filter: filterObj } : {}),
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(responseDTO, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof RegionalFloraValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Error interno al obtener la flora regional' },
      { status: 500 }
    );
  }
}
