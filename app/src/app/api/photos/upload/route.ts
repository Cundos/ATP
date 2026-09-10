import { NextResponse } from 'next/server';
import { isValidPermanentCode } from '@/core/domain/permanent-code';
import { buildPhotoStorageKey } from '@/core/domain/services';
import { generateUuid } from '@/core/domain/uuid';
import { ImageProcessingError, StorageUnavailableError } from '@/core/domain/errors';
import { getFileStorageService, getImageProcessingService } from '@/infrastructure/services';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    // 1. Validate request method / content type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: { code: 'INVALID_CONTENT_TYPE', message: 'Request must be multipart/form-data.' } },
        { status: 400 }
      );
    }

    // 2. Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_MULTIPART', message: 'Failed to parse multipart form data.' } },
        { status: 400 }
      );
    }

    // 3. Extract and validate file
    const fileEntry = formData.get('file');
    if (!fileEntry) {
      return NextResponse.json(
        { error: { code: 'MISSING_FILE', message: 'The file field is required.' } },
        { status: 400 }
      );
    }

    if (!(fileEntry instanceof Blob) || typeof (fileEntry as unknown as { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE', message: 'The file field must be a valid file payload.' } },
        { status: 400 }
      );
    }

    if (fileEntry.size === 0) {
      return NextResponse.json(
        { error: { code: 'EMPTY_FILE', message: 'The provided file is empty.' } },
        { status: 400 }
      );
    }

    // 4. Extract and validate permanentCode
    const permanentCode = formData.get('permanentCode');
    if (!permanentCode || typeof permanentCode !== 'string') {
      return NextResponse.json(
        { error: { code: 'MISSING_PERMANENT_CODE', message: 'The permanentCode field is required.' } },
        { status: 400 }
      );
    }

    const trimmedCode = permanentCode.trim();
    if (!isValidPermanentCode(trimmedCode)) {
      return NextResponse.json(
        { error: { code: 'INVALID_PERMANENT_CODE', message: 'The permanentCode format is invalid (must be AT-PL-XXX).' } },
        { status: 400 }
      );
    }

    // 5. Validate MIME type
    const mimeType = fileEntry.type ? fileEntry.type.toLowerCase() : '';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: `MIME type '${mimeType || 'unknown'}' is not supported. Allowed types: image/jpeg, image/png, image/webp.`,
          },
        },
        { status: 415 }
      );
    }

    // 6. Validate File Size
    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: { code: 'PAYLOAD_TOO_LARGE', message: 'File size exceeds the 20MB limit.' } },
        { status: 413 }
      );
    }

    // 7. Check Storage Service Availability
    let storageService;
    try {
      storageService = getFileStorageService();
    } catch (err) {
      if (err instanceof StorageUnavailableError) {
        return NextResponse.json(
          { error: { code: 'STORAGE_UNAVAILABLE', message: err.message } },
          { status: 503 }
        );
      }
      throw err;
    }

    // 8. Convert to Buffer and Process Image
    const arrayBuffer = await fileEntry.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const imageService = getImageProcessingService();

    let processedResult;
    try {
      processedResult = await imageService.processImage(inputBuffer, {
        maxDimension: 2048,
        quality: 82,
        maxInputBytes: MAX_FILE_SIZE_BYTES,
      });
    } catch (err) {
      if (err instanceof ImageProcessingError) {
        return NextResponse.json(
          { error: { code: 'INVALID_IMAGE', message: err.message } },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: { code: 'PROCESSING_FAILED', message: 'Failed to process image.' } },
        { status: 422 }
      );
    }

    // 9. Generate fileId and build server-side storageKey
    const fileId = generateUuid();
    const storageKey = buildPhotoStorageKey(trimmedCode, fileId, 'webp');

    // 10. Persist to storage backend and resolve URL
    try {
      await storageService.saveFile(storageKey, processedResult.buffer);
    } catch (err) {
      if (err instanceof StorageUnavailableError) {
        return NextResponse.json(
          { error: { code: 'STORAGE_UNAVAILABLE', message: err.message } },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: { code: 'STORAGE_ERROR', message: 'Failed to persist image to storage.' } },
        { status: 500 }
      );
    }

    const url = storageService.resolveUrl(storageKey);

    // 11. Return HTTP 201 Created
    return NextResponse.json(
      {
        storageKey,
        url,
        mimeType: 'image/webp',
        width: processedResult.width,
        height: processedResult.height,
        size: processedResult.size,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
