import React from 'react';
import { notFound } from 'next/navigation';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { GetPlantUseCase } from '@/core/application/use-cases/GetPlantUseCase';
import {
  getPlantLiveTelemetryUseCase,
  getPlantOperationalEventRepository,
  getPlantCareContextUseCase,
} from '@/infrastructure/services/serviceContainer';
import { PlantDetailView } from '@/features/plants/components';
import { parseBotanicalReferenceViewModel } from '@/features/plants/view-models/botanical-reference.vm';
import { PlantLiveTelemetryDTO } from '@/core/application/use-cases/GetPlantLiveTelemetryUseCase';
import { PlantEntity, PlantOperationalEventEntity, PlantCareContextDTO } from '@/core/domain/entities';

export const dynamic = 'force-dynamic';

interface PlantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlantDetailPage({ params }: PlantDetailPageProps) {
  const { id } = await params;

  const plantRepository = new PrismaPlantRepository();
  const getPlantUseCase = new GetPlantUseCase(plantRepository);

  let plant;
  try {
    // La búsqueda se realiza prioritariamente por permanent_code (AT-PL-XXX)
    // o fallback a id si es un UUID
    plant = id.toUpperCase().startsWith('AT-PL-')
      ? await getPlantUseCase.executeByPermanentCode(id.toUpperCase())
      : await getPlantUseCase.executeById(id);
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err?.name === 'PlantNotFoundError' || err?.name === 'PlantValidationError') {
      notFound();
    }
    // Errores no controlados son atrapados por error.tsx
    throw error;
  }

  if (!plant) {
    notFound();
  }

  // Parse server-side to sanitize botanical reference ViewModel (zero raw_data / UUID leakage)
  const botanicalReference = plant.reference
    ? parseBotanicalReferenceViewModel(plant.reference)
    : null;

  // Retrieve server-side live telemetry from Home Assistant if binding exists
  let liveTelemetry: PlantLiveTelemetryDTO | null = null;
  if (plant.ha_binding) {
    try {
      const liveTelemetryUseCase = getPlantLiveTelemetryUseCase();
      liveTelemetry = await liveTelemetryUseCase.execute(plant);
    } catch {
      liveTelemetry = {
        plant_id: plant.id,
        permanent_code: plant.permanent_code,
        binding_configured: true,
        available: false,
        moisture: null,
        hardware: null,
        error_reason: 'Home Assistant no disponible',
      };
    }
  }

  // Retrieve recent operational events
  let recentEvents: PlantOperationalEventEntity[] = [];
  try {
    const eventRepo = getPlantOperationalEventRepository();
    recentEvents = await eventRepo.findRecentByPlantId(plant.id, 5);
  } catch {
    recentEvents = [];
  }

  // Compute deterministic dynamic care context (ATP-CARE-001)
  let careContext: PlantCareContextDTO | null = null;
  try {
    const careContextUseCase = getPlantCareContextUseCase();
    careContext = await careContextUseCase.execute(plant);
  } catch {
    careContext = null;
  }

  // Sanitize client-side plant entity and recent events to prevent leaking Home Assistant entity IDs into client RSC bundle
  const clientPlant: PlantEntity = {
    ...plant,
    ha_binding: undefined,
  };

  const sanitizedRecentEvents: PlantOperationalEventEntity[] = recentEvents.map((evt) => ({
    ...evt,
    event_key: '',
    metadata: null,
  }));

  const sanitizedCareContext: PlantCareContextDTO | null = careContext
    ? {
        ...careContext,
        recent_context: {
          ...careContext.recent_context,
          last_operational_events: careContext.recent_context.last_operational_events.map((evt) => ({
            ...evt,
            event_key: '',
            metadata: null,
          })),
        },
      }
    : null;

  return (
    <section>
      <PlantDetailView
        plant={clientPlant}
        botanicalReference={botanicalReference}
        liveTelemetry={liveTelemetry}
        careContext={sanitizedCareContext}
        recentEvents={sanitizedRecentEvents}
      />
    </section>
  );
}



