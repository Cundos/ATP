import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateLocationUseCase,
  RenameLocationUseCase,
  ArchiveLocationUseCase,
  RestoreLocationUseCase,
  ListLocationsUseCase,
  LocationNotFoundError,
  LocationValidationError,
  LocationAlreadyExistsError,
} from '../index';
import {
  ILocationRepository,
  CreateLocationDTO,
  UpdateLocationDTO,
} from '@/core/domain/repositories';
import { LocationEntity, LifecycleStatus } from '@/core/domain/entities';

describe('Location Application Use Cases Unit Tests (ATP-IMP-009)', () => {
  let mockLocationRepo: ILocationRepository;
  let sampleLocation: LocationEntity;

  beforeEach(() => {
    sampleLocation = {
      id: '01928374-uuid-loc-1',
      name: 'Balcón',
      lifecycle_status: 'ACTIVE',
      created_at: new Date('2026-09-01T10:00:00Z'),
      updated_at: new Date('2026-09-01T10:00:00Z'),
    };

    mockLocationRepo = {
      findById: vi.fn(async (id: string) => (id === sampleLocation.id ? { ...sampleLocation } : null)),
      findByName: vi.fn(async (name: string) => {
        if (sampleLocation.lifecycle_status === 'ACTIVE' && sampleLocation.name.toLowerCase() === name.trim().toLowerCase()) {
          return { ...sampleLocation };
        }
        return null;
      }),
      findAll: vi.fn(async (status?: LifecycleStatus) => {
        if (!status || sampleLocation.lifecycle_status === status) {
          return [{ ...sampleLocation }];
        }
        return [];
      }),
      create: vi.fn(async (dto: CreateLocationDTO) => ({
        id: 'new-uuid-loc',
        name: dto.name.trim(),
        lifecycle_status: 'ACTIVE' as const,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      update: vi.fn(async (id: string, dto: UpdateLocationDTO) => ({
        ...sampleLocation,
        id,
        name: dto.name.trim(),
      })),
      archive: vi.fn(async (id: string) => ({
        ...sampleLocation,
        id,
        lifecycle_status: 'ARCHIVED' as const,
      })),
      restore: vi.fn(async (id: string) => ({
        ...sampleLocation,
        id,
        lifecycle_status: 'ACTIVE' as const,
      })),
    };
  });

  // ==========================================
  // CREATE LOCATION
  // ==========================================
  describe('CreateLocationUseCase', () => {
    it('debe crear una ubicación con nombre válido, aplicando trim y lifecycle ACTIVE', async () => {
      const useCase = new CreateLocationUseCase(mockLocationRepo);

      const result = await useCase.execute({ name: '   Patio Trasero   ' });

      expect(mockLocationRepo.findByName).toHaveBeenCalledWith('Patio Trasero');
      expect(mockLocationRepo.create).toHaveBeenCalledWith({ name: 'Patio Trasero' });
      expect(result.name).toBe('Patio Trasero');
      expect(result.lifecycle_status).toBe('ACTIVE');
    });

    it('debe rechazar nombre vacío o de espacios', async () => {
      const useCase = new CreateLocationUseCase(mockLocationRepo);

      await expect(useCase.execute({ name: '' })).rejects.toThrow(LocationValidationError);
      await expect(useCase.execute({ name: '   ' })).rejects.toThrow(LocationValidationError);
      expect(mockLocationRepo.create).not.toHaveBeenCalled();
    });

    it('debe rechazar nombre con menos de 2 caracteres', async () => {
      const useCase = new CreateLocationUseCase(mockLocationRepo);

      await expect(useCase.execute({ name: 'A' })).rejects.toThrow(LocationValidationError);
      await expect(useCase.execute({ name: ' B ' })).rejects.toThrow(LocationValidationError);
      expect(mockLocationRepo.create).not.toHaveBeenCalled();
    });

    it('debe rechazar nombre con más de 50 caracteres', async () => {
      const useCase = new CreateLocationUseCase(mockLocationRepo);
      const longName = 'A'.repeat(51);

      await expect(useCase.execute({ name: longName })).rejects.toThrow(LocationValidationError);
      expect(mockLocationRepo.create).not.toHaveBeenCalled();
    });

    it('debe rechazar creación si ya existe otra ubicación ACTIVE con el mismo nombre (case-insensitive)', async () => {
      const useCase = new CreateLocationUseCase(mockLocationRepo);

      // 'balcón' colisiona case-insensitively con 'Balcón'
      await expect(useCase.execute({ name: 'balcón' })).rejects.toThrow(LocationAlreadyExistsError);
      expect(mockLocationRepo.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // RENAME LOCATION
  // ==========================================
  describe('RenameLocationUseCase', () => {
    it('debe renombrar una ubicación válida aplicando trim', async () => {
      const useCase = new RenameLocationUseCase(mockLocationRepo);

      const result = await useCase.execute(sampleLocation.id, { name: '  Terraza Norte  ' });

      expect(mockLocationRepo.update).toHaveBeenCalledWith(sampleLocation.id, { name: 'Terraza Norte' });
      expect(result.name).toBe('Terraza Norte');
    });

    it('debe permitir conservar el mismo nombre de la propia ubicación sin lanzar colisión', async () => {
      const useCase = new RenameLocationUseCase(mockLocationRepo);

      const result = await useCase.execute(sampleLocation.id, { name: 'Balcón' });

      expect(result.name).toBe('Balcón');
      // No necesita mutar
      expect(mockLocationRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar LocationNotFoundError si la ubicación a renombrar no existe', async () => {
      const useCase = new RenameLocationUseCase(mockLocationRepo);

      await expect(useCase.execute('uuid-inexistente', { name: 'Living' })).rejects.toThrow(
        LocationNotFoundError
      );
      expect(mockLocationRepo.update).not.toHaveBeenCalled();
    });

    it('debe rechazar nombres inválidos (< 2 o > 50 chars)', async () => {
      const useCase = new RenameLocationUseCase(mockLocationRepo);

      await expect(useCase.execute(sampleLocation.id, { name: 'X' })).rejects.toThrow(
        LocationValidationError
      );
      await expect(useCase.execute(sampleLocation.id, { name: 'Z'.repeat(51) })).rejects.toThrow(
        LocationValidationError
      );
    });

    it('debe rechazar renombre si colisiona con OTRA ubicación ACTIVE (case-insensitive)', async () => {
      const useCase = new RenameLocationUseCase(mockLocationRepo);

      // Simulamos que existe OTRA ubicación activa con id 'otra-loc' y nombre 'Cocina'
      vi.mocked(mockLocationRepo.findByName).mockImplementationOnce(async (name) => {
        if (name.toLowerCase() === 'cocina') {
          return {
            id: 'otra-loc-uuid',
            name: 'Cocina',
            lifecycle_status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date(),
          };
        }
        return null;
      });

      await expect(useCase.execute(sampleLocation.id, { name: 'cocina' })).rejects.toThrow(
        LocationAlreadyExistsError
      );
      expect(mockLocationRepo.update).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // ARCHIVE LOCATION
  // ==========================================
  describe('ArchiveLocationUseCase', () => {
    it('debe archivar la ubicación cambiando lifecycle_status a ARCHIVED', async () => {
      const useCase = new ArchiveLocationUseCase(mockLocationRepo);

      const result = await useCase.execute(sampleLocation.id);

      expect(mockLocationRepo.archive).toHaveBeenCalledWith(sampleLocation.id);
      expect(result.lifecycle_status).toBe('ARCHIVED');
    });

    it('debe ser idempotente si la ubicación ya está archivada', async () => {
      sampleLocation.lifecycle_status = 'ARCHIVED';
      const useCase = new ArchiveLocationUseCase(mockLocationRepo);

      const result = await useCase.execute(sampleLocation.id);

      expect(result.lifecycle_status).toBe('ARCHIVED');
      expect(mockLocationRepo.archive).not.toHaveBeenCalled();
    });

    it('debe lanzar LocationNotFoundError si la ubicación no existe', async () => {
      const useCase = new ArchiveLocationUseCase(mockLocationRepo);

      await expect(useCase.execute('uuid-no-existe')).rejects.toThrow(LocationNotFoundError);
      expect(mockLocationRepo.archive).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // RESTORE LOCATION
  // ==========================================
  describe('RestoreLocationUseCase', () => {
    it('debe restaurar una ubicación archivada a ACTIVE si no hay conflictos', async () => {
      sampleLocation.lifecycle_status = 'ARCHIVED';
      const useCase = new RestoreLocationUseCase(mockLocationRepo);

      const result = await useCase.execute(sampleLocation.id);

      expect(mockLocationRepo.restore).toHaveBeenCalledWith(sampleLocation.id);
      expect(result.lifecycle_status).toBe('ACTIVE');
    });

    it('debe ser idempotente si la ubicación ya está activa', async () => {
      sampleLocation.lifecycle_status = 'ACTIVE';
      const useCase = new RestoreLocationUseCase(mockLocationRepo);

      const result = await useCase.execute(sampleLocation.id);

      expect(result.lifecycle_status).toBe('ACTIVE');
      expect(mockLocationRepo.restore).not.toHaveBeenCalled();
    });

    it('debe lanzar LocationNotFoundError si la ubicación no existe', async () => {
      const useCase = new RestoreLocationUseCase(mockLocationRepo);

      await expect(useCase.execute('uuid-no-existe')).rejects.toThrow(LocationNotFoundError);
      expect(mockLocationRepo.restore).not.toHaveBeenCalled();
    });

    it('debe rechazar la restauración si existe OTRA ubicación ACTIVE con el mismo nombre', async () => {
      sampleLocation.lifecycle_status = 'ARCHIVED';
      const useCase = new RestoreLocationUseCase(mockLocationRepo);

      // Simulamos que se creó otra ubicación ACTIVE con el mismo nombre mientras esta estaba archivada
      vi.mocked(mockLocationRepo.findByName).mockResolvedValueOnce({
        id: 'otra-location-diferente',
        name: sampleLocation.name,
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(useCase.execute(sampleLocation.id)).rejects.toThrow(LocationAlreadyExistsError);
      expect(mockLocationRepo.restore).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // LIST LOCATIONS
  // ==========================================
  describe('ListLocationsUseCase', () => {
    it('debe solicitar solo ACTIVE cuando se especifica en la query', async () => {
      const useCase = new ListLocationsUseCase(mockLocationRepo);

      const result = await useCase.execute({ status: 'ACTIVE' });

      expect(mockLocationRepo.findAll).toHaveBeenCalledWith('ACTIVE');
      expect(result).toHaveLength(1);
    });

    it('debe solicitar todas las ubicaciones para administración cuando no hay filtro', async () => {
      const useCase = new ListLocationsUseCase(mockLocationRepo);

      const result = await useCase.execute();

      expect(mockLocationRepo.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(1);
    });
  });
});