'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Espelha `PortfolioHistoryPoint` de `src/core/use-cases/list-portfolio-history.ts`.
 * Mantido local porque a UI nao deve carregar modulos com dependencia de Prisma/DB.
 */
export interface PortfolioHistoryPoint {
  weekStart: string;
  totalUsd: string;
  totalBrl: string;
  breakdown: Array<{
    assetId: string;
    symbol?: string;
    amount: string;
    valueUsd: string;
    valueBrl: string;
  }>;
}

export const PORTFOLIO_HISTORY_QUERY_KEY = ['portfolio-history'] as const;

export function usePortfolioHistory(): UseQueryResult<PortfolioHistoryPoint[], Error> {
  return useQuery<PortfolioHistoryPoint[], Error>({
    queryKey: PORTFOLIO_HISTORY_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient<PortfolioHistoryPoint[]>('/api/portfolio/history');
      return data;
    },
    staleTime: 30_000,
  });
}
