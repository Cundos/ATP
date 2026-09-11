import {
  PlantNotFoundError,
  PlantValidationError,
  LocationNotFoundError,
  LocationValidationError,
  LocationAlreadyExistsError,
  PhotoNotFoundError,
  PhotoValidationError,
  PhotoOwnershipError,
  PlantReferenceNotFoundError,
  PlantReferenceValidationError,
} from './errors';
import {
  StorageUnavailableError,
  ImageProcessingError,
} from '../domain/errors';

export interface ActionErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

/**
 * Mapea errores de dominio, aplicación e infraestructura a respuestas seguras para Server Actions.
 * Garantiza cero fuga de stack traces, queries internas, variables de entorno o credenciales.
 */
export function mapActionError(
  error: unknown,
  fallbackMessage: string = 'Algo salió mal al procesar la solicitud.'
): ActionErrorResponse {
  if (error instanceof PlantValidationError) {
    return {
      success: false,
      errors: { common_name: error.message },
      message: error.message,
    };
  }

  if (error instanceof LocationValidationError) {
    return {
      success: false,
      errors: { name: error.message },
      message: error.message,
    };
  }

  if (error instanceof LocationAlreadyExistsError) {
    return {
      success: false,
      errors: { name: error.message },
      message: error.message,
    };
  }

  if (
    error instanceof PlantNotFoundError ||
    error instanceof LocationNotFoundError ||
    error instanceof PhotoNotFoundError ||
    error instanceof PlantReferenceNotFoundError
  ) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (error instanceof PhotoOwnershipError) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (error instanceof PhotoValidationError || error instanceof PlantReferenceValidationError) {
    return {
      success: false,
      message: error.message,
    };
  }

  if (error instanceof StorageUnavailableError) {
    return {
      success: false,
      message: 'El servicio de almacenamiento no está disponible actualmente.',
    };
  }

  if (error instanceof ImageProcessingError) {
    return {
      success: false,
      message: 'No se pudo procesar la imagen seleccionada.',
    };
  }

  // Handle generic error names safely
  const err = error as { name?: string; message?: string };
  if (err?.name === 'PlantValidationError' || err?.name === 'LocationValidationError') {
    return {
      success: false,
      message: err.message || 'Error de validación.',
    };
  }

  if (err?.name === 'PlantNotFoundError' || err?.name === 'LocationNotFoundError') {
    return {
      success: false,
      message: err.message || 'El recurso solicitado no fue encontrado.',
    };
  }

  return {
    success: false,
    message: fallbackMessage,
  };
}
