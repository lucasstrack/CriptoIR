import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CurrencyCode } from '@/lib/format-currency';

export const CURRENCY_STORAGE_KEY = 'criptoir:currency';

export interface CurrencyState {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  toggle: () => void;
}

/**
 * Store global do toggle USD/BRL.
 *
 * Persiste em `localStorage` sob `criptoir:currency`; fallback para um
 * storage no-op no server onde `window` não existe (evita erro de SSR).
 */
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      setCurrency: (currency) => set({ currency }),
      toggle: () => set({ currency: get().currency === 'USD' ? 'BRL' : 'USD' }),
    }),
    {
      name: CURRENCY_STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          const noop: Storage = {
            length: 0,
            clear: () => undefined,
            getItem: () => null,
            key: () => null,
            removeItem: () => undefined,
            setItem: () => undefined,
          };
          return noop;
        }
        return window.localStorage;
      }),
    },
  ),
);
