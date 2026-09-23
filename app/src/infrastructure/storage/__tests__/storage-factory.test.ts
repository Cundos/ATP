import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStorageService } from '../index';
import { CloudflareR2StorageService } from '../CloudflareR2StorageService';
import { LocalFileStorageService } from '../LocalFileStorageService';
import { GoogleDriveStorageService } from '../GoogleDriveStorageService';
import { VercelBlobStorageService } from '../VercelBlobStorageService';
import { StorageUnavailableError } from '../../../core/domain/errors';

describe('createStorageService Factory (ATP-INC-001)', () => {
  const originalEnv = { ...process.env };
  const env = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    const currentEnv = process.env as Record<string, string | undefined>;
    delete currentEnv.STORAGE_DRIVER;
    delete currentEnv.R2_ACCESS_KEY_ID;
    delete currentEnv.R2_SECRET_ACCESS_KEY;
    delete currentEnv.R2_BUCKET_NAME;
    delete currentEnv.AWS_ACCESS_KEY_ID;
    delete currentEnv.AWS_SECRET_ACCESS_KEY;
    delete currentEnv.AWS_S3_BUCKET;
    delete currentEnv.BLOB_READ_WRITE_TOKEN;
    delete currentEnv.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete currentEnv.GOOGLE_DRIVE_FOLDER_ID;
    delete currentEnv.VERCEL;
    delete currentEnv.VERCEL_ENV;
    delete currentEnv.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('selects CloudflareR2StorageService when STORAGE_DRIVER=r2', () => {
    env.STORAGE_DRIVER = 'r2';
    const service = createStorageService();
    expect(service).toBeInstanceOf(CloudflareR2StorageService);
  });

  it('selects CloudflareR2StorageService when R2 credentials are present', () => {
    env.R2_ACCESS_KEY_ID = 'test-id';
    env.R2_SECRET_ACCESS_KEY = 'test-sec';
    env.R2_BUCKET_NAME = 'test-bucket';
    const service = createStorageService();
    expect(service).toBeInstanceOf(CloudflareR2StorageService);
  });

  it('strictly throws StorageUnavailableError in production if STORAGE_DRIVER is not r2 and no R2 credentials', () => {
    env.VERCEL = '1';
    env.STORAGE_DRIVER = 'blob';
    env.BLOB_READ_WRITE_TOKEN = 'test-token';

    expect(() => createStorageService()).toThrow(StorageUnavailableError);
  });

  it('never selects Vercel Blob or Google Drive automatically in production even if credentials exist', () => {
    env.VERCEL_ENV = 'production';
    env.BLOB_READ_WRITE_TOKEN = 'test-token';
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@google.com';
    env.GOOGLE_DRIVE_FOLDER_ID = 'folder-123';

    expect(() => createStorageService()).toThrow(StorageUnavailableError);
  });

  it('allows GoogleDriveStorageService outside production only when explicitly requested', () => {
    env.NODE_ENV = 'development';
    env.STORAGE_DRIVER = 'google_drive';
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@google.com';
    env.GOOGLE_DRIVE_FOLDER_ID = 'folder-123';

    const service = createStorageService();
    expect(service).toBeInstanceOf(GoogleDriveStorageService);
  });

  it('allows VercelBlobStorageService outside production only when explicitly requested with token', () => {
    env.NODE_ENV = 'development';
    env.STORAGE_DRIVER = 'blob';
    env.BLOB_READ_WRITE_TOKEN = 'test-token';

    const service = createStorageService();
    expect(service).toBeInstanceOf(VercelBlobStorageService);
  });

  it('defaults to LocalFileStorageService in development/testing when no provider is set', () => {
    env.NODE_ENV = 'test';
    const service = createStorageService();
    expect(service).toBeInstanceOf(LocalFileStorageService);
  });
});
