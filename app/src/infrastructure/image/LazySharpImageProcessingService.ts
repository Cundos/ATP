import {
  IImageProcessingService,
  ImageProcessingOptions,
  ProcessedImageResult,
} from '../../core/domain/services';

/**
 * Lazy wrapper that defers loading of Sharp and its native binaries
 * until the processImage method is actually called.
 * This prevents sharp/libvips from being traced into Next.js routes
 * that do not perform photo processing.
 */
export class LazySharpImageProcessingService implements IImageProcessingService {
  async processImage(
    input: Buffer | Uint8Array,
    options?: ImageProcessingOptions
  ): Promise<ProcessedImageResult> {
    const { SharpImageProcessingService } = await import(
      './SharpImageProcessingService'
    );
    const service = new SharpImageProcessingService();
    return service.processImage(input, options);
  }
}
