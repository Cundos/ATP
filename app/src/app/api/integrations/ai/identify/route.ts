import { NextRequest, NextResponse } from 'next/server';
import { GeminiPlantIdentificationService } from '@/infrastructure/ai/GeminiPlantIdentificationService';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let imageBuffer: Buffer;
    let mimeType: string = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const photo = formData.get('photo') as File | null;

      if (!photo) {
        return NextResponse.json(
          { error: 'No se incluyó ninguna imagen en la solicitud.' },
          { status: 400 }
        );
      }

      if (photo.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error:
              'La imagen supera el límite permitido de 10 MB para análisis con IA.',
          },
          { status: 400 }
        );
      }

      mimeType = photo.type || 'image/jpeg';
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          {
            error:
              'Formato de imagen no soportado. Usá JPEG, PNG, WebP o HEIC.',
          },
          { status: 400 }
        );
      }
      const arrayBuffer = await photo.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!body.imageBase64) {
        return NextResponse.json(
          { error: 'Se requiere el campo imageBase64.' },
          { status: 400 }
        );
      }

      mimeType = body.mimeType || 'image/jpeg';
      imageBuffer = Buffer.from(body.imageBase64, 'base64');

      if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error:
              'La imagen supera el límite permitido de 10 MB para análisis con IA.',
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            'Tipo de contenido no soportado. Debe ser multipart/form-data o application/json.',
        },
        { status: 415 }
      );
    }

    if (imageBuffer.length === 0) {
      return NextResponse.json(
        { error: 'El archivo de imagen está vacío.' },
        { status: 400 }
      );
    }

    const aiService = new GeminiPlantIdentificationService();
    const result = await aiService.identifyPlant(imageBuffer, mimeType);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'No se pudo identificar la planta.',
          isPlant: false,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Error inesperado en la identificación con IA.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
