import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getFileStorageService,
  setFileStorageService,
} from '../serviceContainer';
import { LocalFileStorageService } from '../../storage/LocalFileStorageService';
import { VercelBlobStorageService } from '../../storage/VercelBlobStorageService';
import { StorageUnavailableError } from '../../../core/domain/errors';
import { IFileStorageService } from '../../../core/domain/services';

describe('serviceContainer', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    setFileStorageService(null);
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.STORAGE_DRIVER;
  });

  afterEach(() => {
    process.env = originalEnv;
    setFileStorageService(null);
  });

  it('returns custom injected file storage service when set', () => {
    const mockService = {} as unknown as IFileStorageService;
    setFileStorageService(mockService);
    expect(getFileStorageService()).toBe(mockService);
  });

  it('returns LocalFileStorageService in local environment by default', () => {
    const service = getFileStorageService();
    expect(service).toBeInstanceOf(LocalFileStorageService);
  });

  it('returns VercelBlobStorageService when BLOB_READ_WRITE_TOKEN is present', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'test_token_vercel_blob';
    const service = getFileStorageService();
    expect(service).toBeInstanceOf(VercelBlobStorageService);
    expect((service as VercelBlobStorageService).getToken()).toBe('test_token_vercel_blob');
  });

  it('returns VercelBlobStorageService when STORAGE_DRIVER is blob', () => {
    process.env.STORAGE_DRIVER = 'blob';
    const service = getFileStorageService();
    expect(service).toBeInstanceOf(VercelBlobStorageService);
  });

  it('throws StorageUnavailableError when running on Vercel without blob token or driver', () => {
    process.env.VERCEL = '1';
    expect(() => getFileStorageService()).toThrow(StorageUnavailableError);
    expect(() => getFileStorageService()).toThrow(
      /Persistent photo storage is not configured for Vercel deployment/
    );
  });
});
