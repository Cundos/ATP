import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudflareR2StorageService } from '../CloudflareR2StorageService';

describe('CloudflareR2StorageService', () => {
  let mockStore: Map<string, Buffer>;
  let lastAuthHeader: string | undefined;

  beforeEach(() => {
    mockStore = new Map();
    lastAuthHeader = undefined;

    global.fetch = vi.fn().mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      const headers = (init?.headers as Record<string, string>) || {};
      lastAuthHeader = headers['Authorization'] || headers['authorization'];

      // Extract storage key from URL
      const urlObj = new URL(urlStr);
      const match = urlObj.pathname.match(/^\/[^/]+\/(.+)$/);
      const key = match ? decodeURIComponent(match[1]) : '';

      const method = (init?.method || 'GET').toUpperCase();

      if (method === 'PUT') {
        const bodyBuffer = Buffer.isBuffer(init?.body)
          ? init.body
          : Buffer.from(init?.body as ArrayBuffer);
        mockStore.set(key, bodyBuffer);
        return {
          ok: true,
          status: 200,
          text: async () => '',
        } as unknown as Response;
      }

      if (method === 'GET') {
        const content = mockStore.get(key);
        if (!content) {
          return {
            ok: false,
            status: 404,
            text: async () => 'NoSuchKey',
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength),
        } as unknown as Response;
      }

      if (method === 'HEAD') {
        const exists = mockStore.has(key);
        return {
          ok: exists,
          status: exists ? 200 : 404,
        } as unknown as Response;
      }

      if (method === 'DELETE') {
        mockStore.delete(key);
        return {
          ok: true,
          status: 204,
        } as unknown as Response;
      }

      return {
        ok: false,
        status: 400,
      } as unknown as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves file and signs request using AWS SigV4', async () => {
    const service = new CloudflareR2StorageService({
      accountId: 'mock-account-id',
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key-12345',
      bucketName: 'atilioplant-photos',
    });

    const payload = Buffer.from('RIFFimage-data');
    const key = 'photos/specimens/sample.webp';

    const savedKey = await service.saveFile(key, payload);
    expect(savedKey).toBe(key);
    expect(lastAuthHeader).toContain('AWS4-HMAC-SHA256');
    expect(lastAuthHeader).toContain('Credential=mock-access-key/');
    expect(mockStore.has(key)).toBe(true);
  });

  it('reads file back with byte integrity', async () => {
    const service = new CloudflareR2StorageService({
      accountId: 'mock-account-id',
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key-12345',
      bucketName: 'atilioplant-photos',
    });

    const payload = Buffer.from([1, 2, 3, 4, 5]);
    const key = 'photos/test/bytes.webp';
    await service.saveFile(key, payload);

    const read = await service.readFile(key);
    expect(read).toEqual(payload);
  });

  it('verifies existence and deletion', async () => {
    const service = new CloudflareR2StorageService({
      accountId: 'mock-account-id',
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key-12345',
      bucketName: 'atilioplant-photos',
    });

    const key = 'photos/test/exists.webp';
    expect(await service.fileExists(key)).toBe(false);

    await service.saveFile(key, Buffer.from('exists-content'));
    expect(await service.fileExists(key)).toBe(true);

    await service.deleteFile(key);
    expect(await service.fileExists(key)).toBe(false);
  });

  it('resolves internal view URL and rejects traversal', async () => {
    const service = new CloudflareR2StorageService({
      accountId: 'mock-account-id',
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key-12345',
      bucketName: 'atilioplant-photos',
    });

    expect(service.resolveUrl('photos/test/image.webp')).toBe('/api/photos/view/photos/test/image.webp');
    expect(() => service.resolveUrl('../traversal.webp')).toThrow(/traversal/i);
  });
});
