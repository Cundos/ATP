import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalFileStorageService } from '../LocalFileStorageService';

describe('LocalFileStorageService', () => {
  let tempDir: string;
  let storage: LocalFileStorageService;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'atp-storage-test-'));
    storage = new LocalFileStorageService(tempDir);
  });

  afterAll(async () => {
    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('uses configured storage root path', () => {
    expect(storage.getStorageRoot()).toBe(tempDir);
  });

  it('saves a binary buffer and creates parent directories recursively', async () => {
    const key = 'photos/AT-PL-001/leaf.webp';
    const content = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    const returnedKey = await storage.saveFile(key, content);
    expect(returnedKey).toBe(key);

    const exists = await storage.fileExists(key);
    expect(exists).toBe(true);

    const physicalPath = path.join(tempDir, 'photos', 'AT-PL-001', 'leaf.webp');
    const writtenData = await fs.promises.readFile(physicalPath);
    expect(writtenData).toEqual(content);
  });

  it('saves a Uint8Array content correctly', async () => {
    const key = 'photos/AT-PL-002/thumbnail.jpg';
    const content = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    await storage.saveFile(key, content);
    expect(await storage.fileExists(key)).toBe(true);

    const physicalPath = path.join(tempDir, 'photos', 'AT-PL-002', 'thumbnail.jpg');
    const writtenData = await fs.promises.readFile(physicalPath);
    expect(new Uint8Array(writtenData)).toEqual(content);
  });

  it('fileExists returns false for nonexistent files without throwing', async () => {
    const exists = await storage.fileExists('photos/AT-PL-999/does-not-exist.webp');
    expect(exists).toBe(false);
  });

  it('resolveUrl generates relative route for viewing photos', () => {
    const url = storage.resolveUrl('photos/AT-PL-001/a0eebc99.webp');
    expect(url).toBe('/api/photos/view/photos/AT-PL-001/a0eebc99.webp');

    // Normalizes leading slashes and Windows backslashes
    const urlFromBackslashes = storage.resolveUrl('photos\\AT-PL-001\\a0eebc99.webp');
    expect(urlFromBackslashes).toBe('/api/photos/view/photos/AT-PL-001/a0eebc99.webp');
  });

  it('deletes an existing file and subsequent fileExists returns false', async () => {
    const key = 'photos/AT-PL-003/to-delete.webp';
    await storage.saveFile(key, Buffer.from('hello-plant'));

    expect(await storage.fileExists(key)).toBe(true);
    await storage.deleteFile(key);
    expect(await storage.fileExists(key)).toBe(false);
  });

  it('deleteFile is idempotent and does not throw when deleting nonexistent file', async () => {
    await expect(storage.deleteFile('photos/AT-PL-999/nonexistent.webp')).resolves.not.toThrow();
  });

  it('supports saving multiple distinct files concurrently', async () => {
    const files = [
      { key: 'photos/AT-PL-001/img1.webp', content: Buffer.from('file-1') },
      { key: 'photos/AT-PL-001/img2.webp', content: Buffer.from('file-2') },
      { key: 'photos/AT-PL-002/img3.webp', content: Buffer.from('file-3') },
      { key: 'photos/AT-PL-003/img4.webp', content: Buffer.from('file-4') },
    ];

    await Promise.all(files.map((f) => storage.saveFile(f.key, f.content)));

    for (const f of files) {
      expect(await storage.fileExists(f.key)).toBe(true);
      const readContent = await fs.promises.readFile(path.join(tempDir, ...f.key.split('/')));
      expect(readContent.toString()).toBe(f.content.toString());
    }
  });

  describe('Security & Path Traversal Prevention', () => {
    it('rejects saving files outside storage root via parent directory traversal', async () => {
      await expect(
        storage.saveFile('../escape.txt', Buffer.from('exploit'))
      ).rejects.toThrow(/traversal/i);

      await expect(
        storage.saveFile('photos/../../secret.txt', Buffer.from('exploit'))
      ).rejects.toThrow(/traversal/i);
    });

    it('rejects deleting files outside storage root', async () => {
      await expect(storage.deleteFile('../escape.txt')).rejects.toThrow(/traversal/i);
      await expect(storage.deleteFile('photos/../../etc/passwd')).rejects.toThrow(/traversal/i);
    });

    it('rejects checking existence of invalid traversal keys safely', async () => {
      const exists = await storage.fileExists('../escape.txt');
      expect(exists).toBe(false);
    });

    it('rejects absolute paths and drive letters', async () => {
      await expect(storage.saveFile('/root/exploit.txt', Buffer.from('exploit'))).rejects.toThrow();
      await expect(storage.saveFile('C:/exploit.txt', Buffer.from('exploit'))).rejects.toThrow();
    });
  });
});
