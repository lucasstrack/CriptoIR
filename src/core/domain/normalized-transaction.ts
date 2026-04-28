export type NormalizedTransfer = {
  assetSymbol: string;
  assetAddress?: string | null;
  amount: string;
  fromAddress?: string | null;
  toAddress?: string | null;
  direction: 'IN' | 'OUT' | 'SELF' | 'UNKNOWN';
  /**
   * Decimals do asset segundo o provider (quando conhecidos). O persister usa
   * isso para criar/atualizar Asset com decimals reais — SPL tokens variam
   * (USDC=6, BONK=5, jupSOL=9), portanto sem este campo o `defaultDecimals`
   * cai num chute de 18 que e errado para a maioria dos tokens.
   */
  decimals?: number;
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
