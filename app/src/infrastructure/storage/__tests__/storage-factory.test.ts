import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStorageService } from '../index';
import { CloudflareR2StorageService } from '../CloudflareR2StorageService';
import { LocalFileStorageService } from '../LocalFileStorageService';
import { GoogleDriveStorageService } from '../GoogleDriveStorageService';
import { VercelBlobStorageService } from '../VercelBlobStorageService';
import { StorageUnavailableError } from '../../../core/domain/errors';

describe('createStorageService Factory (ATP-INC-001)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STORAGE_DRIVER;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('selects CloudflareR2StorageService when STORAGE_DRIVER=r2', () => {
    process.env.STORAGE_DRIVER = 'r2';
    const service = createStorageService();
    expect(service).toBeInstanceOf(CloudflareR2StorageService);
  });

  it('selects CloudflareR2StorageService when R2 credentials are present', () => {
    process.env.R2_ACCESS_KEY_ID = 'test-id';
    process.env.R2_SECRET_ACCESS_KEY = 'test-sec';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    const service = createStorageService();
    expect(service).toBeInstanceOf(CloudflareR2StorageService);
  });

  it('strictly throws StorageUnavailableError in production if STORAGE_DRIVER is not r2 and no R2 credentials', () => {
    process.env.VERCEL = '1';
    process.env.STORAGE_DRIVER = 'blob';
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    expect(() => createStorageService()).toThrow(StorageUnavailableError);
  });

  it('never selects Vercel Blob or Google Drive automatically in production even if credentials exist', () => {
    process.env.VERCEL_ENV = 'production';
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@google.com';
    process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder-123';

    expect(() => createStorageService()).toThrow(StorageUnavailableError);
  });

  it('allows GoogleDriveStorageService outside production only when explicitly requested', () => {
    process.env.NODE_ENV = 'development';
    process.env.STORAGE_DRIVER = 'google_drive';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@google.com';
    process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder-123';

    const service = createStorageService();
    expect(service).toBeInstanceOf(GoogleDriveStorageService);
  });

  it('allows VercelBlobStorageService outside production only when explicitly requested with token', () => {
    process.env.NODE_ENV = 'development';
    process.env.STORAGE_DRIVER = 'blob';
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    const service = createStorageService();
    expect(service).toBeInstanceOf(VercelBlobStorageService);
  });

  it('defaults to LocalFileStorageService in development/testing when no provider is set', () => {
    process.env.NODE_ENV = 'test';
    const service = createStorageService();
    expect(service).toBeInstanceOf(LocalFileStorageService);
  });
});
