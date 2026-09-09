import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { ListPlantsUseCase } from '@/core/application/use-cases/ListPlantsUseCase';
import { ArchivedPlantsView } from '@/features/plants/components';

export const dynamic = 'force-dynamic';

export default async function ArchivedPlantsPage() {
  const plantRepository = new PrismaPlantRepository();
  const listPlantsUseCase = new ListPlantsUseCase(plantRepository);

  const archivedPlants = await listPlantsUseCase.execute({
    lifecycle_status: 'ARCHIVED',
  });

  return (
    <section>
      <div style={{ marginBottom: '20px' }}>
        <Link
          href="/inventory"
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
          <span>Volver al Inventario</span>
        </Link>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: '0 0 6px 0',
            color: 'var(--text-primary)',
          }}
        >
          Plantas Archivadas
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
          }}
        >
          Historial de ejemplares dados de baja. Podés restaurar cualquier ejemplar manteniendo su código e historial.
        </p>
      </div>

      <ArchivedPlantsView initialPlants={archivedPlants} />
    </section>
  );
}
