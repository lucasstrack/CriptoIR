'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateWalletInput } from '@/lib/zod-schemas/wallet';
import { WALLETS_QUERY_KEY, type WalletDTO } from './use-wallets';

export function useCreateWallet(): UseMutationResult<WalletDTO, Error, CreateWalletInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWalletInput) => {
      const { data } = await apiClient<WalletDTO>('/api/wallets', {
        method: 'POST',
        json: input,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WALLETS_QUERY_KEY });
    },
  });
}
