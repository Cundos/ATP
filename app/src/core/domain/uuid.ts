import { v7 as uuidv7 } from 'uuid';

/**
 * Genera un identificador técnico único de tipo UUIDv7 (timestamp-ordered)
 */
export function generateUUIDv7(): string {
  return uuidv7();
}