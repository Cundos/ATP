import { IFileStorageService, IImageProcessingService } from '../../core/domain/services';
import { StorageUnavailableError } from '../../core/domain/errors';
import { LocalFileStorageService } from '../storage/LocalFileStorageService';
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
  const isCloudStorageConfigured = Boolean(
    process.env.AWS_S3_BUCKET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.STORAGE_DRIVER === 's3' ||
    process.env.STORAGE_DRIVER === 'blob'
  );
  if (isVercel && !isCloudStorageConfigured) {
    throw new StorageUnavailableError(
      'Persistent photo storage is not configured for Vercel deployment. Local filesystem storage is ephemeral.'
    );
  }
  return new LocalFileStorageService();
}

export function getImageProcessingService(): IImageProcessingService {
  if (customImageProcessingService) {
    return customImageProcessingService;
  }
  return new SharpImageProcessingService();
}
