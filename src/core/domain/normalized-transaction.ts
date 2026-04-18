export type NormalizedTransfer = {
  assetSymbol: string;
  assetAddress?: string | null;
  amount: string;
  fromAddress?: string | null;
  toAddress?: string | null;
  direction: 'IN' | 'OUT' | 'SELF' | 'UNKNOWN';
};

export type NormalizedFee = {
  amount: string;
  assetSymbol: string;
};

export type NormalizedTransactionStatus = 'CONFIRMED' | 'PENDING' | 'FAILED';

export type NormalizedTransaction = {
  network: 'BTC' | 'ETH' | 'BASE' | 'ARB' | 'SOL';
  walletAddress: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
  status: NormalizedTransactionStatus;
  transfers: NormalizedTransfer[];
  fee?: NormalizedFee | null;
  cursor: string;
  rawPayload: string;
};
