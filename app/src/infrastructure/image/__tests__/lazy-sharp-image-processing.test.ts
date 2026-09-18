import { describe, it, expect } from 'vitest';
import { LazySharpImageProcessingService } from '../LazySharpImageProcessingService';
import sharp from 'sharp';

describe('LazySharpImageProcessingService', () => {
  const service = new LazySharpImageProcessingService();

  it('successfully delegates image processing to SharpImageProcessingService lazily', async () => {
    const rawPng = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 100, g: 200, b: 50 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.processImage(rawPng, {
      maxDimension: 32,
      quality: 80,
    });

    expect(result).toBeDefined();
    expect(result.mimeType).toBe('image/webp');
    expect(result.extension).toBe('webp');
    expect(result.width).toBe(32);
    expect(result.height).toBe(32);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });
});
