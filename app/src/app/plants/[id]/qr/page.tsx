import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { GetPlantUseCase } from '@/core/application/use-cases/GetPlantUseCase';
import { PlantQrPrintView } from '@/features/plants/components';

export const dynamic = 'force-dynamic';

interface PlantQrPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PlantQrPageProps): Promise<Metadata> {
  const { id } = await params;
  const plantRepository = new PrismaPlantRepository();
  const getPlantUseCase = new GetPlantUseCase(plantRepository);

  try {
    const plant = id.toUpperCase().startsWith('AT-PL-')
      ? await getPlantUseCase.executeByPermanentCode(id.toUpperCase())
      : await getPlantUseCase.executeById(id);

    if (!plant) {
      return { title: 'Identificador QR — Atilio Plants' };
    }

    return {
      title: `QR ${plant.permanent_code} (${plant.common_name}) — Atilio Plants`,
      description: `Código QR para identificación y acceso directo a la ficha de ${plant.common_name}.`,
    };
  } catch {
    return { title: 'Identificador QR — Atilio Plants' };
  }
}

export default async function PlantQrPage({ params }: PlantQrPageProps) {
  const { id } = await params;

  const plantRepository = new PrismaPlantRepository();
  const getPlantUseCase = new GetPlantUseCase(plantRepository);

  let plant;
  try {
    plant = id.toUpperCase().startsWith('AT-PL-')
      ? await getPlantUseCase.executeByPermanentCode(id.toUpperCase())
      : await getPlantUseCase.executeById(id);
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err?.name === 'PlantNotFoundError' || err?.name === 'PlantValidationError') {
      notFound();
    }
    throw error;
  }

  if (!plant) {
    notFound();
  }

  return (
    <main>
      <PlantQrPrintView
        permanentCode={plant.permanent_code}
        commonName={plant.common_name}
        scientificName={plant.scientific_name}
      />
    </main>
  );
}
