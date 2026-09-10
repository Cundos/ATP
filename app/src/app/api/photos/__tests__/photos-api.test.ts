import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { POST } from '../upload/route';
import { GET } from '../view/[...storageKey]/route';
import { LocalFileStorageService } from '@/infrastructure/storage/LocalFileStorageService';
import {
  setFileStorageService,
  setImageProcessingService,
} from '@/infrastructure/services';
import { IFileStorageService } from '@/core/domain/services';
import { StorageUnavailableError } from '@/core/domain/errors';

describe('Photo API Route Handlers (ATP-IMP-018)', () => {
  let tempDir: string;
  let localStorage: LocalFileStorageService;

  async function createSampleImage(format: 'jpeg' | 'png' | 'webp', width = 100, height = 100): Promise<Buffer> {
    const img = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 50, g: 150, b: 200, alpha: 1 },
      },
    });
    if (format === 'jpeg') return await img.jpeg().toBuffer();
    if (format === 'png') return await img.png().toBuffer();
    return await img.webp().toBuffer();
  }

  function createMultipartRequest(fields: Record<string, string | Blob>): Request {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'string') {
        formData.append(key, value);
      } else {
        formData.append(key, value, 'upload.jpg');
      }
    }
    return new Request('http://localhost:3000/api/photos/upload', {
      method: 'POST',
      body: formData,
    });
  }

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'atp-api-photos-test-'));
    localStorage = new LocalFileStorageService(tempDir);
    setFileStorageService(localStorage);
    setImageProcessingService(null);
  });

  afterEach(async () => {
    setFileStorageService(null);
    setImageProcessingService(null);
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('POST /api/photos/upload', () => {
    it('successfully uploads and processes a valid JPEG image (201 Created)', async () => {
      const jpegBuffer = await createSampleImage('jpeg', 400, 300);
      const blob = new Blob([new Uint8Array(jpegBuffer)], { type: 'image/jpeg' });

      const req = createMultipartRequest({
        file: blob,
        permanentCode: 'AT-PL-001',
      });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('storageKey');
      expect(data).toHaveProperty('url');
      expect(data.mimeType).toBe('image/webp');
      expect(data.width).toBe(400);
      expect(data.height).toBe(300);
      expect(typeof data.size).toBe('number');
      expect(data.storageKey).toMatch(/^photos\/AT-PL-001\/[a-f0-9\-]+\.webp$/);
      expect(data.url).toBe(`/api/photos/view/${data.storageKey}`);

      // Confirm file actually exists physically in storage
      expect(await localStorage.fileExists(data.storageKey)).toBe(true);
    });

    it('successfully uploads a valid PNG image (201 Created)', async () => {
      const pngBuffer = await createSampleImage('png', 200, 200);
      const blob = new Blob([new Uint8Array(pngBuffer)], { type: 'image/png' });

      const req = createMultipartRequest({
        file: blob,
        permanentCode: 'AT-PL-002',
      });

      const response = await POST(req);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.storageKey).toMatch(/^photos\/AT-PL-002\/[a-f0-9\-]+\.webp$/);
    });

    it('successfully uploads a valid WebP image (201 Created)', async () => {
      const webpBuffer = await createSampleImage('webp', 300, 300);
      const blob = new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' });

      const req = createMultipartRequest({
        file: blob,
        permanentCode: 'AT-PL-013',
      });

      const response = await POST(req);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.storageKey).toMatch(/^photos\/AT-PL-013\/[a-f0-9\-]+\.webp$/);
    });

    it('accepts future plant permanent codes (e.g. AT-PL-014, AT-PL-1000)', async () => {
      const webpBuffer = await createSampleImage('webp', 100, 100);
      const blob = new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' });

      const req = createMultipartRequest({
        file: blob,
        permanentCode: 'AT-PL-1000',
      });

      const response = await POST(req);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.storageKey).toMatch(/^photos\/AT-PL-1000\/[a-f0-9\-]+\.webp$/);
    });

    it('generates distinct UUID storage keys for repeated uploads to the same plant', async () => {
      const img1 = await createSampleImage('jpeg', 100, 100);
      const img2 = await createSampleImage('jpeg', 100, 100);

      const res1 = await POST(createMultipartRequest({ file: new Blob([new Uint8Array(img1)], { type: 'image/jpeg' }), permanentCode: 'AT-PL-001' }));
      const res2 = await POST(createMultipartRequest({ file: new Blob([new Uint8Array(img2)], { type: 'image/jpeg' }), permanentCode: 'AT-PL-001' }));

      const data1 = await res1.json();
      const data2 = await res2.json();

      expect(data1.storageKey).not.toBe(data2.storageKey);
      expect(await localStorage.fileExists(data1.storageKey)).toBe(true);
      expect(await localStorage.fileExists(data2.storageKey)).toBe(true);
    });

    it('rejects requests that are not multipart/form-data with 400', async () => {
      const req = new Request('http://localhost:3000/api/photos/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file: 'abc', permanentCode: 'AT-PL-001' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('rejects missing file with 400', async () => {
      const req = createMultipartRequest({ permanentCode: 'AT-PL-001' });
      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('MISSING_FILE');
    });

    it('rejects empty file with 400', async () => {
      const emptyBlob = new Blob([], { type: 'image/jpeg' });
      const req = createMultipartRequest({ file: emptyBlob, permanentCode: 'AT-PL-001' });
      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('EMPTY_FILE');
    });

    it('rejects missing permanentCode with 400', async () => {
      const img = await createSampleImage('jpeg', 100, 100);
      const req = createMultipartRequest({ file: new Blob([new Uint8Array(img)], { type: 'image/jpeg' }) });
      const response = await POST(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('MISSING_PERMANENT_CODE');
    });

    it('rejects invalid permanentCode format with 400', async () => {
      const img = await createSampleImage('jpeg', 100, 100);
      const blob = new Blob([new Uint8Array(img)], { type: 'image/jpeg' });

      const invalidCodes = ['AT-PL-01', 'PL-001', 'AT-PL-ABC', 'AT-PL-001a', 'AT-PL-'];
      for (const code of invalidCodes) {
        const req = createMultipartRequest({ file: blob, permanentCode: code });
        const response = await POST(req);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error.code).toBe('INVALID_PERMANENT_CODE');
      }
    });

    it('rejects unpermitted MIME types with 415', async () => {
      const fakeFile = new Blob(['text content'], { type: 'text/plain' });
      const req = createMultipartRequest({ file: fakeFile, permanentCode: 'AT-PL-001' });
      const response = await POST(req);
      expect(response.status).toBe(415);
      const data = await response.json();
      expect(data.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('rejects files exceeding 20MB with 413', async () => {
      // Create a dummy Blob with size > 20MB without allocating real memory
      const largeBlob = new Blob([Buffer.alloc(21 * 1024 * 1024)], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', largeBlob, 'big.jpg');
      formData.append('permanentCode', 'AT-PL-001');

      const req = new Request('http://localhost:3000/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(req);
      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('rejects corrupt image data with 422 even if MIME is image/jpeg', async () => {
      const corruptBlob = new Blob([Buffer.from('not-a-real-jpeg-stream')], { type: 'image/jpeg' });
      const req = createMultipartRequest({ file: corruptBlob, permanentCode: 'AT-PL-001' });
      const response = await POST(req);
      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_IMAGE');
    });

    it('returns 503 when storage backend is unavailable (e.g. Vercel without persistent backend)', async () => {
      const unavailableStorage: IFileStorageService = {
        saveFile: async () => { throw new StorageUnavailableError('Persistent storage unconfigured'); },
        resolveUrl: () => '',
        fileExists: async () => false,
        readFile: async () => { throw new StorageUnavailableError('Persistent storage unconfigured'); },
        deleteFile: async () => {},
      };
      setFileStorageService(unavailableStorage);

      const img = await createSampleImage('jpeg', 100, 100);
      const req = createMultipartRequest({ file: new Blob([new Uint8Array(img)], { type: 'image/jpeg' }), permanentCode: 'AT-PL-001' });
      const response = await POST(req);
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error.code).toBe('STORAGE_UNAVAILABLE');
    });

    it('does not leak internal server paths in JSON responses', async () => {
      const img = await createSampleImage('jpeg', 100, 100);
      const req = createMultipartRequest({ file: new Blob([new Uint8Array(img)], { type: 'image/jpeg' }), permanentCode: 'AT-PL-001' });
      const response = await POST(req);
      const data = await response.json();
      const jsonString = JSON.stringify(data);

      expect(jsonString).not.toContain(tempDir);
      expect(jsonString).not.toContain('storageRoot');
      expect(jsonString).not.toContain('C:\\');
    });
  });

  describe('GET /api/photos/view/[...storageKey]', () => {
    it('serves an existing photo with 200 OK and correct immutable caching headers', async () => {
      const testKey = 'photos/AT-PL-001/sample-photo.webp';
      const webpBuffer = await createSampleImage('webp', 200, 150);
      await localStorage.saveFile(testKey, webpBuffer);

      const req = new Request(`http://localhost:3000/api/photos/view/${testKey}`);
      const response = await GET(req, {
        params: Promise.resolve({ storageKey: testKey.split('/') }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/webp');
      expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('content-length')).toBe(webpBuffer.length.toString());

      const arrayBuf = await response.arrayBuffer();
      expect(Buffer.from(arrayBuf)).toEqual(webpBuffer);
    });

    it('returns 404 for a non-existent photo', async () => {
      const req = new Request('http://localhost:3000/api/photos/view/photos/AT-PL-001/missing.webp');
      const response = await GET(req, {
        params: Promise.resolve({ storageKey: ['photos', 'AT-PL-001', 'missing.webp'] }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 for path traversal attempts', async () => {
      const req = new Request('http://localhost:3000/api/photos/view/..');
      const response = await GET(req, {
        params: Promise.resolve({ storageKey: ['..', 'secret.webp'] }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STORAGE_KEY');
    });

    it('returns 400 for absolute or drive-like paths', async () => {
      const req1 = new Request('http://localhost:3000/api/photos/view/C:/photos/test.webp');
      const res1 = await GET(req1, {
        params: Promise.resolve({ storageKey: ['C:', 'photos', 'test.webp'] }),
      });
      expect(res1.status).toBe(400);

      const req2 = new Request('http://localhost:3000/api/photos/view//etc/passwd.webp');
      const res2 = await GET(req2, {
        params: Promise.resolve({ storageKey: ['', 'etc', 'passwd.webp'] }),
      });
      expect(res2.status).toBe(400);
    });

    it('returns 400 for percent-encoded path traversal', async () => {
      const req = new Request('http://localhost:3000/api/photos/view/..%2fsecret.webp');
      const response = await GET(req, {
        params: Promise.resolve({ storageKey: ['..%2fsecret.webp'] }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STORAGE_KEY');
    });

    it('returns 400 for non-webp file extensions', async () => {
      const req = new Request('http://localhost:3000/api/photos/view/photos/AT-PL-001/doc.pdf');
      const response = await GET(req, {
        params: Promise.resolve({ storageKey: ['photos', 'AT-PL-001', 'doc.pdf'] }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_STORAGE_KEY');
    });

    it('returns 503 when storage backend is unavailable', async () => {
      const unavailableStorage: IFileStorageService = {
        saveFile: async () => '',
        resolveUrl: () => '',
        fileExists: async () => { throw new StorageUnavailableError('Persistent storage unconfigured'); },
        readFile: async () => { throw new StorageUnavailableError('Persistent storage unconfigured'); },
        deleteFile: async () => {},
      };
      setFileStorageService(unavailableStorage);

      const req = new Request('http://localhost:3000/api/photos/view/photos/AT-PL-001/test.webp');
      const response = await GET(req, {
        params: Promise.resolve({ storageKey: ['photos', 'AT-PL-001', 'test.webp'] }),
      });

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error.code).toBe('STORAGE_UNAVAILABLE');
    });

    it('returns 500 when storage throws an unexpected read error', async () => {
      const failingStorage: IFileStorageService = {
        saveFile: async () => '',
        resolveUrl: () => '',
        fileExists: async () => true,
        readFile: async () => { throw new Error('Disk read fault'); },
        deleteFile: async () => {},
      };
      setFileStorageService(failingStorage);

      const req = new Request('http://localhost:3000/api/photos/view/photos/AT-PL-001/test.webp');
      const response = await GET(req, {
        params: Promise.resolve({ storageKey: ['photos', 'AT-PL-001', 'test.webp'] }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error.code).toBe('READ_FAILED');
    });
  });

  describe('End-to-End Integration Flow (POST -> Process -> Storage -> GET)', () => {
    it('uploads a JPEG image, stores it as WebP, and serves the exact stored binary via GET', async () => {
      // 1. POST upload
      const originalJpeg = await createSampleImage('jpeg', 500, 400);
      const uploadBlob = new Blob([new Uint8Array(originalJpeg)], { type: 'image/jpeg' });

      const uploadReq = createMultipartRequest({
        file: uploadBlob,
        permanentCode: 'AT-PL-001',
      });

      const uploadRes = await POST(uploadReq);
      expect(uploadRes.status).toBe(201);
      const uploadData = await uploadRes.json();

      const storageKey = uploadData.storageKey;
      expect(storageKey).toBeDefined();
      expect(uploadData.mimeType).toBe('image/webp');

      // 2. GET view
      const viewReq = new Request(`http://localhost:3000/api/photos/view/${storageKey}`);
      const viewRes = await GET(viewReq, {
        params: Promise.resolve({ storageKey: storageKey.split('/') }),
      });

      expect(viewRes.status).toBe(200);
      expect(viewRes.headers.get('content-type')).toBe('image/webp');

      const viewBuffer = Buffer.from(await viewRes.arrayBuffer());
      expect(viewBuffer.length).toBe(uploadData.size);

      // 3. Verify that the served binary is a valid WebP decodable by Sharp with correct dimensions
      const metadata = await sharp(viewBuffer).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(500);
      expect(metadata.height).toBe(400);
    });
  });

  describe('Service Container Factory (ATP-IMP-018)', () => {
    const originalVercel = process.env.VERCEL;
    const originalVercelEnv = process.env.VERCEL_ENV;
    const originalS3 = process.env.AWS_S3_BUCKET;
    const originalBlob = process.env.BLOB_READ_WRITE_TOKEN;

    afterEach(() => {
      process.env.VERCEL = originalVercel;
      process.env.VERCEL_ENV = originalVercelEnv;
      process.env.AWS_S3_BUCKET = originalS3;
      process.env.BLOB_READ_WRITE_TOKEN = originalBlob;
    });

    it('returns LocalFileStorageService in non-Vercel environment', async () => {
      delete process.env.VERCEL;
      delete process.env.VERCEL_ENV;
      setFileStorageService(null);

      const { getFileStorageService } = await import('@/infrastructure/services');
      const service = getFileStorageService();
      expect(service).toBeInstanceOf(LocalFileStorageService);
    });

    it('throws StorageUnavailableError in Vercel environment when no cloud storage is configured', async () => {
      process.env.VERCEL = '1';
      delete process.env.AWS_S3_BUCKET;
      delete process.env.BLOB_READ_WRITE_TOKEN;
      delete process.env.STORAGE_DRIVER;
      setFileStorageService(null);

      const { getFileStorageService } = await import('@/infrastructure/services');
      expect(() => getFileStorageService()).toThrow(StorageUnavailableError);
    });

    it('returns SharpImageProcessingService by default', async () => {
      setImageProcessingService(null);
      const { getImageProcessingService } = await import('@/infrastructure/services');
      const service = getImageProcessingService();
      expect(service).toBeDefined();
    });
  });
});
