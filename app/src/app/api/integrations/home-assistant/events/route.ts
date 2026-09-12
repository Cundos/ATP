import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getIngestHomeAssistantEventUseCase } from '@/infrastructure/services/serviceContainer';
import { PlantValidationError, PlantNotFoundError } from '@/core/application/errors';

export const dynamic = 'force-dynamic';

function verifyBearerToken(authHeader: string | null, secret: string | undefined): boolean {
  if (!authHeader || !secret) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const token = match[1].trim();

  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(secret);

  if (tokenBuffer.length !== secretBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, secretBuffer);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.HOME_ASSISTANT_WEBHOOK_SECRET;

  if (!verifyBearerToken(authHeader, secret)) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud inválido (JSON esperado)' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'El cuerpo de la solicitud debe ser un objeto JSON' },
      { status: 400 }
    );
  }

  const payload = body as Record<string, unknown>;

  try {
    const useCase = getIngestHomeAssistantEventUseCase();
    const result = await useCase.execute({
      event_id: String(payload.event_id || ''),
      permanent_code: String(payload.permanent_code || ''),
      event_type: String(payload.event_type || ''),
      occurred_at: payload.occurred_at as string | Date,
      value: payload.value as number | string | null | undefined,
      unit: payload.unit as string | null | undefined,
      metadata: payload.metadata as Record<string, unknown> | null | undefined,
    });

    const statusCode = result.status === 'CREATED' ? 201 : 200;

    return NextResponse.json(
      {
        success: true,
        status: result.status,
        event: result.event,
      },
      { status: statusCode }
    );
  } catch (error: unknown) {
    if (error instanceof PlantValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof PlantNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno al procesar el evento operativo' },
      { status: 500 }
    );
  }
}
