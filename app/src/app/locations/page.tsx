import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PrismaLocationRepository } from '@/infrastructure/db/repositories/PrismaLocationRepository';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { ListLocationsUseCase } from '@/core/application/use-cases/ListLocationsUseCase';
import { ListPlantsUseCase } from '@/core/application/use-cases/ListPlantsUseCase';
import { LocationListView } from '@/features/locations/components';

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const locationRepository = new PrismaLocationRepository();
  const listLocationsUseCase = new ListLocationsUseCase(locationRepository);

  const plantRepository = new PrismaPlantRepository();
  const listPlantsUseCase = new ListPlantsUseCase(plantRepository);

  // Carga todas las ubicaciones administradas (activas y archivadas)
  const locations = await listLocationsUseCase.execute();

  // Carga ejemplares para calcular conteos en tiempo real
  const allPlants = await listPlantsUseCase.execute();

  const plantCounts: Record<string, { total: number; active: number; archived: number }> = {};
  for (const plant of allPlants) {
    if (plant.location_id) {
      if (!plantCounts[plant.location_id]) {
        plantCounts[plant.location_id] = { total: 0, active: 0, archived: 0 };
      }
      plantCounts[plant.location_id].total++;
      if (plant.lifecycle_status === 'ACTIVE') {
        plantCounts[plant.location_id].active++;
      } else {
        plantCounts[plant.location_id].archived++;
      }
    }
  }

  return (
    <section>
      <div style={{ marginBottom: '20px' }}>
        <Link
          href="/"
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
          <span>Volver al Inicio</span>
        </Link>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '0 0 6px 0',
            color: 'var(--text-primary)',
          }}
        >
          Catálogo de Ubicaciones
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
          }}
        >
          Administrá los espacios físicos del hogar para organizar y ubicar tus ejemplares.
        </p>
      </div>

      <LocationListView
        key={locations.map((l) => `${l.id}-${l.name}-${l.lifecycle_status}`).join('|')}
        initialLocations={locations}
        plantCounts={plantCounts}
      />
    </section>
  );
}
