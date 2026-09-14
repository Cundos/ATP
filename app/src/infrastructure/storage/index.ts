import { IFileStorageService } from '../../core/domain/services';
import { StorageUnavailableError } from '../../core/domain/errors';
import { LocalFileStorageService } from './LocalFileStorageService';
import { VercelBlobStorageService } from './VercelBlobStorageService';

export * from './LocalFileStorageService';
export * from './VercelBlobStorageService';

/**
 * Creates the appropriate IFileStorageService instance based on environment configuration.
 * - Uses VercelBlobStorageService if BLOB_READ_WRITE_TOKEN is set or STORAGE_DRIVER=blob.
 * - Throws StorageUnavailableError if running in Vercel production without Blob configuration.
 * - Uses LocalFileStorageService for local filesystem storage in dev/test/Docker environments.
 */
export function createStorageService(): IFileStorageService {
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

