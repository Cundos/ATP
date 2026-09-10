export interface IFileStorageService {
  /**
   * Persists binary file content at the designated storage key.
   * @param storageKey Relative, sanitized storage key (e.g. "photos/AT-PL-001/uuid.webp")
   * @param content Binary content as Buffer or Uint8Array
   * @returns The normalized storage key
   */
  saveFile(storageKey: string, content: Buffer | Uint8Array): Promise<string>;

  /**
   * Resolves the public URL or relative API route for serving the file.
   * @param storageKey Relative storage key
   * @returns URL string (e.g. "/api/photos/view/photos/AT-PL-001/uuid.webp")
   */
  resolveUrl(storageKey: string): string;

  /**
   * Checks whether a file exists at the given storage key.
   * Does not throw if the file does not exist.
   * @param storageKey Relative storage key
   */
  fileExists(storageKey: string): Promise<boolean>;

  /**
   * Reads binary file content from the designated storage key.
   * Throws an error if the file does not exist or cannot be read.
   * @param storageKey Relative storage key
   */
  readFile(storageKey: string): Promise<Buffer>;

  /**
   * Deletes a file at the given storage key.
   * Operation is idempotent: does not throw if the file does not exist.
   * @param storageKey Relative storage key
   */
  deleteFile(storageKey: string): Promise<void>;
}
