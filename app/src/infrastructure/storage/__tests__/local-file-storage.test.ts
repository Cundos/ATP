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

  it('persists file physically under root + key without duplicating photos/photos directory', async () => {
    const key = 'photos/AT-PL-001/leaf.webp';
    const content = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    const returnedKey = await storage.saveFile(key, content);
    expect(returnedKey).toBe(key);

    // Physical path must be exactly tempDir/photos/AT-PL-001/leaf.webp
    const expectedPhysicalPath = path.join(tempDir, 'photos', 'AT-PL-001', 'leaf.webp');
    const duplicatedPhotosPath = path.join(tempDir, 'photos', 'photos', 'AT-PL-001', 'leaf.webp');

    expect(fs.existsSync(expectedPhysicalPath)).toBe(true);
    expect(fs.existsSync(duplicatedPhotosPath)).toBe(false);

    const writtenData = await fs.promises.readFile(expectedPhysicalPath);
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

  describe('readFile', () => {
    it('reads binary content from an existing stored file', async () => {
      const key = 'photos/AT-PL-001/leaf.webp';
      const content = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
      await storage.saveFile(key, content);

      const retrieved = await storage.readFile(key);
      expect(retrieved).toEqual(content);
    });

    it('throws error when reading non-existent file', async () => {
      await expect(storage.readFile('photos/AT-PL-001/nonexistent.webp')).rejects.toThrow();
    });

    it('throws error when reading with traversal or invalid key', async () => {
      await expect(storage.readFile('../secret.txt')).rejects.toThrow(/traversal/i);
      await expect(storage.readFile('/etc/passwd')).rejects.toThrow(/traversal/i);
    });
  });

  describe('resolveUrl', () => {
    it('generates valid relative route for valid photo storage keys', () => {
      const url = storage.resolveUrl('photos/AT-PL-001/a0eebc99.webp');
      expect(url).toBe('/api/photos/view/photos/AT-PL-001/a0eebc99.webp');

      const urlAlt = storage.resolveUrl('photos/AT-PL-014/photo-123.jpg');
      expect(urlAlt).toBe('/api/photos/view/photos/AT-PL-014/photo-123.jpg');
    });

    it('resolveUrl rechaza traversal con error y no genera URL', () => {
      expect(() => storage.resolveUrl('../secret')).toThrow(/traversal/i);
      expect(() => storage.resolveUrl('photos/../../secret.txt')).toThrow(/traversal/i);
      expect(() => storage.resolveUrl('photos/..')).toThrow(/traversal/i);
    });

    it('resolveUrl rechaza absolute path con error y no genera URL', () => {
      expect(() => storage.resolveUrl('/etc/passwd')).toThrow(/traversal/i);
      expect(() => storage.resolveUrl('/photos/AT-PL-001/img.webp')).toThrow(/traversal/i);
      expect(() => storage.resolveUrl('\\photos\\AT-PL-001\\img.webp')).toThrow(/traversal/i);
    });

    it('resolveUrl rechaza Windows drive path con error y no genera URL', () => {
      expect(() => storage.resolveUrl('C:\\secret')).toThrow(/traversal/i);
      expect(() => storage.resolveUrl('C:/photos/img.webp')).toThrow(/traversal/i);
      expect(() => storage.resolveUrl('D:\\app\\test.png')).toThrow(/traversal/i);
    });
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

    it('rejects absolute paths and drive letters on save', async () => {
      await expect(storage.saveFile('/root/exploit.txt', Buffer.from('exploit'))).rejects.toThrow();
      await expect(storage.saveFile('C:/exploit.txt', Buffer.from('exploit'))).rejects.toThrow();
    });
  });
});
