import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadAndRegisterPlantPhoto } from '../server/photo-service';
import { IFileStorageService, IImageProcessingService } from '@/core/domain/services';
import { IPhotoRepository, IPlantRepository } from '@/core/domain/repositories';
import { PhotoEntity, PlantEntity } from '@/core/domain/entities';

describe('uploadAndRegisterPlantPhoto Orchestration', () => {
  let mockImageProcessor: IImageProcessingService;
  let mockFileStorage: IFileStorageService;
  let mockPhotoRepo: IPhotoRepository;
  let mockPlantRepo: IPlantRepository;

  const mockPlant: PlantEntity = {
    id: '019550a0-0001-7000-8000-000000000001',
    permanent_code: 'AT-PL-001',
    common_name: 'Gomero',
    scientific_name: 'Ficus elastica',
    cultivar: null,
    health_status: 'HEALTHY',
    lifecycle_status: 'ACTIVE',
    acquisition_date: null,
    notes: null,
    location_id: null,
    reference_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const sampleRawBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const sampleWebpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46]);

  beforeEach(() => {
    vi.clearAllMocks();

    mockImageProcessor = {
      processImage: vi.fn().mockResolvedValue({
        buffer: sampleWebpBuffer,
        width: 800,
        height: 600,
        mimeType: 'image/webp',
        extension: 'webp',
        size: sampleWebpBuffer.length,
      }),
    };

    mockFileStorage = {
      saveFile: vi.fn().mockResolvedValue('photos/AT-PL-001/mock-uuid.webp'),
      readFile: vi.fn(),
      fileExists: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      resolveUrl: vi.fn((key) => `/api/photos/view/${key}`),
    };

    mockPlantRepo = {
      findById: vi.fn().mockResolvedValue(mockPlant),
      findByPermanentCode: vi.fn().mockResolvedValue(mockPlant),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      restore: vi.fn(),
      getNextSequenceValue: vi.fn(),
    };

    mockPhotoRepo = {
      findById: vi.fn(),
      findByFilePath: vi.fn(),
      listByPlant: vi.fn().mockResolvedValue([]),
      findPrimaryByPlant: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: '019550a0-photo-uuid',
          plant_id: dto.plant_id,
          file_path: dto.file_path,
          file_name: dto.file_name,
          mime_type: dto.mime_type,
          file_size: dto.file_size,
          is_primary: dto.is_primary,
          captured_at: dto.captured_at || null,
          created_at: new Date(),
        } as PhotoEntity)
      ),
      setPrimary: vi.fn(),
    };
  });

  it('successfully processes, saves binary, and registers photo as primary', async () => {
    const result = await uploadAndRegisterPlantPhoto(
      {
        plantId: mockPlant.id,
        permanentCode: mockPlant.permanent_code,
        fileBuffer: sampleRawBuffer,
        fileName: 'my-plant.jpg',
        makePrimary: true,
      },
      {
        imageProcessor: mockImageProcessor,
        fileStorage: mockFileStorage,
        photoRepo: mockPhotoRepo,
        plantRepo: mockPlantRepo,
      }
    );

    expect(result.success).toBe(true);
    expect(mockImageProcessor.processImage).toHaveBeenCalledWith(sampleRawBuffer);
    expect(mockFileStorage.saveFile).toHaveBeenCalledWith(
      expect.stringMatching(/^photos\/AT-PL-001\/[0-9a-f-]+\.webp$/),
      sampleWebpBuffer
    );
    expect(mockPhotoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plant_id: mockPlant.id,
        mime_type: 'image/webp',
        is_primary: true,
      })
    );
    expect(mockFileStorage.deleteFile).not.toHaveBeenCalled();
    expect(result.url).toMatch(/^\/api\/photos\/view\/photos\/AT-PL-001\//);
  });

  it('performs compensatory cleanup on newly saved storage binary when registration fails', async () => {
    // Simulate database failure during photo registration
    vi.mocked(mockPhotoRepo.create).mockRejectedValueOnce(new Error('Database connection failed'));

    await expect(
      uploadAndRegisterPlantPhoto(
        {
          plantId: mockPlant.id,
          permanentCode: mockPlant.permanent_code,
          fileBuffer: sampleRawBuffer,
          fileName: 'camera-shot.jpg',
        },
        {
          imageProcessor: mockImageProcessor,
          fileStorage: mockFileStorage,
          photoRepo: mockPhotoRepo,
          plantRepo: mockPlantRepo,
        }
      )
    ).rejects.toThrow('Database connection failed');

    // Storage save was called
    expect(mockFileStorage.saveFile).toHaveBeenCalled();

    // Compensatory deleteFile was called on the exact newly created key
    expect(mockFileStorage.deleteFile).toHaveBeenCalledWith(
      expect.stringMatching(/^photos\/AT-PL-001\/[0-9a-f-]+\.webp$/)
    );
  });

  it('rejects empty file buffers', async () => {
    await expect(
      uploadAndRegisterPlantPhoto(
        {
          plantId: mockPlant.id,
          permanentCode: mockPlant.permanent_code,
          fileBuffer: Buffer.from([]),
        },
        {
          imageProcessor: mockImageProcessor,
          fileStorage: mockFileStorage,
          photoRepo: mockPhotoRepo,
          plantRepo: mockPlantRepo,
        }
      )
    ).rejects.toThrow('El archivo de imagen no contiene datos válidos.');

    expect(mockFileStorage.saveFile).not.toHaveBeenCalled();
  });
});
