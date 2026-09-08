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

/**
 * Error de aplicación lanzado cuando una ubicación solicitada no existe.
 */
export class LocationNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontró la ubicación con identificador: ${identifier}`);
    this.name = 'LocationNotFoundError';
  }
}

/**
 * Error de aplicación lanzado cuando los datos de entrada para una operación de ubicación no son válidos.
 */
export class LocationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationValidationError';
  }
}

/**
 * Error de aplicación lanzado cuando ya existe una ubicación activa con el mismo nombre (case-insensitive).
 */
export class LocationAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Ya existe una ubicación activa con el nombre: "${name}"`);
    this.name = 'LocationAlreadyExistsError';
  }
}