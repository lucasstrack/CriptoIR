'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Network } from '@prisma/client';
import { apiClient } from '@/lib/api-client';

/**
 * Espelha `HoldingDTO` de `src/core/use-cases/compute-holdings.ts`. Mantido
 * local porque a UI não deve carregar módulos com dependência de Prisma/DB.
 */
export interface Holding {
  asset: {
    id: string;
    symbol: string;
    name: string;
    network: Network;
    contractAddress: string | null;
    decimals: number;
  };
  amount: string;
  averagePriceUsd: string | null;
  averagePriceBrl: string | null;
  priceUsd: string | null;
  priceBrl: string | null;
  valueUsd: string | null;
  valueBrl: string | null;
}

export const HOLDINGS_QUERY_KEY = ['holdings'] as const;

export function useHoldings(): UseQueryResult<Holding[], Error> {
  return useQuery<Holding[], Error>({
    queryKey: HOLDINGS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient<Holding[]>('/api/holdings');
      return data;
    },
  });
}
