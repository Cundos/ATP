import * as fs from 'fs';
import * as path from 'path';
import { IFileStorageService, isValidStorageKey } from '../../core/domain/services';

export class LocalFileStorageService implements IFileStorageService {
  private readonly storageRoot: string;

  constructor(storageRoot?: string) {
    this.storageRoot = storageRoot || process.env.STORAGE_LOCAL_PATH || path.join(process.cwd(), 'storage');
  }

  /**
   * Returns the configured storage root path.
   */
  public getStorageRoot(): string {
    return this.storageRoot;
  }

  /**
   * Safely resolves a storageKey within the designated storage root.
   * Throws an error if key is invalid or attempts path traversal.
   */
  private resolveSafePath(storageKey: string): string {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(`Invalid storage key or path traversal detected: "${storageKey}"`);
    }

    const resolvedRoot = path.resolve(this.storageRoot);
    const resolvedPath = path.resolve(resolvedRoot, storageKey);

    // Prevent escaping the storage root directory
    if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
      throw new Error(`Path traversal detected for key: "${storageKey}"`);
    }

    return resolvedPath;
  }

  /**
   * Persists binary file content at the designated storage key.
   */
  async saveFile(storageKey: string, content: Buffer | Uint8Array): Promise<string> {
    const fullPath = this.resolveSafePath(storageKey);
    const dir = path.dirname(fullPath);

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, content);

    return storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  /**
   * Resolves the public URL/route for accessing the photo.
   * Validates storageKey against path traversal and invalid key formats.
   */
  resolveUrl(storageKey: string): string {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(`Invalid storage key or path traversal detected: "${storageKey}"`);
    }
    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    return `/api/photos/view/${normalizedKey}`;
  }

  /**
   * Checks whether a file exists at the given storage key.
   */
  async fileExists(storageKey: string): Promise<boolean> {
    try {
      const fullPath = this.resolveSafePath(storageKey);
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a file at the given storage key.
   * Idempotent: Does not throw if file does not exist.
   */
  async deleteFile(storageKey: string): Promise<void> {
    const fullPath = this.resolveSafePath(storageKey);
    try {
      await fs.promises.unlink(fullPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
