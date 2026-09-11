import { describe, it, expect } from 'vitest';
import { mapActionError } from '../error-handler';
import {
  PlantValidationError,
  PlantNotFoundError,
  LocationValidationError,
  LocationAlreadyExistsError,
  LocationNotFoundError,
  PhotoNotFoundError,
  PhotoOwnershipError,
  PhotoValidationError,
  PlantReferenceNotFoundError,
  PlantReferenceValidationError,
} from '../errors';
import { StorageUnavailableError, ImageProcessingError } from '../../domain/errors';

describe('Centralized Action Error Handler (ATP-IMP-028)', () => {
  it('maps PlantValidationError to structured field errors and message', () => {
    const error = new PlantValidationError('El nombre común es obligatorio.');
    const result = mapActionError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe('El nombre común es obligatorio.');
    expect(result.errors?.common_name).toBe('El nombre común es obligatorio.');
  });

  it('maps LocationValidationError to structured field error and message', () => {
    const error = new LocationValidationError('El nombre debe tener al menos 2 caracteres.');
    const result = mapActionError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe('El nombre debe tener al menos 2 caracteres.');
    expect(result.errors?.name).toBe('El nombre debe tener al menos 2 caracteres.');
  });

  it('maps LocationAlreadyExistsError to duplicate conflict message', () => {
    const error = new LocationAlreadyExistsError('Living');
    const result = mapActionError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Ya existe una ubicación activa con el nombre: "Living"');
    expect(result.errors?.name).toBe('Ya existe una ubicación activa con el nombre: "Living"');
  });

  it('maps not found errors cleanly without exposing internals', () => {
    const plantNotFound = new PlantNotFoundError('AT-PL-999');
    expect(mapActionError(plantNotFound).message).toBe('No se encontró el ejemplar con identificador: AT-PL-999');

    const locNotFound = new LocationNotFoundError('loc-999');
    expect(mapActionError(locNotFound).message).toBe('No se encontró la ubicación con identificador: loc-999');

    const photoNotFound = new PhotoNotFoundError('photo-999');
    expect(mapActionError(photoNotFound).message).toBe('No se encontró la foto con identificador: photo-999');

    const refNotFound = new PlantReferenceNotFoundError('ref-999');
    expect(mapActionError(refNotFound).message).toBe('No se encontró la referencia botánica con identificador: ref-999');
  });

  it('maps photo ownership and validation errors safely', () => {
    const ownershipError = new PhotoOwnershipError('photo-1', 'plant-1');
    expect(mapActionError(ownershipError).message).toBe('La foto photo-1 no pertenece a la planta plant-1');

    const photoValError = new PhotoValidationError('Formato inválido');
    expect(mapActionError(photoValError).message).toBe('Formato inválido');

    const refValError = new PlantReferenceValidationError('Referencia corrupta');
    expect(mapActionError(refValError).message).toBe('Referencia corrupta');
  });

  it('maps infrastructure StorageUnavailableError to safe user notice', () => {
    const error = new StorageUnavailableError('Local storage is not configured.');
    const result = mapActionError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe('El servicio de almacenamiento no está disponible actualmente.');
    // Must NOT contain internal paths or details
    expect(result.message).not.toContain('Local storage');
  });

  it('maps ImageProcessingError to safe user notice', () => {
    const error = new ImageProcessingError('Corrupt JPEG header');
    const result = mapActionError(error);

    expect(result.success).toBe(false);
    expect(result.message).toBe('No se pudo procesar la imagen seleccionada.');
  });

  it('maps unexpected errors or database connection errors to safe fallback without leaking secrets', () => {
    const dbError = new Error('FATAL: password authentication failed for user "postgres" at postgresql://postgres:secret123@ep-cool-db.neon.tech/neondb');
    const result = mapActionError(dbError, 'Algo salió mal al guardar los cambios.');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Algo salió mal al guardar los cambios.');
    expect(result.message).not.toContain('secret123');
    expect(result.message).not.toContain('neon.tech');
    expect(result.message).not.toContain('FATAL');
  });
});
