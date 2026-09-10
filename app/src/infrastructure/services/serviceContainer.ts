import { IFileStorageService, IImageProcessingService } from '../../core/domain/services';
import { StorageUnavailableError } from '../../core/domain/errors';
import { LocalFileStorageService } from '../storage/LocalFileStorageService';
import { VercelBlobStorageService } from '../storage/VercelBlobStorageService';
import { SharpImageProcessingService } from '../image/SharpImageProcessingService';

let customFileStorageService: IFileStorageService | null = null;
let customImageProcessingService: IImageProcessingService | null = null;

export function setFileStorageService(service: IFileStorageService | null): void {
  customFileStorageService = service;
}

export function setImageProcessingService(service: IImageProcessingService | null): void {
  customImageProcessingService = service;
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
