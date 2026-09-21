import * as crypto from 'crypto';
import {
  IFileStorageService,
  isValidStorageKey,
} from '../../core/domain/services';

export interface GoogleDriveStorageOptions {
  folderId?: string;
  clientEmail?: string;
  privateKey?: string;
  tokenEndpoint?: string;
  apiEndpoint?: string;
  uploadEndpoint?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // timestamp in ms
}

export class GoogleDriveStorageService implements IFileStorageService {
  private readonly folderId: string;
  private readonly clientEmail: string;
  private readonly privateKey: string;
  private readonly tokenEndpoint: string;
  private readonly apiEndpoint: string;
  private readonly uploadEndpoint: string;

  private cachedToken: CachedToken | null = null;
  private fileIdCache: Map<string, string> = new Map();

  constructor(options: GoogleDriveStorageOptions = {}) {
    this.folderId =
      options.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '';
    this.clientEmail =
      options.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    
    let rawKey =
      options.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    if (rawKey.includes('\\n')) {
      rawKey = rawKey.replace(/\\n/g, '\n');
    }
    this.privateKey = rawKey;

    this.tokenEndpoint =
      options.tokenEndpoint || 'https://oauth2.googleapis.com/token';
    this.apiEndpoint =
      options.apiEndpoint || 'https://www.googleapis.com/drive/v3/files';
    this.uploadEndpoint =
      options.uploadEndpoint ||
      'https://www.googleapis.com/upload/drive/v3/files';
  }

  public getFolderId(): string {
    return this.folderId;
  }

  public getClientEmail(): string {
    return this.clientEmail;
  }

  /**
   * Generates a signed JWT and exchanges it for a Google OAuth2 Bearer Access Token.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 300000) {
      return this.cachedToken.accessToken;
    }

    if (!this.clientEmail || !this.privateKey) {
      throw new Error(
        'Google Drive Service Account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) are not configured.'
      );
    }

    const issuedAt = Math.floor(now / 1000);
    const expiresAt = issuedAt + 3600;

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.clientEmail,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
      aud: this.tokenEndpoint,
      exp: expiresAt,
      iat: issuedAt,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signer.end();
    const signature = signer.sign(this.privateKey, 'base64url');

    const jwtAssertion = `${unsignedToken}.${signature}`;

    const tokenResponse = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtAssertion,
      }),
    });

    if (!tokenResponse.ok) {
      let errDetail = '';
      try {
        const errJson = await tokenResponse.json();
        errDetail = errJson.error_description || JSON.stringify(errJson);
      } catch {
        errDetail = await tokenResponse.text();
      }
      throw new Error(
        `Failed to authenticate with Google OAuth2: HTTP ${tokenResponse.status} - ${errDetail}`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token as string;
    const expiresIn = (tokenData.expires_in as number) || 3600;

    this.cachedToken = {
      accessToken,
      expiresAt: now + expiresIn * 1000,
    };

    return accessToken;
  }

  /**
   * Finds the Google Drive file ID for a normalized storage key.
   */
  private async findFileId(normalizedKey: string): Promise<string | null> {
    if (this.fileIdCache.has(normalizedKey)) {
      return this.fileIdCache.get(normalizedKey)!;
    }

    const token = await this.getAccessToken();
    const query = this.folderId
      ? `'${this.folderId}' in parents and name = '${normalizedKey}' and trashed = false`
      : `name = '${normalizedKey}' and trashed = false`;

    const url = `${this.apiEndpoint}?q=${encodeURIComponent(query)}&fields=files(id,name)`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(
        `Google Drive API error searching file: HTTP ${res.status}`
      );
    }

    const data = await res.json();
    const files = data.files as Array<{ id: string; name: string }>;
    if (files && files.length > 0) {
      const fileId = files[0].id;
      this.fileIdCache.set(normalizedKey, fileId);
      return fileId;
    }

