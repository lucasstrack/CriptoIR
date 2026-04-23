'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TransactionDTO } from '@/core/use-cases/list-transactions';

export type Network = 'BTC' | 'ETH' | 'BASE' | 'ARB' | 'SOL';

export type TxType =
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'INTERNAL'
  | 'SWAP'
  | 'FEE'
  | 'LIQUIDITY_ADD'
  | 'LIQUIDITY_REMOVE'
  | 'STAKING_IN'
  | 'STAKING_OUT'
  | 'UNKNOWN';

export type TransactionSort = 'timestamp:asc' | 'timestamp:desc';

export interface TransactionsFilters {
  dateFrom?: string;
  dateTo?: string;
  network?: Network;
  assetSymbol?: string;
  walletId?: string;
  type?: TxType;
  page: number;
  pageSize: number;
  sort: TransactionSort;
}

export interface TransactionsEnvelope {
  data: TransactionDTO[];
  meta: { total: number; page: number; pageSize: number };
}

// Backend exige ISO datetime com offset (ver transaction-query.ts); os inputs
// de <input type="date"> só dão yyyy-mm-dd. Convertemos para início/fim do dia
// em UTC para preservar o filtro intuitivo "neste dia inteiro".
function toIsoStart(date: string): string {
  return `${date}T00:00:00Z`;
}
function toIsoEnd(date: string): string {
  return `${date}T23:59:59Z`;
}

export function buildTransactionsQuery(filters: TransactionsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set('dateFrom', toIsoStart(filters.dateFrom));
  if (filters.dateTo) params.set('dateTo', toIsoEnd(filters.dateTo));
  if (filters.network) params.set('network', filters.network);
  if (filters.assetSymbol) params.set('assetSymbol', filters.assetSymbol);
  if (filters.walletId) params.set('walletId', filters.walletId);
  if (filters.type) params.set('type', filters.type);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  params.set('sort', filters.sort);
  return params;
}

export function useTransactions(
  filters: TransactionsFilters,
): UseQueryResult<TransactionsEnvelope, Error> {
  return useQuery({
    queryKey: ['transactions', filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = buildTransactionsQuery(filters);
      const { data, meta } = await apiClient<TransactionDTO[]>(
        `/api/transactions?${params.toString()}`,
      );
      const metaRecord = (meta ?? {}) as Record<string, unknown>;
      const total = typeof metaRecord.total === 'number' ? metaRecord.total : data.length;
      const page = typeof metaRecord.page === 'number' ? metaRecord.page : filters.page;
      const pageSize =
        typeof metaRecord.pageSize === 'number' ? metaRecord.pageSize : filters.pageSize;
      return { data, meta: { total, page, pageSize } };
    },
  });
}
