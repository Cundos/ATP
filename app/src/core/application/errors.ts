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

/**
 * Error de aplicación lanzado cuando una foto solicitada no existe.
 */
export class PhotoNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontró la foto con identificador: ${identifier}`);
    this.name = 'PhotoNotFoundError';
  }
}

/**
 * Error de aplicación lanzado cuando los datos de entrada para una operación de foto no son válidos.
 */
export class PhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoValidationError';
  }
}

/**
 * Error de aplicación lanzado cuando se intenta operar sobre una foto que no pertenece a la planta especificada.
 */
export class PhotoOwnershipError extends Error {
  constructor(photoId: string, plantId: string) {
    super(`La foto ${photoId} no pertenece a la planta ${plantId}`);
    this.name = 'PhotoOwnershipError';
  }
}

/**
 * Error de aplicación lanzado cuando una referencia botánica no existe.
 */
export class PlantReferenceNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontró la referencia botánica con identificador: ${identifier}`);
    this.name = 'PlantReferenceNotFoundError';
  }
}

/**
 * Error de aplicación lanzado cuando los datos de entrada para una operación de referencia no son válidos.
 */
export class PlantReferenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlantReferenceValidationError';
  }
}

/**
 * Error de aplicación lanzado cuando una operación requiere autenticación y la sesión es inválida o inexistente.
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'No autorizado. Se requiere iniciar sesión.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error de aplicación lanzado cuando una región o especie flora no existe.
 */
export class RegionalFloraNotFoundError extends Error {
  constructor(identifier: string) {
    super(`No se encontró el recurso de flora regional con identificador: ${identifier}`);
    this.name = 'RegionalFloraNotFoundError';
  }
}

/**
 * Error de aplicación lanzado cuando los parámetros de consulta o datos de flora regional no son válidos.
 */
export class RegionalFloraValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegionalFloraValidationError';
  }
}