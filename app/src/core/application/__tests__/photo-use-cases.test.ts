import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RegisterPlantPhotoUseCase,
  SetPrimaryPhotoUseCase,
  ListPlantPhotosUseCase,
  GetPrimaryPhotoUseCase,
  PlantNotFoundError,
  PhotoNotFoundError,
  PhotoOwnershipError,
  PhotoValidationError,
} from '../index';
import { IPlantRepository, IPhotoRepository, CreatePhotoPersistenceDTO } from '@/core/domain/repositories';
import { PlantEntity, PhotoEntity } from '@/core/domain/entities';

describe('Photo Application Use Cases (ATP-IMP-019)', () => {
  let plants: PlantEntity[];
  let photos: PhotoEntity[];
  let mockPlantRepo: IPlantRepository;
  let mockPhotoRepo: IPhotoRepository;

  beforeEach(() => {
    plants = [
      {
        id: '01932f91-plant-1',
        permanent_code: 'AT-PL-001',
        common_name: 'Monstera Deliciosa',
        scientific_name: 'Monstera deliciosa',
        cultivar: null,
        health_status: 'HEALTHY',
        lifecycle_status: 'ACTIVE',
        acquisition_date: null,
        notes: null,
        location_id: null,
        reference_id: null,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
      {
        id: '01932f91-plant-2',
        permanent_code: 'AT-PL-002',
        common_name: 'Ficus Lyrata',
        scientific_name: 'Ficus lyrata',
        cultivar: null,
        health_status: 'HEALTHY',
        lifecycle_status: 'ACTIVE',
        acquisition_date: null,
        notes: null,
        location_id: null,
        reference_id: null,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      },
    ];

    photos = [];

    mockPlantRepo = {
      findById: vi.fn(async (id: string) => plants.find((p) => p.id === id) || null),
      findByPermanentCode: vi.fn(async (code: string) => plants.find((p) => p.permanent_code === code) || null),
      findAll: vi.fn(async () => plants),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      getNextSequenceValue: vi.fn(async () => 14),
    };

    mockPhotoRepo = {
      findById: vi.fn(async (id: string) => photos.find((p) => p.id === id) || null),
      findByFilePath: vi.fn(async (path: string) => photos.find((p) => p.file_path === path) || null),
      listByPlant: vi.fn(async (plantId: string) =>
        photos.filter((p) => p.plant_id === plantId).sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      ),
      findPrimaryByPlant: vi.fn(async (plantId: string) =>
        photos.find((p) => p.plant_id === plantId && p.is_primary) || null
      ),
      create: vi.fn(async (dto: CreatePhotoPersistenceDTO) => {
        if (dto.is_primary) {
          for (const p of photos) {
            if (p.plant_id === dto.plant_id) {
              p.is_primary = false;
            }
          }
        }
        const created: PhotoEntity = {
          id: dto.id || `photo-${photos.length + 1}`,
          plant_id: dto.plant_id,
          file_path: dto.file_path,
          file_name: dto.file_name,
          mime_type: dto.mime_type,
          file_size: dto.file_size ?? null,
          is_primary: Boolean(dto.is_primary),
          captured_at: dto.captured_at ?? null,
          created_at: new Date(),
        };
        photos.push(created);
        return created;
      }),
      setPrimary: vi.fn(async (plantId: string, photoId: string) => {
        for (const p of photos) {
          if (p.plant_id === plantId) {
            p.is_primary = false;
          }
        }
        const target = photos.find((p) => p.id === photoId && p.plant_id === plantId);
        if (target) {
          target.is_primary = true;
          return target;
        }
        throw new Error('Photo not found');
      }),
    };
  });

  describe('RegisterPlantPhotoUseCase', () => {
    it('registers first photo as primary automatically when make_primary is omitted', async () => {
      const useCase = new RegisterPlantPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      const result = await useCase.execute({
        plant_id: '01932f91-plant-1',
        storage_key: 'photos/AT-PL-001/leaf1.webp',
        mime_type: 'image/webp',
        file_size: 15000,
        width: 800,
        height: 600,
      });

      expect(result.is_primary).toBe(true);
      expect(result.file_path).toBe('photos/AT-PL-001/leaf1.webp');
      expect(photos.length).toBe(1);
    });

    it('registers subsequent photo as non-primary when make_primary is omitted and primary exists', async () => {
      const useCase = new RegisterPlantPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      const first = await useCase.execute({
        plant_id: '01932f91-plant-1',
        storage_key: 'photos/AT-PL-001/first.webp',
        mime_type: 'image/webp',
      });
      expect(first.is_primary).toBe(true);

      const second = await useCase.execute({
        plant_id: '01932f91-plant-1',
        storage_key: 'photos/AT-PL-001/second.webp',
        mime_type: 'image/webp',
      });
      expect(second.is_primary).toBe(false);

      // Both historical photos remain in database (ADR-008)
      expect(photos.length).toBe(2);
      expect(photos[0].is_primary).toBe(true);
      expect(photos[1].is_primary).toBe(false);
    });

    it('replaces primary photo when make_primary is explicitly true without deleting previous photos', async () => {
      const useCase = new RegisterPlantPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      const photo1 = await useCase.execute({
        plant_id: '01932f91-plant-1',
        storage_key: 'photos/AT-PL-001/photo1.webp',
        mime_type: 'image/webp',
        make_primary: true,
      });
      expect(photo1.is_primary).toBe(true);

      const photo2 = await useCase.execute({
        plant_id: '01932f91-plant-1',
        storage_key: 'photos/AT-PL-001/photo2.webp',
        mime_type: 'image/webp',
        make_primary: true,
      });
      expect(photo2.is_primary).toBe(true);

      // First photo is now is_primary = false, but still in historical list
      expect(photos[0].is_primary).toBe(false);
      expect(photos[1].is_primary).toBe(true);
      expect(photos.length).toBe(2);
    });

    it('allows registering photo with permanent_code identifier', async () => {
      const useCase = new RegisterPlantPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      const result = await useCase.execute({
        permanent_code: 'AT-PL-002',
        storage_key: 'photos/AT-PL-002/ficus.webp',
        mime_type: 'image/webp',
        make_primary: false,
      });

      expect(result.plant_id).toBe('01932f91-plant-2');
      expect(result.is_primary).toBe(false);
    });

    it('throws PlantNotFoundError if plant does not exist', async () => {
      const useCase = new RegisterPlantPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      await expect(
        useCase.execute({
          plant_id: 'non-existent-uuid',
          storage_key: 'photos/AT-PL-999/test.webp',
          mime_type: 'image/webp',
        })
      ).rejects.toThrow(PlantNotFoundError);
    });

    it('throws PhotoValidationError on invalid or traversal storage_key', async () => {
      const useCase = new RegisterPlantPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      await expect(
        useCase.execute({
          plant_id: '01932f91-plant-1',
          storage_key: '../secret.webp',
          mime_type: 'image/webp',
        })
      ).rejects.toThrow(PhotoValidationError);
    });

    it('throws PhotoValidationError on invalid dimensions or sizes', async () => {
      const useCase = new RegisterPlantPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      await expect(
        useCase.execute({
          plant_id: '01932f91-plant-1',
          storage_key: 'photos/AT-PL-001/test.webp',
          mime_type: 'image/webp',
          width: -100,
        })
      ).rejects.toThrow(PhotoValidationError);

      await expect(
        useCase.execute({
          plant_id: '01932f91-plant-1',
          storage_key: 'photos/AT-PL-001/test.webp',
          mime_type: 'image/webp',
          file_size: 0,
        })
      ).rejects.toThrow(PhotoValidationError);
    });
  });

  describe('SetPrimaryPhotoUseCase', () => {
    it('successfully switches primary photo to a specified existing photo', async () => {
      // Setup 2 photos for plant 1
      photos.push(
        {
          id: 'photo-1',
          plant_id: '01932f91-plant-1',
          file_path: 'photos/AT-PL-001/photo1.webp',
          file_name: 'photo1.webp',
          mime_type: 'image/webp',
          file_size: 1000,
          is_primary: true,
          captured_at: null,
          created_at: new Date('2026-01-01'),
        },
        {
          id: 'photo-2',
          plant_id: '01932f91-plant-1',
          file_path: 'photos/AT-PL-001/photo2.webp',
          file_name: 'photo2.webp',
          mime_type: 'image/webp',
          file_size: 1200,
          is_primary: false,
          captured_at: null,
          created_at: new Date('2026-01-02'),
        }
      );

      const useCase = new SetPrimaryPhotoUseCase(mockPlantRepo, mockPhotoRepo);
      const updated = await useCase.execute({
        plant_id: '01932f91-plant-1',
        photo_id: 'photo-2',
      });

      expect(updated.id).toBe('photo-2');
      expect(updated.is_primary).toBe(true);
      expect(photos.find((p) => p.id === 'photo-1')?.is_primary).toBe(false);
      expect(photos.find((p) => p.id === 'photo-2')?.is_primary).toBe(true);
    });

    it('rejects setting primary photo if photo belongs to another plant (PhotoOwnershipError)', async () => {
      // Photo 1 belongs to plant 1, Photo 2 belongs to plant 2
      photos.push(
        {
          id: 'photo-plant-2',
          plant_id: '01932f91-plant-2',
          file_path: 'photos/AT-PL-002/photo2.webp',
          file_name: 'photo2.webp',
          mime_type: 'image/webp',
          file_size: 1000,
          is_primary: true,
          captured_at: null,
          created_at: new Date('2026-01-01'),
        }
      );

      const useCase = new SetPrimaryPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      // Attempting to set plant 1 primary using plant 2 photo
      await expect(
        useCase.execute({
          plant_id: '01932f91-plant-1',
          photo_id: 'photo-plant-2',
        })
      ).rejects.toThrow(PhotoOwnershipError);
    });

    it('throws PhotoNotFoundError when photo does not exist', async () => {
      const useCase = new SetPrimaryPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      await expect(
        useCase.execute({
          plant_id: '01932f91-plant-1',
          photo_id: 'non-existent-photo',
        })
      ).rejects.toThrow(PhotoNotFoundError);
    });
  });

  describe('ListPlantPhotosUseCase and GetPrimaryPhotoUseCase', () => {
    it('lists all historical photos for a plant', async () => {
      photos.push(
        {
          id: 'p1',
          plant_id: '01932f91-plant-1',
          file_path: 'photos/AT-PL-001/p1.webp',
          file_name: 'p1.webp',
          mime_type: 'image/webp',
          file_size: 100,
          is_primary: false,
          captured_at: null,
          created_at: new Date('2026-01-01'),
        },
        {
          id: 'p2',
          plant_id: '01932f91-plant-1',
          file_path: 'photos/AT-PL-001/p2.webp',
          file_name: 'p2.webp',
          mime_type: 'image/webp',
          file_size: 200,
          is_primary: true,
          captured_at: null,
          created_at: new Date('2026-01-02'),
        }
      );

      const listUseCase = new ListPlantPhotosUseCase(mockPlantRepo, mockPhotoRepo);
      const list = await listUseCase.execute('AT-PL-001');

      expect(list.length).toBe(2);
      expect(list[0].id).toBe('p2'); // sorted desc by created_at
      expect(list[1].id).toBe('p1');
    });

    it('gets primary photo for a plant or null if no primary exists', async () => {
      const getPrimaryUseCase = new GetPrimaryPhotoUseCase(mockPlantRepo, mockPhotoRepo);

      const noPhoto = await getPrimaryUseCase.execute('AT-PL-001');
      expect(noPhoto).toBeNull();

      photos.push({
        id: 'p-primary',
        plant_id: '01932f91-plant-1',
        file_path: 'photos/AT-PL-001/p.webp',
        file_name: 'p.webp',
        mime_type: 'image/webp',
        file_size: 100,
        is_primary: true,
        captured_at: null,
        created_at: new Date(),
      });

      const hasPhoto = await getPrimaryUseCase.execute('AT-PL-001');
      expect(hasPhoto).not.toBeNull();
      expect(hasPhoto?.id).toBe('p-primary');
    });
  });
});
