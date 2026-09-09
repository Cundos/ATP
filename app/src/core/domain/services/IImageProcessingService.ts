export const DEFAULT_MAX_IMAGE_DIMENSION = 2048;
export const DEFAULT_WEBP_QUALITY = 82;
export const DEFAULT_MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 MB

export interface ImageProcessingOptions {
  /**
   * Maximum width or height dimension in pixels. Defaults to 2048.
   */
  maxDimension?: number;

  /**
   * WebP compression quality from 1 to 100. Defaults to 82.
   */
  quality?: number;

  /**
   * Maximum allowed input size in bytes. Defaults to 20 MB.
   */
  maxInputBytes?: number;
}

export interface ProcessedImageResult {
  /**
   * Processed WebP binary buffer.
   */
  buffer: Buffer;

  /**
   * Standard MIME type of the output image.
   */
  mimeType: 'image/webp';

  /**
   * Standard file extension.
   */
  extension: 'webp';

  /**
   * Pixel width of the processed image.
   */
  width: number;

  /**
   * Pixel height of the processed image.
   */
  height: number;

  /**
   * Byte size of the processed WebP buffer.
   */
  size: number;
}

export interface IImageProcessingService {
  /**
   * Processes a raw image buffer/Uint8Array:
   * - Normalizes EXIF orientation
   * - Resizes proportionally within maxDimension (without upscaling)
   * - Converts to optimized WebP format with alpha preservation and stripped metadata
   * - Returns typed result with dimensions and byte size
   *
   * @param input Raw image Buffer or Uint8Array
   * @param options Custom processing options (maxDimension, quality, maxInputBytes)
   * @throws ImageProcessingError if input is empty, invalid, corrupt, or exceeds limits
   */
  processImage(
    input: Buffer | Uint8Array,
    options?: ImageProcessingOptions
  ): Promise<ProcessedImageResult>;
}
