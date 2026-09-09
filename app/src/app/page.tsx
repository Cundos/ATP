import React from 'react';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { ListPlantsUseCase } from '@/core/application/use-cases/ListPlantsUseCase';
import { DashboardView } from '@/features/dashboard/components';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const plantRepository = new PrismaPlantRepository();
  const listPlantsUseCase = new ListPlantsUseCase(plantRepository);

  const activePlants = await listPlantsUseCase.execute({
    lifecycle_status: 'ACTIVE',
  });

  return (
    <section>
      <DashboardView plants={activePlants} />
    </section>
  );
}


