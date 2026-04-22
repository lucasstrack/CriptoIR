import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENCY_STORAGE_KEY, useCurrencyStore } from '@/ui/stores/currency-store';

describe('currency-store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Reset store para USD (default) entre testes para isolamento.
    useCurrencyStore.setState({ currency: 'USD' });
  });

  it('inicia com USD por padrão', () => {
    expect(useCurrencyStore.getState().currency).toBe('USD');
  });

  it('setCurrency altera o estado global', () => {
    useCurrencyStore.getState().setCurrency('BRL');
    expect(useCurrencyStore.getState().currency).toBe('BRL');

    useCurrencyStore.getState().setCurrency('USD');
    expect(useCurrencyStore.getState().currency).toBe('USD');
  });

  it('toggle alterna entre USD e BRL', () => {
    expect(useCurrencyStore.getState().currency).toBe('USD');

    useCurrencyStore.getState().toggle();
    expect(useCurrencyStore.getState().currency).toBe('BRL');

    useCurrencyStore.getState().toggle();
    expect(useCurrencyStore.getState().currency).toBe('USD');
  });

  it('persiste em localStorage sob a chave criptoir:currency', async () => {
    useCurrencyStore.getState().setCurrency('BRL');

    // zustand persist pode escrever de forma assíncrona dependendo do
    // storage adapter (no-op em SSR, sync em localStorage, Promise em
    // IndexedDB). `vi.waitFor` sobrevive a qualquer dos três sem assumir
    // um tick específico.
    const parsed = await vi.waitFor(() => {
      const raw = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      expect(raw).not.toBeNull();
      return JSON.parse(raw ?? '{}');
    });
    expect(parsed.state.currency).toBe('BRL');
  });

  it('hidrata o estado a partir do localStorage em nova montagem', async () => {
    window.localStorage.setItem(
      CURRENCY_STORAGE_KEY,
      JSON.stringify({ state: { currency: 'BRL' }, version: 0 }),
    );

    // rehydrate carrega do storage para o store ativo.
    await useCurrencyStore.persist.rehydrate();

    expect(useCurrencyStore.getState().currency).toBe('BRL');
  });
});
