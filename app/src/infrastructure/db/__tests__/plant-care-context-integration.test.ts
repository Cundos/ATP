import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../prisma';
import { getPlantCareContextUseCase } from '../../services/serviceContainer';

describe('PlantCareContext Integration (ATP-CARE-001)', () => {
  const careContextUseCase = getPlantCareContextUseCase();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('can evaluate dynamic care context for AT-PL-007 from database', async () => {
    const context = await careContextUseCase.executeByPermanentCode('AT-PL-007');

    expect(context).not.toBeNull();
    expect(context.permanent_code).toBe('AT-PL-007');
    expect(context.assessment).toBeDefined();
    expect(['OK', 'WATCH', 'ACTION_RECOMMENDED', 'DATA_INSUFFICIENT']).toContain(
      context.assessment.status
    );
    expect(context.current_conditions).toBeDefined();
    expect(context.data_quality).toBeDefined();
    expect(Array.isArray(context.assessment.recommendations)).toBe(true);
  });
});
