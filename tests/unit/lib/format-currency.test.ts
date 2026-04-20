import { describe, expect, it } from 'vitest';
import { formatCurrency } from '@/lib/format-currency';

describe('formatCurrency', () => {
  describe('números', () => {
    it('formata em USD respeitando o locale pt-BR', () => {
      const output = formatCurrency(1234.56, 'USD');
      // No locale pt-BR a moeda USD vira "US$"; o separador é vírgula.
      expect(output).toContain('US$');
      expect(output).toContain('1.234,56');
    });

    it('formata em BRL respeitando o locale pt-BR', () => {
      const output = formatCurrency(1234.56, 'BRL');
      expect(output).toContain('R$');
      expect(output).toContain('1.234,56');
    });

    it('retorna "-" para number não-finito', () => {
      expect(formatCurrency(Number.NaN, 'USD')).toBe('-');
      expect(formatCurrency(Number.POSITIVE_INFINITY, 'BRL')).toBe('-');
    });
  });

  describe('bigint', () => {
    it('formata BigInt(0) como zero em USD', () => {
      const output = formatCurrency(BigInt(0), 'USD');
      expect(output).toContain('US$');
      expect(output).toContain('0,00');
    });

    it('formata bigint grande em BRL sem perda de precisão', () => {
      const output = formatCurrency(BigInt('123456789'), 'BRL');
      expect(output).toContain('R$');
      expect(output).toContain('123.456.789');
    });
  });

  describe('string decimal', () => {
    it('formata "123.45" em USD', () => {
      const output = formatCurrency('123.45', 'USD');
      expect(output).toContain('US$');
      expect(output).toContain('123,45');
    });

    it('formata "9876543.21" em BRL', () => {
      const output = formatCurrency('9876543.21', 'BRL');
      expect(output).toContain('R$');
      expect(output).toContain('9.876.543,21');
    });

    it('retorna "-" para string vazia', () => {
      expect(formatCurrency('', 'USD')).toBe('-');
      expect(formatCurrency('   ', 'BRL')).toBe('-');
    });

    it('retorna "-" para string não-numérica', () => {
      expect(formatCurrency('abc', 'USD')).toBe('-');
    });
  });

  describe('opções de precisão', () => {
    it('respeita maximumFractionDigits customizado', () => {
      const output = formatCurrency(1.23456, 'USD', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
      expect(output).toContain('1,2346');
    });
  });
});
