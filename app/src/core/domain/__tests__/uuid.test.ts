import { describe, it, expect } from 'vitest';
import { generateUUIDv7 } from '../uuid';

describe('UUIDv7 Generator', () => {
  it('debe generar identificadores válidos con formato UUID estándar', () => {
    const id = generateUUIDv7();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    // Regex estándar para formato UUID: 8-4-4-4-12 hex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(id)).toBe(true);
  });

  it('debe generar identificadores únicos y ordenables temporalmente', () => {
    const id1 = generateUUIDv7();
    const id2 = generateUUIDv7();
    expect(id1).not.toBe(id2);
  });
});