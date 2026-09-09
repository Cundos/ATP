import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { PrismaLocationRepository } from '@/infrastructure/db/repositories/PrismaLocationRepository';
import { GetPlantUseCase } from '@/core/application/use-cases/GetPlantUseCase';
import { ListLocationsUseCase } from '@/core/application/use-cases/ListLocationsUseCase';
import { PlantForm } from '@/features/plants/components';
import { PlantEntity } from '@/core/domain/entities';

export const dynamic = 'force-dynamic';

interface EditPlantPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPlantPage({ params }: EditPlantPageProps) {
  const { id } = await params;

  const plantRepository = new PrismaPlantRepository();
  const getPlantUseCase = new GetPlantUseCase(plantRepository);

  const locationRepository = new PrismaLocationRepository();
  const listLocationsUseCase = new ListLocationsUseCase(locationRepository);

  let plant: PlantEntity | null = null;
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

  const activeLocations = await listLocationsUseCase.execute({ status: 'ACTIVE' });

  return (
    <section>
      <div style={{ marginBottom: '20px' }}>
        <Link
          href={`/plants/${plant.permanent_code}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.875rem',
            color: 'var(--brand-primary)',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Volver a la Ficha</span>
        </Link>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '0 0 6px 0',
            color: 'var(--text-primary)',
          }}
        >
          Editar Ejemplar {plant.permanent_code}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
          }}
        >
          Modificá los datos botánicos, estado sanitario, ubicación o notas de cultivo.
        </p>
      </div>

      <PlantForm
        mode="edit"
        initialData={plant}
        activeLocations={activeLocations}
      />
    </section>
  );
}