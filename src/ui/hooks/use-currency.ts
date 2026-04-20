'use client';

import { useCurrencyStore } from '@/ui/stores/currency-store';
import type { CurrencyCode } from '@/lib/format-currency';

export interface UseCurrencyReturn {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  toggle: () => void;
}

/**
 * Hook de alto nível para consumir o toggle USD/BRL em qualquer tela.
 *
 * Encapsula o store para deixar os componentes desacoplados do zustand —
 * se trocarmos o mecanismo interno, basta manter esta assinatura.
 */
export function useCurrency(): UseCurrencyReturn {
  const currency = useCurrencyStore((state) => state.currency);
  const setCurrency = useCurrencyStore((state) => state.setCurrency);
  const toggle = useCurrencyStore((state) => state.toggle);

  return { currency, setCurrency, toggle };
}
