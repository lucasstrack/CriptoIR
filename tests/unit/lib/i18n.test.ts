import { describe, expect, it } from 'vitest';
import { t, ptBR, type MessageKey } from '@/lib/i18n';

describe('t(key)', () => {
  it('retorna a string pt-BR correspondente a uma chave válida', () => {
    expect(t('nav.patrimonio')).toBe('Patrimônio');
    expect(t('nav.carteiras')).toBe('Carteiras');
    expect(t('nav.transacoes')).toBe('Transações');
  });

  it('retorna todas as chaves exportadas em ptBR como strings não-vazias', () => {
    const keys = Object.keys(ptBR) as MessageKey[];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const value = t(key);
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('expõe o alvo do toggle USD/BRL no dicionário', () => {
    expect(t('currency.toggle.usd')).toBe('USD');
    expect(t('currency.toggle.brl')).toBe('BRL');
  });

  // Contrato de tipagem: chave inexistente quebra build via MessageKey.
  // Esta asserção existe para documentar o comportamento — se alguém
  // relaxar a tipagem, este teste continua passando mas o review pega
  // o uso de `string` em vez de `MessageKey` na assinatura de `t`.
  it('tipa o parâmetro como keyof typeof ptBR', () => {
    const key: MessageKey = 'nav.brand';
    expect(t(key)).toBe('CriptoIR');
  });
});
