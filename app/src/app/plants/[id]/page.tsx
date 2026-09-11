import React from 'react';
import { notFound } from 'next/navigation';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { GetPlantUseCase } from '@/core/application/use-cases/GetPlantUseCase';
import { PlantDetailView } from '@/features/plants/components';
import { parseBotanicalReferenceViewModel } from '@/features/plants/view-models/botanical-reference.vm';

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

  return (
    <section>
      <PlantDetailView plant={plant} botanicalReference={botanicalReference} />
    </section>
  );
}

