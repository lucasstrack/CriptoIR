'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type Network = 'BTC' | 'ETH' | 'BASE' | 'ARB' | 'SOL';

/**
 * Shape do Wallet devolvido por `GET /api/wallets` (ver `WalletRepository.list`).
 * Datas chegam como ISO string após `JSON.stringify` na rota.
 */
export interface WalletDTO {
  id: string;
  label: string;
  address: string;
  network: Network;
  createdAt: string;
  lastSyncedAt: string | null;
  lastSyncedCursor: string | null;
}

export const WALLETS_QUERY_KEY = ['wallets'] as const;

export function useWallets(): UseQueryResult<WalletDTO[], Error> {
  return useQuery({
    queryKey: WALLETS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient<WalletDTO[]>('/api/wallets');
      return data;
    },
  });
}
