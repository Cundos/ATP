import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VercelBlobStorageService } from '../VercelBlobStorageService';
import * as blobSdk from '@vercel/blob';

// Mock @vercel/blob functions
vi.mock('@vercel/blob', async () => {
  class MockBlobNotFoundError extends Error {
    constructor(message = 'Blob not found') {
      super(message);
      this.name = 'BlobNotFoundError';
    }
  }

  return {
    put: vi.fn(),
    head: vi.fn(),
    del: vi.fn(),
    get: vi.fn(),
    BlobNotFoundError: MockBlobNotFoundError,
  };
});

describe('VercelBlobStorageService', () => {
  let storage: VercelBlobStorageService;
  const mockToken = 'test_blob_rw_token_123';

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new VercelBlobStorageService(mockToken);
  });

  describe('constructor & getToken', () => {
    it('uses provided token or falls back to env variable', () => {
      expect(storage.getToken()).toBe(mockToken);

      const defaultStorage = new VercelBlobStorageService();
      expect(defaultStorage.getToken()).toBe(process.env.BLOB_READ_WRITE_TOKEN);
    });
  });

  describe('saveFile', () => {
    it('successfully uploads file with expected params and returns normalized key', async () => {
      const key = 'photos/AT-PL-001/019550b1-3e28-769a-9e32-cba98305c453.webp';
      const content = Buffer.from([0x52, 0x49, 0x46, 0x46]);

      vi.mocked(blobSdk.put).mockResolvedValueOnce({
        url: 'https://store.blob.vercel-storage.com/photos/AT-PL-001/019550b1-3e28-769a-9e32-cba98305c453.webp',
        downloadUrl: 'https://store.blob.vercel-storage.com/download/photos/AT-PL-001/019550b1-3e28-769a-9e32-cba98305c453.webp',
        pathname: key,
        contentType: 'image/webp',
        contentDisposition: 'inline',
        etag: 'mock-etag-123',
      });

      const result = await storage.saveFile(key, content);
      expect(result).toBe(key);

      expect(blobSdk.put).toHaveBeenCalledWith(
        key,
        content,
        expect.objectContaining({
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: 'image/webp',
          token: mockToken,
        })
      );
    });

    it('rejects invalid storage keys with path traversal', async () => {
      await expect(storage.saveFile('../secret.webp', Buffer.from([1, 2, 3]))).rejects.toThrow(/traversal/i);
      await expect(storage.saveFile('/photos/AT-PL-001/leaf.webp', Buffer.from([1, 2, 3]))).rejects.toThrow(/traversal/i);
      expect(blobSdk.put).not.toHaveBeenCalled();
    });

    it('propagates provider errors on save failure', async () => {
      vi.mocked(blobSdk.put).mockRejectedValueOnce(new Error('Network error'));
      await expect(
        storage.saveFile('photos/AT-PL-001/leaf.webp', Buffer.from([1, 2, 3]))
      ).rejects.toThrow('Network error');
    });
  });

  describe('readFile', () => {
    it('reads binary content from readable stream', async () => {
      const key = 'photos/AT-PL-001/leaf.webp';
      const fileData = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x01]);

      const mockStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(fileData);
          controller.close();
        },
      });

      vi.mocked(blobSdk.get).mockResolvedValueOnce({
        statusCode: 200,
        stream: mockStream,
        headers: new Headers(),
        blob: {
          url: 'https://store.blob.vercel-storage.com/photos/AT-PL-001/leaf.webp',
          downloadUrl: 'https://store.blob.vercel-storage.com/download',
          pathname: key,
          contentType: 'image/webp',
          contentDisposition: 'inline',
          cacheControl: 'public, max-age=31536000',
          uploadedAt: new Date(),
          etag: '123',
          size: fileData.length,
        },
      } as unknown as Awaited<ReturnType<typeof blobSdk.get>>);

      const result = await storage.readFile(key);
      expect(result).toEqual(Buffer.from(fileData));
      expect(blobSdk.get).toHaveBeenCalledWith(key, {
        access: 'public',
        token: mockToken,
      });
    });

    it('throws file not found error when BlobNotFoundError is raised', async () => {
      vi.mocked(blobSdk.get).mockRejectedValueOnce(new blobSdk.BlobNotFoundError());
      await expect(storage.readFile('photos/AT-PL-001/missing.webp')).rejects.toThrow(/not found/i);
    });

    it('throws error when result is null', async () => {
      vi.mocked(blobSdk.get).mockResolvedValueOnce(null);
      await expect(storage.readFile('photos/AT-PL-001/missing.webp')).rejects.toThrow(/not found/i);
    });

    it('rejects invalid storage keys with traversal error', async () => {
      await expect(storage.readFile('photos/../../secret.txt')).rejects.toThrow(/traversal/i);
      expect(blobSdk.get).not.toHaveBeenCalled();
    });
  });

  describe('fileExists', () => {
    it('returns true when head succeeds', async () => {
      const key = 'photos/AT-PL-001/leaf.webp';
      vi.mocked(blobSdk.head).mockResolvedValueOnce({
        size: 100,
        uploadedAt: new Date(),
        pathname: key,
        contentType: 'image/webp',
        contentDisposition: 'inline',
        url: 'https://store.blob.vercel-storage.com/photos/AT-PL-001/leaf.webp',
        downloadUrl: 'https://store.blob.vercel-storage.com/photos/AT-PL-001/leaf.webp',
        cacheControl: 'public',
        etag: '123',
      });

      const exists = await storage.fileExists(key);
      expect(exists).toBe(true);
      expect(blobSdk.head).toHaveBeenCalledWith(key, { token: mockToken });
    });

    it('returns false when head throws BlobNotFoundError without throwing', async () => {
      vi.mocked(blobSdk.head).mockRejectedValueOnce(new blobSdk.BlobNotFoundError());
      const exists = await storage.fileExists('photos/AT-PL-001/nonexistent.webp');
      expect(exists).toBe(false);
    });

    it('returns false for invalid storage key without throwing', async () => {
      const exists = await storage.fileExists('../../invalid');
      expect(exists).toBe(false);
      expect(blobSdk.head).not.toHaveBeenCalled();
    });

    it('rethrows unexpected provider error (e.g. 500 / auth failure)', async () => {
      vi.mocked(blobSdk.head).mockRejectedValueOnce(new Error('Internal Server Error'));
      await expect(storage.fileExists('photos/AT-PL-001/leaf.webp')).rejects.toThrow('Internal Server Error');
    });
  });

  describe('deleteFile', () => {
    it('invokes del with normalized key and token', async () => {
      const key = 'photos/AT-PL-001/leaf.webp';
      vi.mocked(blobSdk.del).mockResolvedValueOnce(undefined);

      await storage.deleteFile(key);
      expect(blobSdk.del).toHaveBeenCalledWith(key, { token: mockToken });
    });

    it('is idempotent and does not throw when object is not found', async () => {
      vi.mocked(blobSdk.del).mockRejectedValueOnce(new blobSdk.BlobNotFoundError());
      await expect(storage.deleteFile('photos/AT-PL-001/already-deleted.webp')).resolves.toBeUndefined();
    });

    it('rejects invalid storage key with traversal error', async () => {
      await expect(storage.deleteFile('../traversal.webp')).rejects.toThrow(/traversal/i);
      expect(blobSdk.del).not.toHaveBeenCalled();
    });
  });

  describe('resolveUrl', () => {
    it('returns controlled application relative route', () => {
      const key = 'photos/AT-PL-001/019550b1-3e28-769a-9e32-cba98305c453.webp';
      expect(storage.resolveUrl(key)).toBe(`/api/photos/view/${key}`);
    });

    it('rejects invalid storage keys or path traversals', () => {
      expect(() => storage.resolveUrl('../secret')).toThrow(/traversal/i);
      expect(() => storage.resolveUrl('/photos/AT-PL-001/img.webp')).toThrow(/traversal/i);
      expect(() => storage.resolveUrl('photos/../../secret.txt')).toThrow(/traversal/i);
    });
  });
});
