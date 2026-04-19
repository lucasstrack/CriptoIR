import { describe, expect, it } from 'vitest';
import { AverageCostService } from '@/core/services/average-cost';

describe('AverageCostService', () => {
  const service = new AverageCostService();

  it('retorna zeros quando nao ha aquisicoes', () => {
    const result = service.compute([]);
    expect(result.totalAcquiredAmount).toBe('0.000000000000000000');
    expect(result.averagePriceUsd).toBeNull();
    expect(result.averagePriceBrl).toBeNull();
  });

  it('calcula preco medio ponderado por quantidade de aquisicao', () => {
    const result = service.compute([
      { amount: '1', priceUsd: '100', priceBrl: '500' },
      { amount: '3', priceUsd: '200', priceBrl: '1000' },
    ]);
    // (1*100 + 3*200) / 4 = 700/4 = 175
    expect(result.averagePriceUsd).toBe('175.000000000000000000');
    // (1*500 + 3*1000) / 4 = 3500/4 = 875
    expect(result.averagePriceBrl).toBe('875.000000000000000000');
    expect(result.totalAcquiredAmount).toBe('4.000000000000000000');
  });

  it('ignora entradas com amount invalido ou negativo', () => {
    const result = service.compute([
      { amount: '1', priceUsd: '100', priceBrl: '500' },
      { amount: '0', priceUsd: '999', priceBrl: '999' },
      { amount: '-1', priceUsd: '1', priceBrl: '1' },
    ]);
    expect(result.averagePriceUsd).toBe('100.000000000000000000');
    expect(result.totalAcquiredAmount).toBe('1.000000000000000000');
  });

  it('mantem o total adquirido como referencia contabil mesmo apos vendas (nao reseta)', () => {
    // Simula: compra 2 @ 50, compra 1 @ 150. Vendas nao entram aqui (sao OUT).
    const result = service.compute([
      { amount: '2', priceUsd: '50', priceBrl: '250' },
      { amount: '1', priceUsd: '150', priceBrl: '750' },
    ]);
    // Mesmo que o usuario tenha vendido tudo depois, o preco medio contabil preserva
    // (2*50 + 1*150) / 3 = 250/3 ~ 83.33...
    expect(result.averagePriceUsd).toBe('83.333333333333333333');
    expect(result.totalAcquiredAmount).toBe('3.000000000000000000');
  });

  it('ignora aquisicoes sem preco (PriceSnapshot indisponivel) no calculo da media', () => {
    const result = service.compute([
      { amount: '1', priceUsd: '100', priceBrl: '500' },
      { amount: '5', priceUsd: null, priceBrl: null },
    ]);
    // Media somente das entradas com preco.
    expect(result.averagePriceUsd).toBe('100.000000000000000000');
    expect(result.averagePriceBrl).toBe('500.000000000000000000');
    // Total adquirido soma todas as entradas.
    expect(result.totalAcquiredAmount).toBe('6.000000000000000000');
  });

  it('retorna averagePrice null quando todas aquisicoes estao sem preco', () => {
    const result = service.compute([
      { amount: '1', priceUsd: null, priceBrl: null },
      { amount: '2', priceUsd: null, priceBrl: null },
    ]);
    expect(result.averagePriceUsd).toBeNull();
    expect(result.averagePriceBrl).toBeNull();
    expect(result.totalAcquiredAmount).toBe('3.000000000000000000');
  });

  it('preserva precisao decimal em strings (sem float)', () => {
    const result = service.compute([
      { amount: '0.1', priceUsd: '0.1', priceBrl: '0.1' },
      { amount: '0.2', priceUsd: '0.1', priceBrl: '0.1' },
    ]);
    expect(result.averagePriceUsd).toBe('0.100000000000000000');
    expect(result.totalAcquiredAmount).toBe('0.300000000000000000');
  });
});
