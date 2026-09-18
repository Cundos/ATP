import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createImageProcessingService,
  setImageProcessingService,
} from '../imageProcessingFactory';
import { SharpImageProcessingService } from '../SharpImageProcessingService';
import { IImageProcessingService } from '../../../core/domain/services';

describe('imageProcessingFactory (ATP-INFRA-VERCEL-004)', () => {
  beforeEach(() => {
    setImageProcessingService(null);
  });

  afterEach(() => {
    setImageProcessingService(null);
  });

  it('creates SharpImageProcessingService dynamically by default', async () => {
    const service = await createImageProcessingService();
    expect(service).toBeInstanceOf(SharpImageProcessingService);
  });

  it('returns custom injected service when set', async () => {
    const mockService = {} as unknown as IImageProcessingService;
    setImageProcessingService(mockService);
    const service = await createImageProcessingService();
    expect(service).toBe(mockService);
  });
});
