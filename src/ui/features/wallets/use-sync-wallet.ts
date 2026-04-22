'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { WALLETS_QUERY_KEY } from './use-wallets';

export interface SyncWalletResult {
  syncLogId: string;
}

export function useSyncWallet(): UseMutationResult<SyncWalletResult, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await apiClient<SyncWalletResult>(
        `/api/wallets/${encodeURIComponent(walletId)}/sync`,
        { method: 'POST' },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
    },
  });
}
