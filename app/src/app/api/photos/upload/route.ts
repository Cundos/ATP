import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isValidPermanentCode } from '@/core/domain/permanent-code';
import { buildPhotoStorageKey } from '@/core/domain/services';
import { generateUUIDv7 } from '@/core/domain/uuid';
import { ImageProcessingError, StorageUnavailableError } from '@/core/domain/errors';
import { getFileStorageService, getPlantRepository, getPhotoRepository } from '@/infrastructure/services';
import { createImageProcessingService } from '@/infrastructure/image/imageProcessingFactory';
import { RegisterPlantPhotoUseCase } from '@/core/application/use-cases/RegisterPlantPhotoUseCase';

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

    // 3. Extract and validate file (accept both 'file' and 'photo' keys)
    const fileEntry = formData.get('file') || formData.get('photo');
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

    // 4. Extract and resolve plant identifiers (plantId and/or permanentCode)
    const plantIdInput = formData.get('plantId');
    const permanentCodeInput = formData.get('permanentCode');

    let resolvedPlantId: string | undefined =
      typeof plantIdInput === 'string' && plantIdInput.trim() !== '' ? plantIdInput.trim() : undefined;
    let resolvedPermanentCode: string | undefined =
      typeof permanentCodeInput === 'string' && permanentCodeInput.trim() !== '' ? permanentCodeInput.trim() : undefined;

    const plantRepo = getPlantRepository();

    if (!resolvedPermanentCode && resolvedPlantId) {
      try {
        const plant = await plantRepo.findById(resolvedPlantId);
        if (plant) {
          resolvedPermanentCode = plant.permanent_code;
        }
      } catch (err) {
        console.warn('[upload photo] Could not resolve plant by plantId:', err);
      }
    } else if (resolvedPermanentCode && !resolvedPlantId) {
      try {
        const plant = await plantRepo.findByPermanentCode(resolvedPermanentCode);
        if (plant) {
          resolvedPlantId = plant.id;
        }
      } catch {
        // Ignored, plant may not exist in DB during unit tests
      }
    }

    if (!resolvedPermanentCode) {
      return NextResponse.json(
        { error: { code: 'MISSING_PERMANENT_CODE', message: 'The permanentCode field is required.' } },
        { status: 400 }
      );
    }

    const trimmedCode = resolvedPermanentCode.trim();
    if (!isValidPermanentCode(trimmedCode)) {
      return NextResponse.json(
        { error: { code: 'INVALID_PERMANENT_CODE', message: 'The permanentCode format is invalid (must be AT-PL-XXX).' } },
        { status: 400 }
      );
    }

    // 5. Validate and Normalize MIME type
    let mimeType = fileEntry.type ? fileEntry.type.toLowerCase().trim() : '';
    if (mimeType === 'image/jpg') {
      mimeType = 'image/jpeg';
    }

    // Mobile fallback: if browser sent empty, generic, or octet-stream MIME, infer from filename extension
    const fileName = 'name' in fileEntry && typeof (fileEntry as { name?: unknown }).name === 'string'
      ? (fileEntry as { name: string }).name.toLowerCase()
      : '';

    if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'image/*') {
      if (/\.(jpe?g)$/i.test(fileName)) {
        mimeType = 'image/jpeg';
      } else if (/\.png$/i.test(fileName)) {
        mimeType = 'image/png';
      } else if (/\.webp$/i.test(fileName)) {
        mimeType = 'image/webp';
      }
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      const isHeicOrHeif = mimeType.includes('heic') || mimeType.includes('heif') || /\.(heic|heif)$/i.test(fileName);
      const isAvif = mimeType.includes('avif') || /\.avif$/i.test(fileName);

      let customMsg = `MIME type '${mimeType || 'unknown'}' is not supported. Allowed types: image/jpeg, image/png, image/webp.`;
      if (isHeicOrHeif) {
        customMsg = 'El formato HEIC/HEIF de Apple no es compatible directamente. Por favor convertí la imagen o configurala como JPEG en tu cámara.';
      } else if (isAvif) {
        customMsg = 'El formato AVIF no es compatible. Por favor usá JPEG, PNG o WebP.';
      }

      return NextResponse.json(
        {
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: customMsg,
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
          { error: { code: 'STORAGE_UNAVAILABLE', message: 'El almacenamiento de fotografías no está disponible.' } },
          { status: 503 }
        );
      }
      throw err;
    }

    // 8. Convert to Buffer and Process Image
    const arrayBuffer = await fileEntry.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const imageService = await createImageProcessingService();

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
          { error: { code: 'INVALID_IMAGE', message: 'La imagen no pudo ser procesada.' } },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: { code: 'PROCESSING_FAILED', message: 'Failed to process image.' } },
        { status: 422 }
      );
    }

    // 9. Generate fileId and build server-side storageKey
    const fileId = generateUUIDv7();
    const storageKey = buildPhotoStorageKey(trimmedCode, fileId, 'webp');

    // 10. Persist to storage backend and resolve URL
    try {
      await storageService.saveFile(storageKey, processedResult.buffer);
    } catch (err) {
      if (err instanceof StorageUnavailableError) {
        return NextResponse.json(
          { error: { code: 'STORAGE_UNAVAILABLE', message: 'El almacenamiento de fotografías no está disponible.' } },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: { code: 'STORAGE_ERROR', message: 'Failed to persist image to storage.' } },
        { status: 500 }
      );
    }

    const url = storageService.resolveUrl(storageKey);

    // 11. Parse evolution photo metadata if provided
    const takenAtStr = formData.get('taken_at');
    let takenAt: Date | null = null;
    if (typeof takenAtStr === 'string' && takenAtStr.trim() !== '') {
      const parsed = new Date(takenAtStr);
      if (!isNaN(parsed.getTime())) {
        takenAt = parsed;
      }
    }

    const captionInput = formData.get('caption');
    const caption = typeof captionInput === 'string' && captionInput.trim() !== '' ? captionInput.trim() : null;

    const makePrimaryInput = formData.get('make_primary');
    const makePrimary = makePrimaryInput === 'true' || makePrimaryInput === 'on';

    const originalFileName = (fileEntry as { name?: string }).name || `${fileId}.webp`;

    // 12. Atomic DB registration if plant exists or identifiers provided
    let registeredPhoto = null;
    if (resolvedPlantId || formData.has('taken_at') || formData.has('caption') || formData.has('make_primary')) {
      try {
        const photoRepo = getPhotoRepository();
        const registerUseCase = new RegisterPlantPhotoUseCase(plantRepo, photoRepo);

        registeredPhoto = await registerUseCase.execute({
          plant_id: resolvedPlantId,
          permanent_code: trimmedCode,
          storage_key: storageKey,
          file_name: originalFileName,
          mime_type: 'image/webp',
          file_size: processedResult.size,
          width: processedResult.width,
          height: processedResult.height,
          make_primary: makePrimary,
          taken_at: takenAt,
          caption,
        });

        // Revalidate affected cache paths only when a photo was registered
        if (registeredPhoto) {
          try {
            revalidatePath('/');
            revalidatePath('/inventory');
            revalidatePath(`/plants/${trimmedCode}`);
            if (resolvedPlantId) {
              revalidatePath(`/plants/${resolvedPlantId}`);
            }
          } catch {
            // Ignored in non-Next runtime/test environments where static store is absent
          }
        }
      } catch (dbError) {
        console.error('[upload photo] DB registration failed, executing compensatory storage rollback:', dbError);
        // Compensatory cleanup: delete newly saved file from storage
        try {
          await storageService.deleteFile(storageKey);
        } catch (cleanupErr) {
          console.error('[upload photo] Compensatory storage delete error:', cleanupErr);
        }

        return NextResponse.json(
          {
            error: {
              code: 'REGISTRATION_FAILED',
              message: dbError instanceof Error ? dbError.message : 'Error al registrar los metadatos de la fotografía.',
            },
          },
          { status: 500 }
        );
      }
    }

    // 13. Return HTTP 201 Created
    return NextResponse.json(
      {
        success: true,
        storageKey,
        url,
        mimeType: 'image/webp',
        width: processedResult.width,
        height: processedResult.height,
        size: processedResult.size,
        photo: registeredPhoto,
      },
      { status: 201 }
    );
  } catch (unexpectedError) {
    console.error('[upload photo] Unexpected error:', unexpectedError);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
