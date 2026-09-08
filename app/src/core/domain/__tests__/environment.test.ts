import { describe, it, expect } from 'vitest';

describe('Testing Environment Smoke Test (ATP-IMP-006)', () => {
  it('debe ejecutar pruebas en entorno Node.js', () => {
    expect(typeof process).toBe('object');
    expect(process.versions?.node).toBeDefined();
  });

  it('debe resolver alias de importación @/*', async () => {
    const { generateUUIDv7 } = await import('@/core/domain/uuid');
    expect(typeof generateUUIDv7).toBe('function');
  });
});