import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';

export type ProviderSyncResult = {
  transactions: NormalizedTransaction[];
  nextCursor: string | null;
};

export type ProviderSyncInput = {
  address: string;
  cursor?: string | null;
};

export interface BlockchainProvider {
  readonly network: 'BTC' | 'ETH' | 'BASE' | 'ARB' | 'SOL';
  validateAddress(address: string): boolean;
  fetchTransactions(input: ProviderSyncInput): Promise<ProviderSyncResult>;
}
