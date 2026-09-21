import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { IFileStorageService } from '../../../core/domain/services';
import { LocalFileStorageService } from '../LocalFileStorageService';
import { GoogleDriveStorageService } from '../GoogleDriveStorageService';
import { CloudflareR2StorageService } from '../CloudflareR2StorageService';

function runFileStorageContractSuite(
  name: string,
  createService: () => Promise<IFileStorageService>,
  cleanup?: () => Promise<void>
) {
  describe(`IFileStorageService Contract: ${name}`, () => {
    let storage: IFileStorageService;

    beforeEach(async () => {
      storage = await createService();
    });

    afterAll(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('implements saveFile, readFile, fileExists, deleteFile, resolveUrl', () => {
      expect(typeof storage.saveFile).toBe('function');
      expect(typeof storage.readFile).toBe('function');
      expect(typeof storage.fileExists).toBe('function');
      expect(typeof storage.deleteFile).toBe('function');
      expect(typeof storage.resolveUrl).toBe('function');
    });

    it('roundtrips a saved binary file with exact byte integrity', async () => {
      const key = 'photos/AT-PL-001/test-contract.webp';
      const content = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x12, 0x34, 0x56, 0x78]);

      const savedKey = await storage.saveFile(key, content);
      expect(savedKey).toBe(key);

      const exists = await storage.fileExists(key);
      expect(exists).toBe(true);

      const readBack = await storage.readFile(key);
      expect(readBack).toEqual(content);

      await storage.deleteFile(key);
      const existsAfterDelete = await storage.fileExists(key);
      expect(existsAfterDelete).toBe(false);
    });

    it('resolveUrl generates relative route /api/photos/view/{storageKey}', () => {
      const key = 'photos/AT-PL-002/019550b1-3e28-769a-9e32-cba98305c453.webp';
      expect(storage.resolveUrl(key)).toBe(`/api/photos/view/${key}`);
    });

    it('rejects path traversal on all operations', async () => {
      const traversalKey = '../traversal.webp';
      await expect(storage.saveFile(traversalKey, Buffer.from([1]))).rejects.toThrow(/traversal/i);
      await expect(storage.readFile(traversalKey)).rejects.toThrow(/traversal/i);
      expect(await storage.fileExists(traversalKey)).toBe(false);
      await expect(storage.deleteFile(traversalKey)).rejects.toThrow(/traversal/i);
      expect(() => storage.resolveUrl(traversalKey)).toThrow(/traversal/i);
    });
  });
}

