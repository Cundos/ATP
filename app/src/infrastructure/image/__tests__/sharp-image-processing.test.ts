import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { SharpImageProcessingService } from '../SharpImageProcessingService';
import { ImageProcessingError } from '../../../core/domain/errors';

describe('SharpImageProcessingService (ATP-IMP-017)', () => {
  const service = new SharpImageProcessingService();

  // Helper to create synthetic solid color test fixtures
  const createJpeg = async (width: number, height: number): Promise<Buffer> => {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 76, g: 175, b: 80 }, // Leaf green
      },
    })
      .jpeg()
      .toBuffer();
  };

  const createPngWithAlpha = async (width: number, height: number): Promise<Buffer> => {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 33, g: 150, b: 243, alpha: 0.5 }, // Semi-transparent blue
      },
    })
      .png()
      .toBuffer();
  };

  const createWebp = async (width: number, height: number): Promise<Buffer> => {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 152, b: 0 },
      },
    })
      .webp()
      .toBuffer();
  };

  // Helper to create detailed images with complex high-entropy patterns
  const createDetailedImage = async (width: number, height: number): Promise<Buffer> => {
    const pixelCount = width * height;
    const rawRgb = Buffer.alloc(pixelCount * 3);
    for (let i = 0; i < pixelCount; i++) {
      rawRgb[i * 3] = i % 256;
      rawRgb[i * 3 + 1] = (i * 7) % 256;
      rawRgb[i * 3 + 2] = (i * 13) % 256;
    }
    return sharp(rawRgb, { raw: { width, height, channels: 3 } })
      .jpeg()
      .toBuffer();
  };

  describe('Valid Format Conversions to WebP', () => {
    it('converts valid JPEG to optimized WebP', async () => {
      const input = await createJpeg(600, 400);
      const result = await service.processImage(input);

      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('webp');
      expect(result.width).toBe(600);
      expect(result.height).toBe(400);
      expect(result.size).toBe(result.buffer.byteLength);

      // Verify real WebP format header via sharp inspection
      const meta = await sharp(result.buffer).metadata();
      expect(meta.format).toBe('webp');
    });

    it('converts valid PNG and preserves alpha channel transparency', async () => {
      const input = await createPngWithAlpha(300, 300);
      const result = await service.processImage(input);

      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('webp');

      const meta = await sharp(result.buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.hasAlpha).toBe(true);
      expect(meta.channels).toBe(4);
    });

    it('processes valid WebP input maintaining format and metadata', async () => {
      const input = await createWebp(500, 500);
      const result = await service.processImage(input);

      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('webp');

      const meta = await sharp(result.buffer).metadata();
      expect(meta.format).toBe('webp');
    });

    it('accepts Uint8Array input identically to Buffer', async () => {
      const jpegBuffer = await createJpeg(400, 300);
      const uint8ArrayInput = new Uint8Array(jpegBuffer);

      const result = await service.processImage(uint8ArrayInput);
      expect(result.mimeType).toBe('image/webp');
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
    });
  });

  describe('Resizing and Dimension Constraints', () => {
    it('proportionally downscales images exceeding maxDimension without distortion', async () => {
      // 3000 x 1500 (2:1 aspect ratio) -> should resize to 2048 x 1024 with default maxDimension 2048
      const input = await createJpeg(3000, 1500);
      const result = await service.processImage(input);

      expect(result.width).toBe(2048);
      expect(result.height).toBe(1024);
    });

    it('proportionally downscales portrait images exceeding custom maxDimension', async () => {
      // 1000 x 2000 (1:2 aspect ratio) with maxDimension: 600 -> should resize to 300 x 600
      const input = await createJpeg(1000, 2000);
      const result = await service.processImage(input, { maxDimension: 600 });

      expect(result.width).toBe(300);
      expect(result.height).toBe(600);
    });

    it('never upscales images smaller than maxDimension', async () => {
      // 500 x 300 with maxDimension 2048 -> must stay 500 x 300
      const input = await createJpeg(500, 300);
      const result = await service.processImage(input, { maxDimension: 2048 });

      expect(result.width).toBe(500);
      expect(result.height).toBe(300);
    });
  });

  describe('EXIF Normalization and Metadata Stripping', () => {
    it('normalizes EXIF orientation and strips sensitive EXIF metadata by default', async () => {
      // Create image with EXIF orientation 6 (rotate 90 CW)
      const input = await sharp({
        create: {
          width: 800,
          height: 400,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .withMetadata({ orientation: 6 })
        .jpeg()
        .toBuffer();

      const result = await service.processImage(input);

      // Orientation 6 switches width and height when physically rotated
      expect(result.width).toBe(400);
      expect(result.height).toBe(800);

      const meta = await sharp(result.buffer).metadata();
      expect(meta.format).toBe('webp');
      // EXIF metadata must be stripped
      expect(meta.exif).toBeUndefined();
    });
  });

  describe('Quality and Custom Options Configuration', () => {
    it('honors custom quality setting producing smaller files for lower quality', async () => {
      const input = await createDetailedImage(600, 600);

      const lowQuality = await service.processImage(input, { quality: 20 });
      const highQuality = await service.processImage(input, { quality: 95 });

      expect(lowQuality.size).toBeLessThan(highQuality.size);
      expect(lowQuality.mimeType).toBe('image/webp');
      expect(highQuality.mimeType).toBe('image/webp');
    });

    it('rejects invalid quality ranges', async () => {
      const input = await createJpeg(100, 100);

      await expect(service.processImage(input, { quality: 0 })).rejects.toThrow(ImageProcessingError);
      await expect(service.processImage(input, { quality: 101 })).rejects.toThrow(ImageProcessingError);
    });

    it('rejects invalid maxDimension', async () => {
      const input = await createJpeg(100, 100);

      await expect(service.processImage(input, { maxDimension: 0 })).rejects.toThrow(ImageProcessingError);
      await expect(service.processImage(input, { maxDimension: -50 })).rejects.toThrow(ImageProcessingError);
    });
  });

  describe('Security and Error Handling', () => {
    it('rejects empty input buffer with ImageProcessingError', async () => {
      const emptyBuffer = Buffer.alloc(0);
      await expect(service.processImage(emptyBuffer)).rejects.toThrow(ImageProcessingError);
      await expect(service.processImage(emptyBuffer)).rejects.toThrow(/cannot be empty/i);
    });

    it('rejects invalid / non-image byte content with ImageProcessingError', async () => {
      const fakeImage = Buffer.from('this is plain text pretending to be an image file');
      await expect(service.processImage(fakeImage)).rejects.toThrow(ImageProcessingError);
    });

    it('rejects corrupt binary data with ImageProcessingError', async () => {
      const corruptData = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x12, 0x34]);
      await expect(service.processImage(corruptData)).rejects.toThrow(ImageProcessingError);
    });

    it('rejects input buffer exceeding maxInputBytes with ImageProcessingError', async () => {
      const input = await createJpeg(200, 200);
      const smallLimit = 100; // 100 bytes limit

      await expect(service.processImage(input, { maxInputBytes: smallLimit })).rejects.toThrow(
        ImageProcessingError
      );
      await expect(service.processImage(input, { maxInputBytes: smallLimit })).rejects.toThrow(
        /exceeds maximum allowed limit/i
      );
    });
  });
});
