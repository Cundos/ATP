import * as crypto from 'crypto';
import { IFileStorageService } from '../../core/domain/services';
import { isValidStorageKey } from '../../core/domain/services/storage-keys';

export interface CloudflareR2Config {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  endpoint?: string;
  region?: string;
}

/**
 * Native, zero-dependency Cloudflare R2 / S3-compatible Object Storage Provider.
 *
 * Implements AWS Signature Version 4 (SigV4) natively via Node.js crypto module,
 * ensuring 0 MB third-party bundle overhead and high-speed cold-starts on Vercel Functions.
 */
export class CloudflareR2StorageService implements IFileStorageService {
  private readonly accountId: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly region: string;

  constructor(config?: CloudflareR2Config) {
    this.accountId = (
      config?.accountId ||
      process.env.R2_ACCOUNT_ID ||
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      ''
    ).trim();

    this.accessKeyId = (
      config?.accessKeyId ||
      process.env.R2_ACCESS_KEY_ID ||
      process.env.AWS_ACCESS_KEY_ID ||
      ''
    ).trim();

    this.secretAccessKey = (
      config?.secretAccessKey ||
      process.env.R2_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      ''
    ).trim();

    this.bucketName = (
      config?.bucketName ||
      process.env.R2_BUCKET_NAME ||
      process.env.AWS_S3_BUCKET ||
      ''
    ).trim();

    this.region = (
      config?.region ||
      process.env.R2_REGION ||
      process.env.AWS_REGION ||
      'auto'
    ).trim();

    const rawEndpoint = (
      config?.endpoint ||
      process.env.R2_ENDPOINT ||
      process.env.S3_ENDPOINT ||
      (this.accountId
        ? `https://${this.accountId}.r2.cloudflarestorage.com`
        : '')
    ).trim();

    this.endpoint = rawEndpoint.replace(/\/+$/, '');
  }

  private ensureConfigured(): void {
    if (!this.accessKeyId || !this.secretAccessKey || !this.bucketName || !this.endpoint) {
      throw new Error(
        'Cloudflare R2 Storage credentials are not fully configured. Ensure R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_ACCOUNT_ID (or R2_ENDPOINT) are set.'
      );
    }
  }

  /**
   * Builds the target URI for an S3/R2 object.
   */
  private getObjectUrl(normalizedKey: string): { url: URL; pathAndQuery: string } {
    const fullUrlStr = `${this.endpoint}/${this.bucketName}/${normalizedKey}`;
    const url = new URL(fullUrlStr);
    return {
      url,
      pathAndQuery: url.pathname + url.search,
    };
  }

  /**
   * Computes HMAC-SHA256 digest.
   */
  private hmacSha256(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
  }

  /**
   * Computes SHA-256 hex string.
   */
  private sha256Hex(data: Buffer | string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Signs an HTTP request using AWS Signature Version 4.
   */
  private signRequest(
    method: string,
    url: URL,
    payloadBuffer: Buffer,
    extraHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const now = new Date();
    const isoDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHmmssZ
    const dateStamp = isoDate.slice(0, 8); // YYYYMMDD

    const payloadHash = this.sha256Hex(payloadBuffer);

    const headersToSign: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': isoDate,
      ...extraHeaders,
    };

    const sortedHeaderKeys = Object.keys(headersToSign)
      .map((k) => k.toLowerCase())
      .sort();

    const canonicalHeaders = sortedHeaderKeys
      .map((key) => `${key}:${headersToSign[key].trim()}\n`)
      .join('');

    const signedHeaders = sortedHeaderKeys.join(';');

    const canonicalUri = url.pathname;
    const canonicalQuery = url.searchParams.toString();

    const canonicalRequest = [
      method.toUpperCase(),
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const canonicalRequestHash = this.sha256Hex(canonicalRequest);

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      isoDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    const kDate = this.hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = this.hmacSha256(kDate, this.region);
    const kService = this.hmacSha256(kRegion, 's3');
    const kSigning = this.hmacSha256(kService, 'aws4_request');
    const signature = this.hmacSha256(kSigning, stringToSign).toString('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...headersToSign,
      Authorization: authorizationHeader,
    };
  }

  /**
   * Persists binary file content in Cloudflare R2 / S3.
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

    this.ensureConfigured();

    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const { url } = this.getObjectUrl(normalizedKey);

    const signedHeaders = this.signRequest('PUT', url, buffer, {
      'content-type': 'image/webp',
      'content-length': String(buffer.length),
    });

    const res = await fetch(url.toString(), {
      method: 'PUT',
      headers: signedHeaders,
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      let errDetail = '';
      try {
        errDetail = await res.text();
      } catch {
        errDetail = `HTTP ${res.status}`;
      }
      throw new Error(
        `Failed to save file to Cloudflare R2: HTTP ${res.status} - ${errDetail}`
      );
    }

    return normalizedKey;
  }

  /**
   * Reads raw binary file content from Cloudflare R2 / S3.
   */
  async readFile(storageKey: string): Promise<Buffer> {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(
        `Invalid storage key or path traversal detected: "${storageKey}"`
      );
    }

    this.ensureConfigured();

    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const { url } = this.getObjectUrl(normalizedKey);
    const emptyPayload = Buffer.alloc(0);

    const signedHeaders = this.signRequest('GET', url, emptyPayload);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: signedHeaders,
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          `File not found in Cloudflare R2 storage: "${storageKey}"`
        );
      }
      throw new Error(
        `Failed to read file from Cloudflare R2: HTTP ${res.status}`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Checks if a file exists in Cloudflare R2 / S3 using HEAD.
   */
  async fileExists(storageKey: string): Promise<boolean> {
    if (!isValidStorageKey(storageKey)) {
      return false;
    }

    try {
      this.ensureConfigured();
      const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
      const { url } = this.getObjectUrl(normalizedKey);
      const emptyPayload = Buffer.alloc(0);

      const signedHeaders = this.signRequest('HEAD', url, emptyPayload);

      const res = await fetch(url.toString(), {
        method: 'HEAD',
        headers: signedHeaders,
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Deletes a file from Cloudflare R2 / S3.
   */
  async deleteFile(storageKey: string): Promise<void> {
    if (!isValidStorageKey(storageKey)) {
      throw new Error(
        `Invalid storage key or path traversal detected: "${storageKey}"`
      );
    }

    this.ensureConfigured();

    const normalizedKey = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const { url } = this.getObjectUrl(normalizedKey);
    const emptyPayload = Buffer.alloc(0);

    const signedHeaders = this.signRequest('DELETE', url, emptyPayload);

    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: signedHeaders,
    });

    // In S3/R2 standard, DELETE on a non-existent object returns 204 (idempotent).
    if (!res.ok && res.status !== 404) {
      throw new Error(
        `Failed to delete file from Cloudflare R2: HTTP ${res.status}`
      );
    }
  }

  /**
   * Returns internal streaming/view route for Next.js caching.
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
}
