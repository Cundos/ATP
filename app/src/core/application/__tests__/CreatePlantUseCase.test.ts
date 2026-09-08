import { describe, it, expect, vi } from 'vitest';
import { CreatePlantUseCase } from '../use-cases/CreatePlantUseCase';
import { IPlantRepository, CreatePlantPersistenceDTO } from '@/core/domain/repositories';
import { PlantEntity } from '@/core/domain/entities';

describe('CreatePlantUseCase (ATP-IMP-004)', () => {
  it('debe coordinar la obtención de la secuencia, formatear a AT-PL-XXX y persistir en el repositorio', async () => {
    let persistedDTO: CreatePlantPersistenceDTO | null = null;

    const mockRepo: IPlantRepository = {
      findById: vi.fn(),
      findByPermanentCode: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(async (dto) => {
        persistedDTO = dto;
        return {
          id: 'mock-uuid',
          ...dto,
          created_at: new Date(),
          updated_at: new Date(),
        } as unknown as PlantEntity;
      }),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      getNextSequenceValue: vi.fn(async () => 14),
    };

    const useCase = new CreatePlantUseCase(mockRepo);

    const result = await useCase.execute({
      common_name: 'Ficus elastica',
      scientific_name: 'Ficus elastica',
      health_status: 'HEALTHY',
    });

    expect(mockRepo.getNextSequenceValue).toHaveBeenCalledTimes(1);
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(persistedDTO).not.toBeNull();
    expect(persistedDTO!.permanent_code).toBe('AT-PL-014');
    expect(result.permanent_code).toBe('AT-PL-014');
    expect(result.common_name).toBe('Ficus elastica');
  });
});