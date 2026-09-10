import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { IFileStorageService } from '../../../core/domain/services';
import { LocalFileStorageService } from '../LocalFileStorageService';

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
});
