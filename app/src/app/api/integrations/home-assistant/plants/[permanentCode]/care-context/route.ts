import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPlantCareContextUseCase } from '@/infrastructure/services/serviceContainer';
import { PlantValidationError, PlantNotFoundError } from '@/core/application/errors';
import { PlantCareContextDTO } from '@/core/domain/entities';

export const dynamic = 'force-dynamic';

export interface HomeAssistantCareRecommendationResponse {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  explanation: string;
}

export interface HomeAssistantPlantCareContextResponseDTO {
  schema_version: '1';
  plant: {
    permanent_code: string;
    common_name: string;
    scientific_name: string | null;
  };
  care: {
    status: 'OK' | 'WATCH' | 'ACTION_RECOMMENDED' | 'DATA_INSUFFICIENT';
    headline: string;
    summary: string;
    recommendations: HomeAssistantCareRecommendationResponse[];
  };
  conditions: {
    soil_moisture: {
      value: number | null;
      unit: string | null;
      classification: 'LOW' | 'NORMAL' | 'HIGH' | 'UNKNOWN';
      observed_at: string | null;
    };
    sensor_status: 'ONLINE' | 'OFFLINE' | 'STALE' | 'UNKNOWN';
    battery: {
      value: number | null;
      unit: string | null;
    };
  };
  data_quality: {
    telemetry_available: boolean;
    telemetry_stale: boolean;
    reference_available: boolean;
  };
  generated_at: string;
}

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

export function mapCareContextToResponseDTO(
  context: PlantCareContextDTO,
  fallbackPermanentCode: string
): HomeAssistantPlantCareContextResponseDTO {
  return {
    schema_version: '1',
    plant: {
      permanent_code: context.plant?.permanent_code || context.permanent_code || fallbackPermanentCode,
      common_name: context.plant?.common_name || '',
      scientific_name: context.plant?.scientific_name || null,
    },
    care: {
      status: context.assessment.status,
      headline: context.assessment.headline,
      summary: context.assessment.summary,
      recommendations: context.assessment.recommendations.map((rec) => ({
        priority: rec.priority,
        title: rec.title,
        explanation: rec.explanation,
      })),
    },
    conditions: {
      soil_moisture: {
        value: context.current_conditions.soil_moisture.value,
        unit: context.current_conditions.soil_moisture.unit || '%',
        classification: context.current_conditions.soil_moisture.classification,
        observed_at: context.current_conditions.soil_moisture.observed_at,
      },
      sensor_status: context.current_conditions.sensor_status,
      battery: {
        value: context.current_conditions.battery.value,
        unit: context.current_conditions.battery.unit || '%',
      },
    },
    data_quality: {
      telemetry_available: Boolean(
        context.data_quality.has_telemetry ?? context.data_quality.telemetry_available
      ),
      telemetry_stale: Boolean(
        context.current_conditions.sensor_status === 'STALE' ||
          context.data_quality.telemetry_stale
      ),
      reference_available: Boolean(
        context.data_quality.has_botanical_reference ?? context.data_quality.reference_available
      ),
    },
    generated_at: context.evaluated_at || new Date().toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ permanentCode: string }> }
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.HOME_ASSISTANT_READ_API_SECRET;

  if (!verifyBearerToken(authHeader, secret)) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const { permanentCode } = await context.params;
  const normalizedCode = (permanentCode || '').trim().toUpperCase();

  // Strict validation: must match AT-PL-XXX format. Never accept UUID or arbitrary query.
  if (!/^AT-PL-\d+$/i.test(normalizedCode)) {
    return NextResponse.json(
      { error: 'Código permanente inválido. Se esperaba formato AT-PL-XXX.' },
      { status: 400 }
    );
  }

  try {
    const useCase = getPlantCareContextUseCase();
    const careContext = await useCase.executeByPermanentCode(normalizedCode);
    const responseDTO = mapCareContextToResponseDTO(careContext, normalizedCode);

    return NextResponse.json(responseDTO, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof PlantValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof PlantNotFoundError) {
      return NextResponse.json(
        { error: 'Ejemplar no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno al obtener el contexto de cuidado' },
      { status: 500 }
    );
  }
}
