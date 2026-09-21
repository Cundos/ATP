import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as crypto from 'crypto';
import { GoogleDriveStorageService } from '../GoogleDriveStorageService';

describe('GoogleDriveStorageService', () => {
  let testPrivateKey: string;
  let testPublicKey: string;
  let mockDriveFiles: Map<string, { id: string; name: string; content: Buffer }> = new Map();

  beforeAll(() => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    testPrivateKey = privateKey;
    testPublicKey = publicKey;
  });

  beforeEach(() => {
    mockDriveFiles = new Map();

    global.fetch = vi.fn().mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const urlStr = url.toString();

      // OAuth2 Token Endpoint
      if (urlStr.includes('oauth2.googleapis.com/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'mock-google-access-token-12345',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
        } as unknown as Response;
      }

      // Upload / Multipart create
      if (urlStr.includes('upload/drive/v3/files') && init?.method === 'POST') {
        const bodyBuffer = init.body as Buffer;
        const bodyStr = bodyBuffer.toString('utf8');
        const match = bodyStr.match(/{"name":"([^"]+)"/);
        const name = match ? match[1] : `file-${Date.now()}`;
        const fileId = `drive-id-${name.replace(/[^a-zA-Z0-9]/g, '-')}`;

        mockDriveFiles.set(name, {
          id: fileId,
          name,
          content: bodyBuffer,
        });

        return {
          ok: true,
          status: 200,
          json: async () => ({ id: fileId, name }),
        } as unknown as Response;
      }

      // Update file content PATCH
      if (urlStr.includes('upload/drive/v3/files/') && init?.method === 'PATCH') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as unknown as Response;
      }

      // Search files GET
      if (urlStr.includes('drive/v3/files') && (!init || init.method === 'GET' || !init.method) && urlStr.includes('?q=')) {
        const queryParam = new URL(urlStr).searchParams.get('q') || '';
        const nameMatch = queryParam.match(/name\s*=\s*'([^']+)'/);
        const targetName = nameMatch ? nameMatch[1] : '';

        const file = mockDriveFiles.get(targetName);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: file ? [{ id: file.id, name: file.name }] : [],
          }),
        } as unknown as Response;
      }

      // Download file GET alt=media
      if (urlStr.includes('drive/v3/files/') && urlStr.includes('alt=media')) {
        const idMatch = urlStr.match(/drive\/v3\/files\/([^?]+)/);
        const targetId = idMatch ? idMatch[1] : '';

        for (const file of mockDriveFiles.values()) {
          if (file.id === targetId) {
            return {
              ok: true,
              status: 200,
              arrayBuffer: async () => file.content.buffer,
            } as unknown as Response;
          }
        }

        return {
          ok: false,
          status: 404,
          text: async () => 'File not found',
        } as unknown as Response;
      }

      // Delete file DELETE
      if (urlStr.includes('drive/v3/files/') && init?.method === 'DELETE') {
        const idMatch = urlStr.match(/drive\/v3\/files\/([^?]+)/);
        const targetId = idMatch ? idMatch[1] : '';

        for (const [name, file] of mockDriveFiles.entries()) {
          if (file.id === targetId) {
            mockDriveFiles.delete(name);
            break;
          }
        }

        return {
          ok: true,
          status: 204,
        } as unknown as Response;
      }

      return {
        ok: false,
        status: 400,
        text: async () => `Unhandled mock URL: ${urlStr}`,
      } as unknown as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails with clear error if credentials are missing', async () => {
    const storage = new GoogleDriveStorageService({
      clientEmail: '',
      privateKey: '',
    });

    await expect(storage.saveFile('photos/test.webp', Buffer.from([1, 2, 3]))).rejects.toThrow(
      /credentials.*are not configured/i
    );
  });

  it('performs full roundtrip: saveFile, fileExists, readFile, deleteFile', async () => {
    const storage = new GoogleDriveStorageService({
      folderId: 'test-folder-123',
      clientEmail: 'test-service-account@test-project.iam.gserviceaccount.com',
      privateKey: testPrivateKey,
    });

    const key = 'photos/AT-PL-001/leaf-test.webp';
    const content = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x99, 0x88]);

    const savedKey = await storage.saveFile(key, content);
    expect(savedKey).toBe(key);

    const exists = await storage.fileExists(key);
    expect(exists).toBe(true);

    const readBytes = await storage.readFile(key);
    expect(readBytes.length).toBeGreaterThan(0);

    await storage.deleteFile(key);
    const existsAfterDelete = await storage.fileExists(key);
    expect(existsAfterDelete).toBe(false);
  });

  it('rejects path traversal attempts on all methods', async () => {
    const storage = new GoogleDriveStorageService({
      folderId: 'test-folder-123',
      clientEmail: 'test-sa@project.iam.gserviceaccount.com',
      privateKey: testPrivateKey,
    });

    const maliciousKey = '../../etc/passwd';
    await expect(storage.saveFile(maliciousKey, Buffer.from([1]))).rejects.toThrow(/traversal/i);
    await expect(storage.readFile(maliciousKey)).rejects.toThrow(/traversal/i);
    await expect(storage.deleteFile(maliciousKey)).rejects.toThrow(/traversal/i);
    expect(await storage.fileExists(maliciousKey)).toBe(false);
    expect(() => storage.resolveUrl(maliciousKey)).toThrow(/traversal/i);
  });

  it('resolves correct public URL route', () => {
    const storage = new GoogleDriveStorageService({
      folderId: 'test-folder-123',
    });
    const key = 'photos/AT-PL-014/lemon-cover.webp';
    expect(storage.resolveUrl(key)).toBe(`/api/photos/view/${key}`);
  });
});
