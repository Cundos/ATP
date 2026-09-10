/**
 * Formatea un número secuencial al código permanente estándar AT-PL-XXX con padding mínimo de 3 dígitos (ADR-002, ADR-017).
 *
 * Ejemplos:
 * 1 -> AT-PL-001
 * 14 -> AT-PL-014
 * 999 -> AT-PL-999
 * 1000 -> AT-PL-1000
 */
export function formatPermanentCode(sequenceNumber: number | bigint): string {
  const num = typeof sequenceNumber === 'bigint' ? Number(sequenceNumber) : sequenceNumber;

  if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
    throw new Error(`Número de secuencia inválido para permanent_code: ${sequenceNumber}`);
  }

  return `AT-PL-${num.toString().padStart(3, '0')}`;
}

/**
 * Valida si un valor cumple el formato oficial de código permanente de planta (ADR-002, ADR-017).
 * Debe comenzar con "AT-PL-" seguido de 3 o más dígitos numéricos (ej. AT-PL-001, AT-PL-014, AT-PL-1000).
 */
export function isValidPermanentCode(code: unknown): code is string {
  if (typeof code !== 'string') {
    return false;
  }

  return /^AT-PL-\d{3,}$/.test(code.trim());
}