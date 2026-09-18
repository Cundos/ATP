import { IImageProcessingService } from '../../core/domain/services';

let customImageProcessingService: IImageProcessingService | null = null;

export function setImageProcessingService(service: IImageProcessingService | null): void {
  customImageProcessingService = service;
}

export async function createImageProcessingService(): Promise<IImageProcessingService> {
  if (customImageProcessingService) {
    return customImageProcessingService;
  }
  const { SharpImageProcessingService } = await import('./SharpImageProcessingService');
  return new SharpImageProcessingService();
}