    return null;
  }

  /**
   * Persists binary file content in Google Drive.
   */
  async saveFile(
    storageKey: string,
    content: Buffer | Uint8Array
  ): Promise<string> {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(
        `Invalid storage key or path traversal detected: "${storageKey}"`
      );
    }

    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const token = await this.getAccessToken();

    const existingFileId = await this.findFileId(normalizedKey);

    if (existingFileId) {
      // Update existing file content
      const uploadUrl = `${this.uploadEndpoint}/${existingFileId}?uploadType=media`;
      const res = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'image/webp',
        },
        body: new Uint8Array(buffer),
      });

      if (!res.ok) {
        throw new Error(
          `Failed to update file in Google Drive: HTTP ${res.status}`
        );
      }

      return normalizedKey;
    }

    // Create new file via multipart upload
    const metadata: Record<string, unknown> = {
      name: normalizedKey,
      mimeType: 'image/webp',
    };
    if (this.folderId) {
      metadata.parents = [this.folderId];
    }

    const boundary = `-------AtilioPlant${Date.now()}`;
    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n`;
    const mediaHeader = `--${boundary}\r\nContent-Type: image/webp\r\n\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const payloadBuffer = Buffer.concat([
      Buffer.from(metadataPart, 'utf8'),
      Buffer.from(mediaHeader, 'utf8'),
      buffer,
      Buffer.from(closeDelimiter, 'utf8'),
    ]);

    const uploadUrl = `${this.uploadEndpoint}?uploadType=multipart&supportsAllDrives=true`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(payloadBuffer.length),
      },
      body: new Uint8Array(payloadBuffer),
    });

    if (!res.ok) {
      let errDetail = '';
      try {
        const errJson = await res.json();
        errDetail = JSON.stringify(errJson);
      } catch {
        errDetail = await res.text();
      }
      throw new Error(
        `Failed to upload file to Google Drive: HTTP ${res.status} - ${errDetail}`
      );
    }

    const responseData = await res.json();
    if (responseData.id) {
      this.fileIdCache.set(normalizedKey, responseData.id);
    }

    return normalizedKey;
  }

  /**
   * Resolves the public application route for accessing the photo.
   */
  resolveUrl(storageKey: string): string {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(
        `Invalid storage key or path traversal detected: "${storageKey}"`
      );
    }
    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    return `/api/photos/view/${normalizedKey}`;
  }

  /**
   * Checks whether a file exists in Google Drive.
   */
  async fileExists(storageKey: string): Promise<boolean> {
    if (!isValidStorageKey(storageKey)) {
      return false;
    }
    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    try {
      const fileId = await this.findFileId(normalizedKey);
      return Boolean(fileId);
    } catch {
      return false;
    }
  }

  /**
   * Reads binary file content from Google Drive.
   */
  async readFile(storageKey: string): Promise<Buffer> {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(
        `Invalid storage key or path traversal detected: "${storageKey}"`
      );
    }

    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const fileId = await this.findFileId(normalizedKey);

    if (!fileId) {
      throw new Error(`File not found at storage key: "${normalizedKey}"`);
    }

    const token = await this.getAccessToken();
    const downloadUrl = `${this.apiEndpoint}/${fileId}?alt=media`;

    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`File not found at storage key: "${normalizedKey}"`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Deletes a file from Google Drive.
   * Idempotent: Does not throw if the file does not exist.
   */
  async deleteFile(storageKey: string): Promise<void> {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(
        `Invalid storage key or path traversal detected: "${storageKey}"`
      );
    }

    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    try {
      const fileId = await this.findFileId(normalizedKey);
      if (!fileId) {
        return;
      }

      const token = await this.getAccessToken();
      const deleteUrl = `${this.apiEndpoint}/${fileId}`;

      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.fileIdCache.delete(normalizedKey);

      if (!res.ok && res.status !== 404) {
        throw new Error(
          `Failed to delete file from Google Drive: HTTP ${res.status}`
        );
      }
    } catch (err: unknown) {
      if ((err as Error)?.message?.includes('not found')) {
        return;
      }
      throw err;
    }
  }
}
