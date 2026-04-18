import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';

export type ClassifiedTransactionType =
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

export type ClassifiedTransaction = {
  type: ClassifiedTransactionType;
  classificationVersion: number;
};

export class TxClassifier {
  readonly version = 1;

  classify(transaction: NormalizedTransaction, ownedWallets: string[]): ClassifiedTransaction {
    const owned = new Set(ownedWallets.map((wallet) => wallet.toLowerCase()));
    const transfers = transaction.transfers;

    if (transfers.length === 0) {
      return this.unknown();
    }

    const hasIncoming = transfers.some((transfer) => transfer.direction === 'IN');
    const hasOutgoing = transfers.some((transfer) => transfer.direction === 'OUT');
    const internalTransfer = transfers.some((transfer) => {
      const from = transfer.fromAddress?.toLowerCase();
      const to = transfer.toAddress?.toLowerCase();
      return Boolean(from && to && owned.has(from) && owned.has(to));
    });

    if (internalTransfer) {
      return { type: 'INTERNAL', classificationVersion: this.version };
    }

    if (hasIncoming && hasOutgoing) {
      const assetSymbols = new Set(transfers.map((transfer) => transfer.assetSymbol));
      return {
        type: assetSymbols.size > 1 ? 'SWAP' : 'UNKNOWN',
        classificationVersion: this.version,
      };
    }

    if (hasIncoming) {
      return { type: 'TRANSFER_IN', classificationVersion: this.version };
    }

    if (hasOutgoing) {
      return { type: 'TRANSFER_OUT', classificationVersion: this.version };
    }

    if (transaction.fee && transfers.every((transfer) => transfer.amount === '0')) {
      return { type: 'FEE', classificationVersion: this.version };
    }

    return this.unknown();
  }

  private unknown(): ClassifiedTransaction {
    return {
      type: 'UNKNOWN',
      classificationVersion: this.version,
    };
  }
}
