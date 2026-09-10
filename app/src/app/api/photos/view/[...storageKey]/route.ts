import { NextResponse } from 'next/server';
import { isValidStorageKey } from '@/core/domain/services';
import { StorageUnavailableError } from '@/core/domain/errors';
import { getFileStorageService } from '@/infrastructure/services';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ storageKey?: string[] }> | { storageKey?: string[] };
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    // 1. Resolve route params
    const params = await context.params;
    const segments = params?.storageKey || [];

    if (!segments || segments.length === 0) {
      return NextResponse.json(
        { error: { code: 'INVALID_STORAGE_KEY', message: 'Storage key is required.' } },
        { status: 400 }
      );
    }

    // 2. Reconstruct storageKey from segments and decode URL characters
    const rawKey = segments.join('/');
    let decodedKey: string;
    try {
      decodedKey = decodeURIComponent(rawKey);
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_STORAGE_KEY', message: 'Malformed storage key encoding.' } },
        { status: 400 }
      );
    }

    // 3. Security validation against path traversal, absolute paths, drive letters, etc.
    if (!isValidStorageKey(decodedKey)) {
      return NextResponse.json(
        { error: { code: 'INVALID_STORAGE_KEY', message: 'Invalid storage key or path traversal detected.' } },
        { status: 400 }
      );
    }

    // 4. Enforce .webp extension for served photos
    if (!decodedKey.toLowerCase().endsWith('.webp')) {
      return NextResponse.json(
        { error: { code: 'INVALID_STORAGE_KEY', message: 'Only .webp images are served by this endpoint.' } },
        { status: 400 }
      );
    }

    // 5. Check Storage Service Availability
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

    // 6. Check file existence
    let exists = false;
    try {
      exists = await storageService.fileExists(decodedKey);
    } catch (err) {
      if (err instanceof StorageUnavailableError) {
        return NextResponse.json(
          { error: { code: 'STORAGE_UNAVAILABLE', message: 'El almacenamiento de fotografías no está disponible.' } },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: { code: 'STORAGE_ERROR', message: 'Failed to check file existence.' } },
        { status: 500 }
      );
    }

    if (!exists) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Photo file not found.' } },
        { status: 404 }
      );
    }

    // 7. Read binary file content
    let fileBuffer: Buffer;
    try {
      fileBuffer = await storageService.readFile(decodedKey);
    } catch (err) {
      if (err instanceof StorageUnavailableError) {
        return NextResponse.json(
          { error: { code: 'STORAGE_UNAVAILABLE', message: 'El almacenamiento de fotografías no está disponible.' } },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: { code: 'READ_FAILED', message: 'Failed to read photo from storage.' } },
        { status: 500 }
      );
    }

    // 8. Return binary response with immutable caching headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
