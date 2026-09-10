import { describe, it, expect } from 'vitest';
import { formatPermanentCode, isValidPermanentCode } from '../permanent-code';

describe('formatPermanentCode (ATP-IMP-004)', () => {
  it('debe formatear números menores a 10 con padding de dos ceros', () => {
    expect(formatPermanentCode(1)).toBe('AT-PL-001');
    expect(formatPermanentCode(5)).toBe('AT-PL-005');
    expect(formatPermanentCode(9)).toBe('AT-PL-009');
  });

  it('debe formatear números entre 10 y 99 con padding de un cero', () => {
    expect(formatPermanentCode(14)).toBe('AT-PL-014');
    expect(formatPermanentCode(99)).toBe('AT-PL-099');
  });

  it('debe formatear números de tres dígitos exactamente', () => {
    expect(formatPermanentCode(100)).toBe('AT-PL-100');
    expect(formatPermanentCode(999)).toBe('AT-PL-999');
  });

  it('debe expandirse naturalmente para números de cuatro o más dígitos sin truncar', () => {
    expect(formatPermanentCode(1000)).toBe('AT-PL-1000');
    expect(formatPermanentCode(12345)).toBe('AT-PL-12345');
  });

  it('debe soportar tipos bigint provenientes de secuencias PostgreSQL', () => {
    expect(formatPermanentCode(BigInt(1))).toBe('AT-PL-001');
    expect(formatPermanentCode(BigInt(14))).toBe('AT-PL-014');
    expect(formatPermanentCode(BigInt(1000))).toBe('AT-PL-1000');
  });

  it('debe rechazar números menores a 1 o no enteros', () => {
    expect(() => formatPermanentCode(0)).toThrow();
    expect(() => formatPermanentCode(-5)).toThrow();
    expect(() => formatPermanentCode(1.5)).toThrow();
  });
});

describe('isValidPermanentCode (ATP-IMP-018)', () => {
  it('acepta códigos válidos de 3 o más dígitos numéricos', () => {
    expect(isValidPermanentCode('AT-PL-001')).toBe(true);
    expect(isValidPermanentCode('AT-PL-013')).toBe(true);
    expect(isValidPermanentCode('AT-PL-014')).toBe(true);
    expect(isValidPermanentCode('AT-PL-999')).toBe(true);
    expect(isValidPermanentCode('AT-PL-1000')).toBe(true);
    expect(isValidPermanentCode('AT-PL-99999')).toBe(true);
    expect(isValidPermanentCode(' AT-PL-001 ')).toBe(true);
  });

  it('rechaza códigos con formato inválido, longitud insuficiente o caracteres no numéricos', () => {
    expect(isValidPermanentCode('AT-PL-01')).toBe(false);
    expect(isValidPermanentCode('AT-PL-1')).toBe(false);
    expect(isValidPermanentCode('PL-001')).toBe(false);
    expect(isValidPermanentCode('AT-PL-ABC')).toBe(false);
    expect(isValidPermanentCode('AT-PL-001a')).toBe(false);
    expect(isValidPermanentCode('AT-PL-')).toBe(false);
    expect(isValidPermanentCode('')).toBe(false);
    expect(isValidPermanentCode(null)).toBe(false);
    expect(isValidPermanentCode(undefined)).toBe(false);
    expect(isValidPermanentCode(123)).toBe(false);
  });
});