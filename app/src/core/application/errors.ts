/**
 * Error de aplicación lanzado cuando una planta solicitada no existe.
 */
export class PlantNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontró el ejemplar con identificador: ${identifier}`);
    this.name = 'PlantNotFoundError';
  }
}

/**
 * Error de aplicación lanzado cuando los datos de entrada para una operación de planta no son válidos.
 */
export class PlantValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlantValidationError';
  }
}