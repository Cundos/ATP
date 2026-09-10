import { put, head, del, get, BlobNotFoundError } from '@vercel/blob';
import { IFileStorageService, isValidStorageKey } from '../../core/domain/services';

export class VercelBlobStorageService implements IFileStorageService {
  private readonly token?: string;

  constructor(token?: string) {
    this.token = token || process.env.BLOB_READ_WRITE_TOKEN;
  }

  public getToken(): string | undefined {
    return this.token;
  }

  /**
   * Persists binary file content at the designated storage key in Vercel Blob.
   */
  async saveFile(storageKey: string, content: Buffer | Uint8Array): Promise<string> {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(`Invalid storage key or path traversal detected: "${storageKey}"`);
    }
    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    await put(normalizedKey, buffer, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'image/webp',
      token: this.token,
    });

    return normalizedKey;
  }

  /**
   * Resolves the public application route for accessing the photo.
   */
  resolveUrl(storageKey: string): string {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(`Invalid storage key or path traversal detected: "${storageKey}"`);
    }
    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    return `/api/photos/view/${normalizedKey}`;
  }

  /**
   * Checks whether a blob exists at the given storage key.
   */
  async fileExists(storageKey: string): Promise<boolean> {
    if (!isValidStorageKey(storageKey)) {
      return false;
    }
    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    try {
      await head(normalizedKey, { token: this.token });
      return true;
    } catch (err: unknown) {
      if (
        err instanceof BlobNotFoundError ||
        (err as { name?: string })?.name === 'BlobNotFoundError' ||
        (err as { status?: number })?.status === 404 ||
        (err as Error)?.message?.includes('could not find the blob')
      ) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Reads binary file content from Vercel Blob storage.
   */
  async readFile(storageKey: string): Promise<Buffer> {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(`Invalid storage key or path traversal detected: "${storageKey}"`);
    }
    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    try {
      const result = await get(normalizedKey, {
        access: 'public',
        token: this.token,
      });

      if (!result || !result.stream) {
        throw new Error(`File not found at storage key: "${normalizedKey}"`);
      }

      const reader = result.stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      return Buffer.concat(chunks);
    } catch (err: unknown) {
      if (
        err instanceof BlobNotFoundError ||
        (err as { name?: string })?.name === 'BlobNotFoundError' ||
        (err as { status?: number })?.status === 404 ||
        (err as Error)?.message?.includes('could not find the blob')
      ) {
        throw new Error(`File not found at storage key: "${normalizedKey}"`);
      }
      throw err;
    }
  }

  /**
   * Deletes a blob at the given storage key.
   * Idempotent: Does not throw if the blob does not exist.
   */
  async deleteFile(storageKey: string): Promise<void> {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(`Invalid storage key or path traversal detected: "${storageKey}"`);
    }
    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    try {
      await del(normalizedKey, { token: this.token });
    } catch (err: unknown) {
      if (
        err instanceof BlobNotFoundError ||
        (err as { name?: string })?.name === 'BlobNotFoundError' ||
        (err as { status?: number })?.status === 404 ||
        (err as Error)?.message?.includes('could not find the blob')
      ) {
        return;
      }
      throw err;
    }
  }
}
