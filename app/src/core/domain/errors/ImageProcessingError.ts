export class ImageProcessingError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'ImageProcessingError';
    Object.setPrototypeOf(this, ImageProcessingError.prototype);
  }
}
