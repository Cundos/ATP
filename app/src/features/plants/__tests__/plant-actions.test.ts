import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPlantAction, updatePlantAction } from '../actions';
import { PrismaPlantRepository } from '@/infrastructure/db/repositories/PrismaPlantRepository';
import { PrismaLocationRepository } from '@/infrastructure/db/repositories/PrismaLocationRepository';
import { uploadAndRegisterPlantPhoto } from '../server/photo-service';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock repositories & photo service
vi.mock('@/infrastructure/db/repositories/PrismaPlantRepository');
vi.mock('@/infrastructure/db/repositories/PrismaLocationRepository');
vi.mock('../server/photo-service', () => ({
  uploadAndRegisterPlantPhoto: vi.fn(),
}));

describe('Plant Server Actions (ATP-IMP-014 / ATP-IMP-020)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPlantAction', () => {
    it('debe registrar exitosamente una planta y retornar el permanent_code generado', async () => {
      const mockCreatedPlant = {
        id: 'plant-new-uuid',
        permanent_code: 'AT-PL-014',
        common_name: 'Ficus Lyrata',
        scientific_name: 'Ficus lyrata',
        cultivar: null,
        health_status: 'HEALTHY' as const,
        lifecycle_status: 'ACTIVE' as const,
        acquisition_date: new Date('2026-09-08T12:00:00Z'),
        location_id: 'loc-1',
        notes: 'Nueva incorporación',
        reference_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock LocationRepo
      vi.mocked(PrismaLocationRepository.prototype.findById).mockResolvedValue({
        id: 'loc-1',
        name: 'Balcón',
        lifecycle_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Mock PlantRepo
      vi.mocked(PrismaPlantRepository.prototype.getNextSequenceValue).mockResolvedValue(14);
      vi.mocked(PrismaPlantRepository.prototype.create).mockResolvedValue(mockCreatedPlant);

      const formData = new FormData();
      formData.append('common_name', 'Ficus Lyrata');
      formData.append('scientific_name', 'Ficus lyrata');
      formData.append('health_status', 'HEALTHY');
      formData.append('acquisition_date', '2026-09-08');
      formData.append('location_id', 'loc-1');
      formData.append('notes', 'Nueva incorporación');

      const result = await createPlantAction(null, formData);

      expect(result.success).toBe(true);
      expect(result.permanent_code).toBe('AT-PL-014');
      expect(result.message).toBe('Planta registrada correctamente');
    });

    it('procesa y registra la fotografía si es adjuntada en el alta', async () => {
      const mockCreatedPlant = {
        id: 'plant-photo-uuid',
        permanent_code: 'AT-PL-015',
        common_name: 'Monstera Deliciosa',
        scientific_name: 'Monstera deliciosa',
        cultivar: null,
        health_status: 'HEALTHY' as const,
        lifecycle_status: 'ACTIVE' as const,
        acquisition_date: null,
        location_id: null,
        notes: null,
        reference_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(PrismaPlantRepository.prototype.getNextSequenceValue).mockResolvedValue(15);
      vi.mocked(PrismaPlantRepository.prototype.create).mockResolvedValue(mockCreatedPlant);
      vi.mocked(uploadAndRegisterPlantPhoto).mockResolvedValue({
        success: true,
        photo: {
          id: 'photo-1',
          plant_id: mockCreatedPlant.id,
          file_path: 'photos/AT-PL-015/uuid.webp',
          file_name: 'leaf.webp',
          mime_type: 'image/webp',
          file_size: 1024,
          is_primary: true,
          captured_at: null,
          created_at: new Date(),
        },
        storageKey: 'photos/AT-PL-015/uuid.webp',
        url: '/api/photos/view/photos/AT-PL-015/uuid.webp',
      });

      const photoFile = new File(['fake-bytes'], 'plant.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('common_name', 'Monstera Deliciosa');
      formData.append('photo', photoFile);

      const result = await createPlantAction(null, formData);

      expect(result.success).toBe(true);
      expect(uploadAndRegisterPlantPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          plantId: mockCreatedPlant.id,
          permanentCode: mockCreatedPlant.permanent_code,
          fileName: 'plant.png',
          makePrimary: true,
        })
      );
    });

    it('preserva la planta y notifica si el guardado de la foto falla en el alta (resilience)', async () => {
      const mockCreatedPlant = {
        id: 'plant-resilience-uuid',
        permanent_code: 'AT-PL-016',
        common_name: 'Pothos',
        scientific_name: null,
        cultivar: null,
        health_status: 'HEALTHY' as const,
        lifecycle_status: 'ACTIVE' as const,
        acquisition_date: null,
        location_id: null,
        notes: null,
        reference_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(PrismaPlantRepository.prototype.getNextSequenceValue).mockResolvedValue(16);
      vi.mocked(PrismaPlantRepository.prototype.create).mockResolvedValue(mockCreatedPlant);
      vi.mocked(uploadAndRegisterPlantPhoto).mockRejectedValueOnce(new Error('Storage unavailable'));

      const photoFile = new File(['fake-bytes'], 'plant.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('common_name', 'Pothos');
      formData.append('photo', photoFile);

      const result = await createPlantAction(null, formData);

      expect(result.success).toBe(true);
      expect(result.permanent_code).toBe('AT-PL-016');
      expect(result.message?.toLowerCase()).toContain('la foto no pudo guardarse');
    });

    it('debe rechazar el alta si common_name no fue proporcionado', async () => {
      const formData = new FormData();
      formData.append('common_name', '   ');

      const result = await createPlantAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.errors?.common_name).toBeDefined();
    });

    it('debe rechazar el alta si la ubicación seleccionada está archivada', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findById).mockResolvedValue({
        id: 'loc-archived',
        name: 'Patio Viejo',
        lifecycle_status: 'ARCHIVED',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const formData = new FormData();
      formData.append('common_name', 'Potus');
      formData.append('location_id', 'loc-archived');

      const result = await createPlantAction(null, formData);

      expect(result.success).toBe(false);
      expect(result.errors?.location_id).toContain('archivada');
    });
  });

  describe('updatePlantAction', () => {
    it('debe actualizar los datos de la planta preservando id y permanent_code', async () => {
      const mockExistingPlant = {
        id: 'plant-123',
        permanent_code: 'AT-PL-001',
        common_name: 'Gomero',
        scientific_name: 'Ficus elastica',
        cultivar: null,
        health_status: 'HEALTHY' as const,
        lifecycle_status: 'ACTIVE' as const,
        acquisition_date: null,
        location_id: null,
        notes: null,
        reference_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockUpdatedPlant = {
        ...mockExistingPlant,
        common_name: 'Gomero Gigante',
        health_status: 'ATTENTION' as const,
        notes: 'Poda requerida',
      };

      vi.mocked(PrismaPlantRepository.prototype.findById).mockResolvedValue(mockExistingPlant);
      vi.mocked(PrismaPlantRepository.prototype.update).mockResolvedValue(mockUpdatedPlant);

      const formData = new FormData();
      formData.append('common_name', 'Gomero Gigante');
      formData.append('health_status', 'ATTENTION');
      formData.append('notes', 'Poda requerida');

      const result = await updatePlantAction('plant-123', null, formData);

      expect(result.success).toBe(true);
      expect(result.permanent_code).toBe('AT-PL-001');
      expect(result.message).toBe('Cambios guardados correctamente');
    });

    it('procesa y actualiza la fotografía cuando se envía en la edición', async () => {
      const mockExistingPlant = {
        id: 'plant-123',
        permanent_code: 'AT-PL-001',
        common_name: 'Gomero',
        scientific_name: 'Ficus elastica',
        cultivar: null,
        health_status: 'HEALTHY' as const,
        lifecycle_status: 'ACTIVE' as const,
        acquisition_date: null,
        location_id: null,
        notes: null,
        reference_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(PrismaPlantRepository.prototype.findById).mockResolvedValue(mockExistingPlant);
      vi.mocked(PrismaPlantRepository.prototype.update).mockResolvedValue(mockExistingPlant);
      vi.mocked(uploadAndRegisterPlantPhoto).mockResolvedValue({
        success: true,
        photo: {
          id: 'photo-new-uuid',
          plant_id: mockExistingPlant.id,
          file_path: 'photos/AT-PL-001/new.webp',
          file_name: 'new.webp',
          mime_type: 'image/webp',
          file_size: 2048,
          is_primary: true,
          captured_at: null,
          created_at: new Date(),
        },
        storageKey: 'photos/AT-PL-001/new.webp',
        url: '/api/photos/view/photos/AT-PL-001/new.webp',
      });

      const photoFile = new File(['new-fake-bytes'], 'new-leaf.webp', { type: 'image/webp' });
      const formData = new FormData();
      formData.append('common_name', 'Gomero');
      formData.append('photo', photoFile);

      const result = await updatePlantAction('plant-123', null, formData);

      expect(result.success).toBe(true);
      expect(uploadAndRegisterPlantPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          plantId: mockExistingPlant.id,
          permanentCode: mockExistingPlant.permanent_code,
          fileName: 'new-leaf.webp',
          makePrimary: true,
        })
      );
    });

    it('debe permitir remover la ubicación pasando location_id vacío', async () => {
      const mockExistingPlant = {
        id: 'plant-123',
        permanent_code: 'AT-PL-001',
        common_name: 'Gomero',
        scientific_name: null,
        cultivar: null,
        health_status: 'HEALTHY' as const,
        lifecycle_status: 'ACTIVE' as const,
        acquisition_date: null,
        location_id: 'loc-1',
        notes: null,
        reference_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(PrismaPlantRepository.prototype.findById).mockResolvedValue(mockExistingPlant);
      vi.mocked(PrismaPlantRepository.prototype.update).mockResolvedValue({
        ...mockExistingPlant,
        location_id: null,
      });

      const formData = new FormData();
      formData.append('common_name', 'Gomero');
      formData.append('location_id', '');

      const result = await updatePlantAction('plant-123', null, formData);

      expect(result.success).toBe(true);
    });

    it('debe rechazar la edición si se intenta asignar una ubicación archivada', async () => {
      vi.mocked(PrismaLocationRepository.prototype.findById).mockResolvedValue({
        id: 'loc-archived',
        name: 'Patio Viejo',
        lifecycle_status: 'ARCHIVED',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const formData = new FormData();
      formData.append('common_name', 'Gomero');
      formData.append('location_id', 'loc-archived');

      const result = await updatePlantAction('plant-123', null, formData);

      expect(result.success).toBe(false);
      expect(result.errors?.location_id).toContain('archivada');
    });
  });
});