describe('File Storage Contract Verification', () => {
  let tempDir: string;

  runFileStorageContractSuite(
    'LocalFileStorageService',
    async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'atp-contract-test-'));
      return new LocalFileStorageService(tempDir);
    },
    async () => {
      if (tempDir) {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  );

  const mockDriveStore = new Map<string, { id: string; name: string; content: Buffer }>();
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  runFileStorageContractSuite(
    'GoogleDriveStorageService',
    async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string | URL, init?: RequestInit) => {
        const urlStr = url.toString();

        if (urlStr.includes('oauth2.googleapis.com/token')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'mock-token',
              expires_in: 3600,
            }),
          } as unknown as Response;
        }

        if (urlStr.includes('upload/drive/v3/files') && init?.method === 'POST') {
          const bodyBuffer = Buffer.isBuffer(init.body)
            ? init.body
            : Buffer.from(init.body as Uint8Array);
          const bodyStr = bodyBuffer.toString('utf8');
          const match = bodyStr.match(/{"name":"([^"]+)"/);
          const name = match ? match[1] : `file-${Date.now()}`;
          const fileId = `drive-id-${name.replace(/[^a-zA-Z0-9]/g, '-')}`;

          const contentType = (init?.headers as Record<string, string>)?.['Content-Type'] || '';
          const boundaryMatch = contentType.match(/boundary=([^\r\n;]+)/);
          const boundary = boundaryMatch ? boundaryMatch[1] : '';

          const mediaHeader = Buffer.from('Content-Type: image/webp\r\n\r\n');
          const headerIdx = bodyBuffer.indexOf(mediaHeader);
          let binaryContent = bodyBuffer;
          if (headerIdx !== -1) {
            const startOfContent = headerIdx + mediaHeader.length;
            const endDelimiter = Buffer.from(`\r\n--${boundary}--`);
            const endIdx = bodyBuffer.indexOf(endDelimiter, startOfContent);
            if (endIdx !== -1) {
              binaryContent = bodyBuffer.subarray(startOfContent, endIdx);
            }
          }

          mockDriveStore.set(name, {
            id: fileId,
            name,
            content: binaryContent,
          });

          return {
            ok: true,
            status: 200,
            json: async () => ({ id: fileId, name }),
          } as unknown as Response;
        }

        if (urlStr.includes('drive/v3/files') && (!init || !init.method || init.method === 'GET') && urlStr.includes('?q=')) {
          const queryParam = new URL(urlStr).searchParams.get('q') || '';
          const nameMatch = queryParam.match(/name\s*=\s*'([^']+)'/);
          const targetName = nameMatch ? nameMatch[1] : '';
          const file = mockDriveStore.get(targetName);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              files: file ? [{ id: file.id, name: file.name }] : [],
            }),
          } as unknown as Response;
        }

        if (urlStr.includes('drive/v3/files/') && urlStr.includes('alt=media')) {
          const idMatch = urlStr.match(/drive\/v3\/files\/([^?]+)/);
          const targetId = idMatch ? idMatch[1] : '';
          for (const file of mockDriveStore.values()) {
            if (file.id === targetId) {
              const exactSlice = file.content.buffer.slice(
                file.content.byteOffset,
                file.content.byteOffset + file.content.byteLength
              );
              return {
                ok: true,
                status: 200,
                arrayBuffer: async () => exactSlice,
              } as unknown as Response;
            }
          }
          return {
            ok: false,
            status: 404,
          } as unknown as Response;
        }

        if (urlStr.includes('drive/v3/files/') && init?.method === 'DELETE') {
          const idMatch = urlStr.match(/drive\/v3\/files\/([^?]+)/);
          const targetId = idMatch ? idMatch[1] : '';
          for (const [name, file] of mockDriveStore.entries()) {
            if (file.id === targetId) {
              mockDriveStore.delete(name);
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
        } as unknown as Response;
      });

      return new GoogleDriveStorageService({
        folderId: 'contract-test-folder',
        clientEmail: 'test-sa@project.iam.gserviceaccount.com',
        privateKey,
      });
    },
    async () => {
      vi.restoreAllMocks();
      mockDriveStore.clear();
    }
  );

  const mockR2Store = new Map<string, Buffer>();

  runFileStorageContractSuite(
    'CloudflareR2StorageService',
    async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string | URL, init?: RequestInit) => {
        const urlStr = url.toString();
        const urlObj = new URL(urlStr);
        const match = urlObj.pathname.match(/^\/[^/]+\/(.+)$/);
        const key = match ? decodeURIComponent(match[1]) : '';
        const method = (init?.method || 'GET').toUpperCase();

        if (method === 'PUT') {
          const bodyBuffer = Buffer.isBuffer(init?.body)
            ? init.body
            : Buffer.from(init?.body as ArrayBuffer);
          mockR2Store.set(key, bodyBuffer);
          return {
            ok: true,
            status: 200,
            text: async () => '',
          } as unknown as Response;
        }

        if (method === 'GET') {
          const content = mockR2Store.get(key);
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
          const exists = mockR2Store.has(key);
          return {
            ok: exists,
            status: exists ? 200 : 404,
          } as unknown as Response;
        }

        if (method === 'DELETE') {
          mockR2Store.delete(key);
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

      return new CloudflareR2StorageService({
        accountId: 'test-account-id',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        bucketName: 'test-bucket',
      });
    },
    async () => {
      vi.restoreAllMocks();
      mockR2Store.clear();
    }
  );
});
