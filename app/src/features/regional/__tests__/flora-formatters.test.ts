import { describe, it, expect } from 'vitest';
import { formatMonthRanges, formatGrowthHabit } from '../utils/floraFormatters';

describe('ATP-ECO-001C.1: Flora Formatters & Presentation Helpers', () => {
  describe('formatMonthRanges', () => {
    it('formatea un único mes', () => {
      expect(formatMonthRanges([9])).toBe('Sep');
      expect(formatMonthRanges([1])).toBe('Ene');
      expect(formatMonthRanges([12])).toBe('Dic');
    });

    it('formatea secuencia contigua dentro del año', () => {
      expect(formatMonthRanges([9, 10, 11])).toBe('Sep–Nov');
      expect(formatMonthRanges([3, 4, 5, 6])).toBe('Mar–Jun');
      expect(formatMonthRanges([10, 11, 12])).toBe('Oct–Dic');
    });

    it('formatea meses discontinuos sin inventar rango intermedio', () => {
      expect(formatMonthRanges([9, 11, 12])).toBe('Sep · Nov–Dic');
      expect(formatMonthRanges([3, 5, 7])).toBe('Mar · May · Jul');
      expect(formatMonthRanges([1, 4, 5, 8])).toBe('Ene · Abr–May · Ago');
    });

    it('formatea secuencia circular que cruza diciembre a enero', () => {
      expect(formatMonthRanges([12, 1, 2])).toBe('Dic–Feb');
      expect(formatMonthRanges([10, 11, 12, 1, 2, 3])).toBe('Oct–Mar');
      expect(formatMonthRanges([11, 12, 1])).toBe('Nov–Ene');
    });

    it('formatea secuencia mixta con intervalo circular y meses aislados', () => {
      expect(formatMonthRanges([7, 8, 11, 12, 1, 2])).toBe('Jul–Ago · Nov–Feb');
    });

    it('maneja 12 meses como Todo el año', () => {
      expect(formatMonthRanges([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('Todo el año');
    });

    it('maneja arreglos vacíos o con datos inválidos', () => {
      expect(formatMonthRanges([])).toBe('');
      expect(formatMonthRanges([0, 13, -1])).toBe('');
    });
  });

  describe('formatGrowthHabit', () => {
    it('humaniza enums/keys a nombres en español con tildes', () => {
      expect(formatGrowthHabit('TREE')).toBe('Árbol');
      expect(formatGrowthHabit('Árbol')).toBe('Árbol');
      expect(formatGrowthHabit('arbol')).toBe('Árbol');

      expect(formatGrowthHabit('SHRUB')).toBe('Arbusto');
      expect(formatGrowthHabit('arbusto')).toBe('Arbusto');

      expect(formatGrowthHabit('VINE')).toBe('Trepadora');
      expect(formatGrowthHabit('CLIMBER')).toBe('Trepadora');
      expect(formatGrowthHabit('trepadora')).toBe('Trepadora');

      expect(formatGrowthHabit('HERB')).toBe('Hierba');
      expect(formatGrowthHabit('HERBACEOUS')).toBe('Hierba');
      expect(formatGrowthHabit('hierba')).toBe('Hierba');

      expect(formatGrowthHabit('GRASS')).toBe('Gramínea');
      expect(formatGrowthHabit('graminea')).toBe('Gramínea');
      expect(formatGrowthHabit('gramínea')).toBe('Gramínea');
    });

    it('devuelve null ante valores vacíos o nulos', () => {
      expect(formatGrowthHabit(null)).toBeNull();
      expect(formatGrowthHabit(undefined)).toBeNull();
      expect(formatGrowthHabit('   ')).toBeNull();
    });

    it('capitaliza hábitos no estándar sin romper', () => {
      expect(formatGrowthHabit('epífita')).toBe('Epífita');
    });
  });
});
