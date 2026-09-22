import { NextResponse } from 'next/server';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { GetPlantUseCase } from '@/core/application/use-cases/GetPlantUseCase';
import {
  getPlantOperationalEventRepository,
  getPlantCareContextUseCase,
} from '@/infrastructure/services/serviceContainer';
import { parseBotanicalReferenceViewModel } from '@/features/plants/view-models/botanical-reference.vm';

export const dynamic = 'force-dynamic';

// Temporary diagnostic endpoint — REMOVE AFTER DEBUG
// Usage: GET /api/debug/plant-detail?id=AT-PL-001
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || 'AT-PL-001';

  const steps: Record<string, string> = {};
  let lastStep = 'init';

  try {
    // Step 1: get plant
    lastStep = 'getPlant';
    const plantRepository = new PrismaPlantRepository();
    const getPlantUseCase = new GetPlantUseCase(plantRepository);
    const isPermanentCode = id.toUpperCase().startsWith('AT-PL-');
    const plant = isPermanentCode
      ? await getPlantUseCase.executeByPermanentCode(id.toUpperCase())
      : await getPlantUseCase.executeById(id);

    steps.getPlant = `OK: ${plant.permanent_code} (${plant.id})`;

    // Step 2: parse botanical reference
    lastStep = 'parseBotanicalReference';
    let botanicalReference = null;
    if (plant.reference) {
      botanicalReference = parseBotanicalReferenceViewModel(plant.reference);
      steps.parseBotanicalReference = `OK: ${botanicalReference ? 'parsed' : 'null'}`;
    } else {
      steps.parseBotanicalReference = 'skipped (no reference)';
    }

    // Step 3: recent events
    lastStep = 'recentEvents';
    const eventRepo = getPlantOperationalEventRepository();
    const recentEvents = await eventRepo.findRecentByPlantId(plant.id, 5);
    steps.recentEvents = `OK: ${recentEvents.length} events`;

    // Step 4: care context
    lastStep = 'careContext';
    const careContextUseCase = getPlantCareContextUseCase();
    const careContext = await careContextUseCase.execute(plant);
    steps.careContext = careContext ? `OK: careContext obtained` : 'null';

    // Step 5: sanitize care context
    lastStep = 'sanitizeCareContext';
    const sanitizedCareContext = careContext
      ? {
          ...careContext,
          recent_context: careContext.recent_context
            ? {
                ...careContext.recent_context,
                last_operational_events: (
                  careContext.recent_context.last_operational_events || []
                ).map((evt) => ({
                  ...evt,
                  event_key: '',
                  metadata: null,
                })),
              }
            : {
                last_operational_events: [],
                last_photo_at: null,
                recent_photo_caption: null,
              },
        }
      : null;
    steps.sanitizeCareContext = 'OK';

    return NextResponse.json({
      ok: true,
      steps,
      plant_id: plant.id,
      permanent_code: plant.permanent_code,
      has_reference: !!plant.reference,
      has_ha_binding: !!plant.ha_binding,
      recent_context_keys: sanitizedCareContext?.recent_context
        ? Object.keys(sanitizedCareContext.recent_context)
        : null,
    });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json(
      {
        ok: false,
        failed_at: lastStep,
        completed_steps: steps,
        error_name: error?.name || 'unknown',
        error_message: error?.message || String(e),
        error_stack: (error?.stack || '').split('\n').slice(0, 8).join('\n'),
      },
      { status: 500 }
    );
  }
}
