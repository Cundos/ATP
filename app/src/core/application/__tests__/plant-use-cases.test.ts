import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreatePlantUseCase,
  UpdatePlantUseCase,
  ArchivePlantUseCase,
  RestorePlantUseCase,
  GetPlantUseCase,
  ListPlantsUseCase,
  PlantNotFoundError,
  PlantValidationError,
} from '../index';
import { IPlantRepository, CreatePlantPersistenceDTO, UpdatePlantDTO } from '@/core/domain/repositories';
import { PlantEntity } from '@/core/domain/entities';

describe('Plant Application Use Cases Unit Tests (ATP-IMP-008)', () => {
  let mockPlantRepo: IPlantRepository;
  let samplePlant: PlantEntity;

  beforeEach(() => {
    samplePlant = {
      id: '01928374-uuid-plant-1',
      permanent_code: 'AT-PL-001',
      common_name: 'Gomero',
      scientific_name: 'Ficus elastica',
      cultivar: null,
      health_status: 'HEALTHY',
      lifecycle_status: 'ACTIVE',
      acquisition_date: null,
      notes: 'Nota inicial',
      location_id: null,
      reference_id: null,
      created_at: new Date('2026-09-01T12:00:00Z'),
      updated_at: new Date('2026-09-01T12:00:00Z'),
    };

    mockPlantRepo = {
      findById: vi.fn(async (id: string) => (id === samplePlant.id ? { ...samplePlant } : null)),
      findByPermanentCode: vi.fn(async (code: string) =>
        code === samplePlant.permanent_code ? { ...samplePlant } : null
      ),
      findAll: vi.fn(async () => [{ ...samplePlant }]),
      create: vi.fn(async (dto: CreatePlantPersistenceDTO) => ({
        id: 'new-uuid',
        ...dto,
        scientific_name: dto.scientific_name ?? null,
        cultivar: dto.cultivar ?? null,
        health_status: dto.health_status ?? 'UNKNOWN',
        lifecycle_status: 'ACTIVE' as const,
        acquisition_date: dto.acquisition_date ?? null,
        notes: dto.notes ?? null,
        location_id: dto.location_id ?? null,
        reference_id: dto.reference_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      update: vi.fn(async (id: string, dto: UpdatePlantDTO) => {
        return {
          ...samplePlant,
          ...dto,
          id, // El ID permanece invariante
          permanent_code: samplePlant.permanent_code, // El código permanece inmutable
        };
      }),
      archive: vi.fn(async (id: string) => ({
        ...samplePlant,
        id,
        lifecycle_status: 'ARCHIVED' as const,
      })),
      restore: vi.fn(async (id: string) => ({
        ...samplePlant,
        id,
        lifecycle_status: 'ACTIVE' as const,
      })),
      getNextSequenceValue: vi.fn(async () => 14),
    };
  });

  // ==========================================
  // CREATE PLANT
  // ==========================================
  describe('CreatePlantUseCase', () => {
    it('debe generar código permanente mediante secuencia y aplicar defaults (UNKNOWN, ACTIVE)', async () => {
      const useCase = new CreatePlantUseCase(mockPlantRepo);

      const result = await useCase.execute({
        common_name: 'Pothos Verde',
      });

      expect(mockPlantRepo.getNextSequenceValue).toHaveBeenCalledTimes(1);
      expect(mockPlantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          common_name: 'Pothos Verde',
          permanent_code: 'AT-PL-014',
          health_status: 'UNKNOWN',
          acquisition_date: null,
          location_id: null,
          reference_id: null,
        })
      );
      expect(result.permanent_code).toBe('AT-PL-014');
      expect(result.health_status).toBe('UNKNOWN');
      expect(result.lifecycle_status).toBe('ACTIVE');
    });

    it('debe permitir especificar health_status y acquisition_date en la creación', async () => {
      const useCase = new CreatePlantUseCase(mockPlantRepo);
      const testDate = new Date('2026-09-05T00:00:00Z');

      const result = await useCase.execute({
        common_name: 'Croton',
        health_status: 'ATTENTION',
        acquisition_date: testDate,
      });

      expect(result.health_status).toBe('ATTENTION');
      expect(result.acquisition_date).toEqual(testDate);
    });

    it('debe rechazar common_name vacío o compuesto solo por espacios', async () => {
      const useCase = new CreatePlantUseCase(mockPlantRepo);

      await expect(useCase.execute({ common_name: '' })).rejects.toThrow(PlantValidationError);
      await expect(useCase.execute({ common_name: '   ' })).rejects.toThrow(PlantValidationError);
      expect(mockPlantRepo.create).not.toHaveBeenCalled();
    });

    it('no debe admitir ni aceptar permanent_code suministrado externamente en el comando', async () => {
      const useCase = new CreatePlantUseCase(mockPlantRepo);

      // Simulamos un payload que intenta inyectar permanent_code en runtime
      const maliciousPayload = {
        common_name: 'Planta Inyectada',
        permanent_code: 'AT-PL-999',
      };

      const result = await useCase.execute(maliciousPayload as unknown as typeof maliciousPayload & { common_name: string });
      // El permanent_code DEBE ser el derivado de la secuencia (AT-PL-014), no el inyectado
      expect(result.permanent_code).toBe('AT-PL-014');
      expect(result.permanent_code).not.toBe('AT-PL-999');
    });
  });

  // ==========================================
  // UPDATE PLANT
  // ==========================================
  describe('UpdatePlantUseCase', () => {
    it('debe modificar atributos mutables permitidos', async () => {
      const useCase = new UpdatePlantUseCase(mockPlantRepo);

      const result = await useCase.execute(samplePlant.id, {
        common_name: 'Gomero Renovado',
        health_status: 'RECOVERY',
        notes: 'Nueva nota de prueba',
      });

      expect(mockPlantRepo.update).toHaveBeenCalledWith(
        samplePlant.id,
        expect.objectContaining({
          common_name: 'Gomero Renovado',
          health_status: 'RECOVERY',
          notes: 'Nueva nota de prueba',
        })
      );
      expect(result.common_name).toBe('Gomero Renovado');
      expect(result.health_status).toBe('RECOVERY');
    });

    it('debe rechazar actualización si common_name se envía vacío', async () => {
      const useCase = new UpdatePlantUseCase(mockPlantRepo);

      await expect(
        useCase.execute(samplePlant.id, {
          common_name: '   ',
        })
      ).rejects.toThrow(PlantValidationError);

      expect(mockPlantRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar PlantNotFoundError si la planta a actualizar no existe', async () => {
      const useCase = new UpdatePlantUseCase(mockPlantRepo);

      await expect(
        useCase.execute('id-inexistente', {
          common_name: 'Nombre Valido',
        })
      ).rejects.toThrow(PlantNotFoundError);

      expect(mockPlantRepo.update).not.toHaveBeenCalled();
    });

    it('debe preservar estrictamente permanent_code e id como inmutables', async () => {
      const useCase = new UpdatePlantUseCase(mockPlantRepo);

      // Intentar inyectar permanent_code en runtime
      const payloadWithCode = {
        common_name: 'Planta Modificada',
        permanent_code: 'AT-PL-777',
      };

      const result = await useCase.execute(samplePlant.id, payloadWithCode as unknown as typeof payloadWithCode & { common_name: string });
      expect(result.permanent_code).toBe('AT-PL-001');
      expect(result.id).toBe(samplePlant.id);
    });
  });

  // ==========================================
  // ARCHIVE PLANT
  // ==========================================
  describe('ArchivePlantUseCase', () => {
    it('debe cambiar lifecycle_status a ARCHIVED preservando el permanent_code', async () => {
      const useCase = new ArchivePlantUseCase(mockPlantRepo);

      const result = await useCase.execute(samplePlant.id);

      expect(mockPlantRepo.archive).toHaveBeenCalledWith(samplePlant.id);
      expect(result.lifecycle_status).toBe('ARCHIVED');
      expect(result.permanent_code).toBe(samplePlant.permanent_code);
    });

    it('debe ser idempotente si la planta ya se encuentra archivada', async () => {
      samplePlant.lifecycle_status = 'ARCHIVED';
      const useCase = new ArchivePlantUseCase(mockPlantRepo);

      const result = await useCase.execute(samplePlant.id);

      expect(result.lifecycle_status).toBe('ARCHIVED');
      // No necesita llamar a repository.archive de nuevo
      expect(mockPlantRepo.archive).not.toHaveBeenCalled();
    });

    it('debe lanzar PlantNotFoundError si se intenta archivar una planta inexistente', async () => {
      const useCase = new ArchivePlantUseCase(mockPlantRepo);

      await expect(useCase.execute('uuid-no-existe')).rejects.toThrow(PlantNotFoundError);
      expect(mockPlantRepo.archive).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // RESTORE PLANT
  // ==========================================
  describe('RestorePlantUseCase', () => {
    it('debe restaurar una planta archivada a ACTIVE preservando permanent_code', async () => {
      samplePlant.lifecycle_status = 'ARCHIVED';
      const useCase = new RestorePlantUseCase(mockPlantRepo);

      const result = await useCase.execute(samplePlant.id);

      expect(mockPlantRepo.restore).toHaveBeenCalledWith(samplePlant.id);
      expect(result.lifecycle_status).toBe('ACTIVE');
      expect(result.permanent_code).toBe(samplePlant.permanent_code);
    });

    it('debe ser idempotente si la planta ya se encuentra activa', async () => {
      samplePlant.lifecycle_status = 'ACTIVE';
      const useCase = new RestorePlantUseCase(mockPlantRepo);

      const result = await useCase.execute(samplePlant.id);

      expect(result.lifecycle_status).toBe('ACTIVE');
      expect(mockPlantRepo.restore).not.toHaveBeenCalled();
    });

    it('debe lanzar PlantNotFoundError si se intenta restaurar una planta inexistente', async () => {
      const useCase = new RestorePlantUseCase(mockPlantRepo);

      await expect(useCase.execute('uuid-no-existe')).rejects.toThrow(PlantNotFoundError);
      expect(mockPlantRepo.restore).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // GET PLANT
  // ==========================================
  describe('GetPlantUseCase', () => {
    it('debe retornar la entidad cuando se busca por id existente', async () => {
      const useCase = new GetPlantUseCase(mockPlantRepo);

      const result = await useCase.executeById(samplePlant.id);
      expect(result.id).toBe(samplePlant.id);
      expect(result.permanent_code).toBe(samplePlant.permanent_code);
    });

    it('debe lanzar PlantNotFoundError cuando se busca por id inexistente', async () => {
      const useCase = new GetPlantUseCase(mockPlantRepo);

      await expect(useCase.executeById('uuid-inexistente')).rejects.toThrow(PlantNotFoundError);
    });

    it('debe retornar la entidad cuando se busca por permanent_code existente', async () => {
      const useCase = new GetPlantUseCase(mockPlantRepo);

      const result = await useCase.executeByPermanentCode('AT-PL-001');
      expect(result.id).toBe(samplePlant.id);
      expect(result.permanent_code).toBe('AT-PL-001');
    });

    it('debe lanzar PlantNotFoundError cuando se busca por permanent_code inexistente', async () => {
      const useCase = new GetPlantUseCase(mockPlantRepo);

      await expect(useCase.executeByPermanentCode('AT-PL-999')).rejects.toThrow(PlantNotFoundError);
    });
  });

  // ==========================================
  // LIST PLANTS
  // ==========================================
  describe('ListPlantsUseCase', () => {
    it('debe delegar los filtros y mantener el orden default permanent_code_asc', async () => {
      const useCase = new ListPlantsUseCase(mockPlantRepo);

      const result = await useCase.execute({
        lifecycle_status: 'ACTIVE',
        health_status: 'HEALTHY',
        search_query: 'Ficus',
      });

      expect(mockPlantRepo.findAll).toHaveBeenCalledWith({
        lifecycle_status: 'ACTIVE',
        health_status: 'HEALTHY',
        location_id: undefined,
        search_query: 'Ficus',
        order_by: 'permanent_code_asc',
      });
      expect(result).toHaveLength(1);
    });

    it('debe soportar orden alternativo si se solicita explícitamente', async () => {
      const useCase = new ListPlantsUseCase(mockPlantRepo);

      await useCase.execute({
        order_by: 'created_at_desc',
      });

      expect(mockPlantRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order_by: 'created_at_desc',
        })
      );
    });
  });
});