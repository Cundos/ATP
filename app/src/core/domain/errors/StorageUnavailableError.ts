export class StorageUnavailableError extends Error {
  constructor(message: string = 'Storage service is unavailable or not configured') {
    super(message);
    this.name = 'StorageUnavailableError';
    Object.setPrototypeOf(this, StorageUnavailableError.prototype);
  }
}
