import { IFileStorageService } from '../../core/domain/services';
import { StorageUnavailableError } from '../../core/domain/errors';
import { LocalFileStorageService } from './LocalFileStorageService';
import { VercelBlobStorageService } from './VercelBlobStorageService';
import { GoogleDriveStorageService } from './GoogleDriveStorageService';
import { CloudflareR2StorageService } from './CloudflareR2StorageService';

export * from './LocalFileStorageService';
export * from './VercelBlobStorageService';
export * from './GoogleDriveStorageService';
export * from './CloudflareR2StorageService';

/**
 * Creates the appropriate IFileStorageService instance based on environment configuration.
 * - Uses CloudflareR2StorageService if STORAGE_DRIVER=r2|s3|cloudflare or R2/S3 credentials are set.
 * - Uses GoogleDriveStorageService if STORAGE_DRIVER=google_drive or Google Service Account is configured.
 * - Uses VercelBlobStorageService if BLOB_READ_WRITE_TOKEN is set or STORAGE_DRIVER=blob.
 * - Throws StorageUnavailableError if running in Vercel production without persistent storage.
 * - Uses LocalFileStorageService for local filesystem storage in dev/test/Docker environments.
 */
export function createStorageService(): IFileStorageService {
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const driver = (process.env.STORAGE_DRIVER || '').toLowerCase();

  const hasR2 =
    driver === 'r2' ||
    driver === 's3' ||
    driver === 'cloudflare' ||
    Boolean(
      (process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
        (process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY) &&
        (process.env.R2_BUCKET_NAME || process.env.AWS_S3_BUCKET)
    );

  // If Cloudflare R2 / S3 driver or credentials are configured, prioritize R2
  if (hasR2) {
    return new CloudflareR2StorageService();
  }

  const hasGoogleDrive =
    driver === 'google_drive' ||
    driver === 'gdrive' ||
    Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_DRIVE_FOLDER_ID
    );

  // If Google Drive driver or credentials are configured, prioritize Google Drive
  if (hasGoogleDrive) {
    return new GoogleDriveStorageService();
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const isBlobDriver = driver === 'blob';

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
