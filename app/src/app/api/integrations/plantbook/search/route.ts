import { NextRequest, NextResponse } from 'next/server';
import { getOpenPlantbookClient } from '@/infrastructure/services/serviceContainer';
import {
  OpenPlantbookError,
  OpenPlantbookRateLimitError,
  OpenPlantbookAuthorizationError,
  OpenPlantbookServiceUnavailableError,
  OpenPlantbookResponseError,
} from '@/core/domain/errors/OpenPlantbookClientErrors';
import { OpenPlantbookAuthenticationError } from '@/core/domain/errors/OpenPlantbookAuthenticationError';

export const dynamic = 'force-dynamic';

export interface BotanicalSearchResultDTO {
  pid: string;
  displayName: string;
  alias: string | null;
  imageUrl: string | null;
}

export interface BotanicalSearchResponseDTO {
  results: BotanicalSearchResultDTO[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || searchParams.get('alias') || '').trim();

    // 1. Validar longitud máxima
    if (query.length > 100) {
      return NextResponse.json(
        { error: 'La consulta no puede superar los 100 caracteres.' },
        { status: 400 }
      );
    }

    // 2. Si está vacío o tiene menos de 2 caracteres, retornar lista vacía sin llamar al proveedor
    if (query.length < 2) {
      const emptyResponse: BotanicalSearchResponseDTO = { results: [] };
      return NextResponse.json(emptyResponse, { status: 200 });
    }

    // 3. Ejecutar búsqueda a través del cliente resiliente
    const client = getOpenPlantbookClient();
    const searchResponse = await client.searchPlants(query);

    // 4. Mapear al DTO público mínimo
    const results: BotanicalSearchResultDTO[] = (searchResponse.results || []).map((item) => ({
      pid: item.pid,
      displayName: item.display_pid && item.display_pid.trim().length > 0 ? item.display_pid.trim() : item.pid,
      alias: item.alias && item.alias.trim().length > 0 ? item.alias.trim() : null,
      imageUrl: item.image_url && item.image_url.trim().length > 0 ? item.image_url.trim() : null,
    }));

    const responseDto: BotanicalSearchResponseDTO = { results };
    return NextResponse.json(responseDto, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof OpenPlantbookRateLimitError || (error as { code?: string })?.code === 'RATE_LIMIT') {
      return NextResponse.json(
        { error: 'Open Plantbook alcanzó temporalmente su límite. Podés continuar sin referencia.' },
        { status: 429 }
      );
    }

    if (
      error instanceof OpenPlantbookAuthorizationError ||
      error instanceof OpenPlantbookAuthenticationError ||
      (error as { code?: string })?.code === 'AUTH_ERROR'
    ) {
      return NextResponse.json(
        { error: 'Referencia botánica no disponible.' },
        { status: 503 }
      );
    }

    if (
      error instanceof OpenPlantbookServiceUnavailableError ||
      (error as { code?: string })?.code === 'SERVICE_UNAVAILABLE' ||
      (error as { code?: string })?.code === 'TIMEOUT' ||
      (error as { code?: string })?.code === 'NETWORK_ERROR'
    ) {
      return NextResponse.json(
        { error: 'Open Plantbook no está disponible en este momento. Podés continuar sin referencia.' },
        { status: 503 }
      );
    }

    if (error instanceof OpenPlantbookResponseError || (error as { code?: string })?.code === 'INVALID_RESPONSE') {
      return NextResponse.json(
        { error: 'Respuesta inválida del proveedor botánico.' },
        { status: 502 }
      );
    }

    if (error instanceof OpenPlantbookError) {
      return NextResponse.json(
        { error: 'Error al consultar la referencia botánica.' },
        { status: 500 }
      );
    }

    console.error('[OpenPlantbookSearchRoute] Error inesperado en búsqueda botánica:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar la búsqueda botánica.' },
      { status: 500 }
    );
  }
}
