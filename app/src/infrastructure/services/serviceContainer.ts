import {
  IFileStorageService,
  IImageProcessingService,
  IOpenPlantbookClient,
  IPlantReferenceMapper,
  IOAuth2TokenManager,
} from '../../core/domain/services';
import { IPlantReferenceRepository } from '../../core/domain/repositories';
import { GetOrCreatePlantReferenceUseCase } from '../../core/application';
import { StorageUnavailableError } from '../../core/domain/errors';
import { LocalFileStorageService } from '../storage/LocalFileStorageService';
import { VercelBlobStorageService } from '../storage/VercelBlobStorageService';
import { SharpImageProcessingService } from '../image/SharpImageProcessingService';
import { PrismaPlantReferenceRepository } from '../db/repositories/PrismaPlantReferenceRepository';
import { OpenPlantbookMapper } from '../open-plantbook/OpenPlantbookMapper';
import { OpenPlantbookClient } from '../open-plantbook/OpenPlantbookClient';
import { OAuth2TokenManager } from '../open-plantbook/OAuth2TokenManager';

let customFileStorageService: IFileStorageService | null = null;
let customImageProcessingService: IImageProcessingService | null = null;
let customPlantReferenceRepository: IPlantReferenceRepository | null = null;
let customPlantReferenceMapper: IPlantReferenceMapper | null = null;
let customOpenPlantbookClient: IOpenPlantbookClient | null = null;
let customOAuth2TokenManager: IOAuth2TokenManager | null = null;

export function setFileStorageService(service: IFileStorageService | null): void {
  customFileStorageService = service;
}

export function setImageProcessingService(service: IImageProcessingService | null): void {
  customImageProcessingService = service;
}

export function setPlantReferenceRepository(repo: IPlantReferenceRepository | null): void {
  customPlantReferenceRepository = repo;
}

export function setPlantReferenceMapper(mapper: IPlantReferenceMapper | null): void {
  customPlantReferenceMapper = mapper;
}

export function setOpenPlantbookClient(client: IOpenPlantbookClient | null): void {
  customOpenPlantbookClient = client;
}

export function setOAuth2TokenManager(manager: IOAuth2TokenManager | null): void {
  customOAuth2TokenManager = manager;
}

export function getFileStorageService(): IFileStorageService {
  if (customFileStorageService) {
    return customFileStorageService;
  }

  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const isBlobDriver = process.env.STORAGE_DRIVER === 'blob';

  // If Vercel Blob credentials/driver are present, use VercelBlobStorageService
  if (blobToken || isBlobDriver) {
    return new VercelBlobStorageService(blobToken);
  }

  // If running on Vercel without persistent storage configuration, reject ephemeral storage
  if (isVercel) {
    throw new StorageUnavailableError(
      'Persistent photo storage is not configured for Vercel deployment. Local filesystem storage is ephemeral.'
    );
  }

  // Local / Docker / Homelab environment
  return new LocalFileStorageService();
}

export function getImageProcessingService(): IImageProcessingService {
  if (customImageProcessingService) {
    return customImageProcessingService;
  }
  return new SharpImageProcessingService();
}

export function getPlantReferenceRepository(): IPlantReferenceRepository {
  if (customPlantReferenceRepository) {
    return customPlantReferenceRepository;
  }
  return new PrismaPlantReferenceRepository();
}

export function getPlantReferenceMapper(): IPlantReferenceMapper {
  if (customPlantReferenceMapper) {
    return customPlantReferenceMapper;
  }
  return new OpenPlantbookMapper();
}

export function getOAuth2TokenManager(): IOAuth2TokenManager {
  if (customOAuth2TokenManager) {
    return customOAuth2TokenManager;
  }
  return new OAuth2TokenManager();
}

export function getOpenPlantbookClient(): IOpenPlantbookClient {
  if (customOpenPlantbookClient) {
    return customOpenPlantbookClient;
  }
  return new OpenPlantbookClient(getOAuth2TokenManager());
}

export function getOrCreatePlantReferenceUseCase(): GetOrCreatePlantReferenceUseCase {
  return new GetOrCreatePlantReferenceUseCase(
    getPlantReferenceRepository(),
    getOpenPlantbookClient(),
    getPlantReferenceMapper()
  );
}

