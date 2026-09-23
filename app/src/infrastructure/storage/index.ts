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
 *
 * CANONICAL ARCHITECTURE (ATP-INC-001):
 * - Production / Vercel requires STORAGE_DRIVER=r2 pointing to Cloudflare R2 as the single source of truth.
 * - In production, automatic fallback to Google Drive, Vercel Blob, or local ephemeral storage is strictly disallowed.
 * - Legacy drivers (Google Drive, Vercel Blob) remain accessible ONLY when explicitly requested outside production.
 * - Development / test defaults to LocalFileStorageService unless STORAGE_DRIVER=r2 is provided.
 */
export function createStorageService(): IFileStorageService {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const driver = (process.env.STORAGE_DRIVER || '').toLowerCase().trim();

  // 1. Explicit R2 configuration
  const hasR2Credentials = Boolean(
    (process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
      (process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY) &&
      (process.env.R2_BUCKET_NAME || process.env.AWS_S3_BUCKET)
  );

  if (driver === 'r2' || driver === 'cloudflare' || driver === 's3' || hasR2Credentials) {
    return new CloudflareR2StorageService();
  }

  // 2. Strict Production Guard: In production, Cloudflare R2 is the ONLY canonical storage provider.
  if (isProduction) {
    throw new StorageUnavailableError(
      'Configuración de almacenamiento inválida en producción. STORAGE_DRIVER debe ser "r2" con credenciales de Cloudflare R2 válidas (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME).'
    );
  }

  // 3. Non-production legacy drivers (only for local testing / migrations)
  if (driver === 'google_drive' || driver === 'gdrive') {
    return new GoogleDriveStorageService();
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (driver === 'blob' && blobToken) {
    return new VercelBlobStorageService(blobToken);
  }

  // 4. Local / Test default environment
  return new LocalFileStorageService();
}
