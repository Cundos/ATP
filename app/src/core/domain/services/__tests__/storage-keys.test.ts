import { describe, it, expect } from 'vitest';
import { buildPhotoStorageKey, isValidStorageKey } from '../storage-keys';

describe('Storage Keys Helper', () => {
  describe('buildPhotoStorageKey', () => {
    it('builds standard photo storage key', () => {
      const key = buildPhotoStorageKey('AT-PL-001', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'webp');
      expect(key).toBe('photos/AT-PL-001/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.webp');
    });

    it('sanitizes leading dots from extension and trims whitespace', () => {
      const key = buildPhotoStorageKey(' AT-PL-002 ', ' file-id-123 ', '.JPG ');
      expect(key).toBe('photos/AT-PL-002/file-id-123.jpg');
    });
  });

  describe('isValidStorageKey', () => {
    it('accepts valid relative storage keys', () => {
      expect(isValidStorageKey('photos/AT-PL-001/sample.webp')).toBe(true);
      expect(isValidStorageKey('photos/AT-PL-002/thumb_small.jpg')).toBe(true);
      expect(isValidStorageKey('temp-file.png')).toBe(true);
      expect(isValidStorageKey('a/b/c/d/image_123-v2.jpeg')).toBe(true);
    });

    it('rejects empty or whitespace strings', () => {
      expect(isValidStorageKey('')).toBe(false);
      expect(isValidStorageKey('   ')).toBe(false);
      expect(isValidStorageKey(null as unknown as string)).toBe(false);
      expect(isValidStorageKey(undefined as unknown as string)).toBe(false);
    });

    it('rejects directory traversal attempts', () => {
      expect(isValidStorageKey('../secret.txt')).toBe(false);
      expect(isValidStorageKey('photos/../../etc/passwd')).toBe(false);
      expect(isValidStorageKey('photos/..')).toBe(false);
      expect(isValidStorageKey('photos/.')).toBe(false);
      expect(isValidStorageKey('photos/subdir/../../../root')).toBe(false);
    });

    it('rejects absolute paths with leading slash or backslash', () => {
      expect(isValidStorageKey('/photos/AT-PL-001/img.webp')).toBe(false);
      expect(isValidStorageKey('\\photos\\AT-PL-001\\img.webp')).toBe(false);
    });

    it('rejects Windows drive letters', () => {
      expect(isValidStorageKey('C:/storage/img.webp')).toBe(false);
      expect(isValidStorageKey('D:\\app\\secret.png')).toBe(false);
    });

    it('rejects null bytes', () => {
      expect(isValidStorageKey('photos/AT-PL-001/img.webp\0.exe')).toBe(false);
    });

    it('rejects illegal characters', () => {
      expect(isValidStorageKey('photos/AT-PL-001/img<>.webp')).toBe(false);
      expect(isValidStorageKey('photos/AT-PL-001/img|pipe.webp')).toBe(false);
      expect(isValidStorageKey('photos/AT-PL-001/img?query=1')).toBe(false);
    });
  });
});
