import React from 'react';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { PrismaLocationRepository } from '@/infrastructure/db/repositories/PrismaLocationRepository';
import { ListPlantsUseCase } from '@/core/application/use-cases/ListPlantsUseCase';
import { ListLocationsUseCase } from '@/core/application/use-cases/ListLocationsUseCase';
import { PlantCatalogView } from '@/features/plants/components';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  // Instanciación de repositorios y casos de uso en el servidor
  const plantRepository = new PrismaPlantRepository();
  const locationRepository = new PrismaLocationRepository();

  const listPlantsUseCase = new ListPlantsUseCase(plantRepository);
  const listLocationsUseCase = new ListLocationsUseCase(locationRepository);

  // Ejecutar lecturas server-side: solo plantas ACTIVE y ubicaciones ACTIVE
  const [plants, locations] = await Promise.all([
    listPlantsUseCase.execute({ lifecycle_status: 'ACTIVE', order_by: 'permanent_code_asc' }),
    listLocationsUseCase.execute({ status: 'ACTIVE' }),
  ]);

  return (
    <section>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif-family)', fontSize: '1.75rem', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Inventario de Plantas
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          Catálogo completo de ejemplares activos en cultivo.
        </p>
      </div>

      <PlantCatalogView initialPlants={plants} locations={locations} />
    </section>
  );
}

