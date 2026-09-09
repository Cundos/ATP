import sharp from 'sharp';
import {
  IImageProcessingService,
  ImageProcessingOptions,
  ProcessedImageResult,
  DEFAULT_MAX_IMAGE_DIMENSION,
  DEFAULT_WEBP_QUALITY,
  DEFAULT_MAX_INPUT_BYTES,
} from '../../core/domain/services';
import { ImageProcessingError } from '../../core/domain/errors';

export class SharpImageProcessingService implements IImageProcessingService {
  /**
   * Processes a raw image buffer or Uint8Array into an optimized WebP format.
   *
   * @param input Raw image binary data
   * @param options Custom processing options (maxDimension, quality, maxInputBytes)
   * @returns Processed WebP buffer with metadata
   * @throws ImageProcessingError on empty input, invalid format, corrupt data, or limit violation
   */
  async processImage(
    input: Buffer | Uint8Array,
    options?: ImageProcessingOptions
  ): Promise<ProcessedImageResult> {
    // 1. Input existence and type validation
    if (!input || !(input instanceof Uint8Array || Buffer.isBuffer(input))) {
      throw new ImageProcessingError('Input must be a valid Buffer or Uint8Array');
    }

    const inputBuffer = Buffer.isBuffer(input)
      ? input
      : Buffer.from(input.buffer, input.byteOffset, input.byteLength);

    if (inputBuffer.byteLength === 0) {
      throw new ImageProcessingError('Input image buffer cannot be empty');
    }

    // 2. Configuration options resolution and validation
    const maxDimension = options?.maxDimension ?? DEFAULT_MAX_IMAGE_DIMENSION;
    const quality = options?.quality ?? DEFAULT_WEBP_QUALITY;
    const maxInputBytes = options?.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES;

    if (maxDimension <= 0) {
      throw new ImageProcessingError(`Invalid maxDimension: ${maxDimension}. Must be greater than 0.`);
    }

    if (quality < 1 || quality > 100) {
      throw new ImageProcessingError(`Invalid quality: ${quality}. Must be between 1 and 100.`);
    }

    // 3. Security check: input size limit to avoid memory exhaustion
    if (inputBuffer.byteLength > maxInputBytes) {
      throw new ImageProcessingError(
        `Input image size (${inputBuffer.byteLength} bytes) exceeds maximum allowed limit of ${maxInputBytes} bytes.`
      );
    }

    // 4. Sharp transformation pipeline
    try {
      const pipeline = sharp(inputBuffer, {
        failOn: 'none',
        // Limit input pixels to ~268 megapixels to guard against decompression bombs
        limitInputPixels: 268402689,
      })
        // Normalizes orientation based on EXIF tag without saving EXIF metadata
        .rotate()
        // Proportional resize if exceeding maxDimension, never upscale
        .resize({
          width: maxDimension,
          height: maxDimension,
          fit: 'inside',
          withoutEnlargement: true,
        })
        // Convert to WebP format, preserves transparency and discards GPS/EXIF
        .webp({
          quality,
          effort: 4,
        });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

      return {
        buffer: data,
        mimeType: 'image/webp',
        extension: 'webp',
        width: info.width,
        height: info.height,
        size: data.byteLength,
      };
    } catch (err: unknown) {
      if (err instanceof ImageProcessingError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new ImageProcessingError(`Failed to process image: ${message}`, err);
    }
  }
}
