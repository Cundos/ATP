import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createLocationAction,
  renameLocationAction,
  archiveLocationAction,
  restoreLocationAction,
} from '../actions';
import { PrismaLocationRepository } from '@/infrastructure/db/repositories/PrismaLocationRepository';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock repository
vi.mock('@/infrastructure/db/repositories/PrismaLocationRepository');

describe('Location Server Actions (SCR-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLocationAction', () => {
    it('debe crear exitosamente una ubicación con nombre válido', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findByName).mockResolvedValue(null);
      vi.mocked(PrismaLocationRepository.prototype.create).mockResolvedValue({
        id: 'loc-new',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const formData = new FormData();
      formData.append('name', 'Balcón');

      const result = await createLocationAction(null, formData);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Ubicación creada correctamente');
    });

    it('debe rechazar nombres menores a 2 caracteres', async () => {
      const formData = new FormData();
      formData.append('name', 'A');

      const result = await createLocationAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.errors?.name).toBeDefined();
    });

    it('debe rechazar nombres duplicados en ubicaciones ACTIVE', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findByName).mockResolvedValue({
        id: 'loc-existing',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const formData = new FormData();
      formData.append('name', 'balcón');

      const result = await createLocationAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.errors?.name).toContain('Ya existe');
    });
  });

  describe('renameLocationAction', () => {
    it('debe renombrar exitosamente una ubicación', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findById).mockResolvedValue({
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.mocked(PrismaLocationRepository.prototype.findByName).mockResolvedValue(null);
      vi.mocked(PrismaLocationRepository.prototype.update).mockResolvedValue({
        id: 'loc-1',
        name: 'Terraza',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const formData = new FormData();
      formData.append('name', 'Terraza');

      const result = await renameLocationAction('loc-1', null, formData);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Ubicación actualizada correctamente');
    });

    it('debe rechazar si el nuevo nombre colisiona con otra ubicación ACTIVE', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findById).mockResolvedValue({
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.mocked(PrismaLocationRepository.prototype.findByName).mockResolvedValue({
        id: 'loc-2',
        name: 'Terraza',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const formData = new FormData();
      formData.append('name', 'terraza');

      const result = await renameLocationAction('loc-1', null, formData);
      expect(result.success).toBe(false);
      expect(result.errors?.name).toContain('Ya existe');
    });
  });

  describe('archiveLocationAction', () => {
    it('debe archivar una ubicación existente', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findById).mockResolvedValue({
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.mocked(PrismaLocationRepository.prototype.archive).mockResolvedValue({
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ARCHIVED',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await archiveLocationAction('loc-1');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Ubicación archivada correctamente');
    });
  });

  describe('restoreLocationAction', () => {
    it('debe restaurar una ubicación archivada', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findById).mockResolvedValue({
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ARCHIVED',
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.mocked(PrismaLocationRepository.prototype.findByName).mockResolvedValue(null);
      vi.mocked(PrismaLocationRepository.prototype.restore).mockResolvedValue({
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await restoreLocationAction('loc-1');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Ubicación restaurada correctamente');
    });

    it('debe rechazar restauración si otra ubicación ACTIVE ya usa ese nombre', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findById).mockResolvedValue({
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ARCHIVED',
        created_at: new Date(),
        updated_at: new Date(),
      });
      vi.mocked(PrismaLocationRepository.prototype.findByName).mockResolvedValue({
        id: 'loc-other-active',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await restoreLocationAction('loc-1');
      expect(result.success).toBe(false);
      expect(result.errors?.name).toContain('Ya existe');
    });
  });
});