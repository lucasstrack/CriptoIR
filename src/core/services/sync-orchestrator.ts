import type { Network } from '@prisma/client';
import type { BlockchainProvider } from '@/infra/blockchain/provider';
import { TransactionRepository, type ClassifiedEntry } from '@/infra/db/transaction-repository';
import { TxClassifier } from '@/core/services/tx-classifier';

export type SyncOrchestratorInput = {
  provider: BlockchainProvider;
  wallet: {
    id: string;
    address: string;
    network: Network;
    lastSyncedCursor: string | null;
  };
  ownedAddresses: string[];
  maxPages?: number;
};

export type SyncOrchestratorResult = {
  persisted: number;
  finalCursor: string | null;
};

const DEFAULT_MAX_PAGES = 50;

export class SyncOrchestrator {
  constructor(
    private readonly classifier: TxClassifier = new TxClassifier(),
    private readonly transactionRepository: TransactionRepository = new TransactionRepository(),
  ) {}

  async sync(input: SyncOrchestratorInput): Promise<SyncOrchestratorResult> {
    const maxPages = input.maxPages ?? DEFAULT_MAX_PAGES;
    let cursor: string | null = input.wallet.lastSyncedCursor;
    let persistedTotal = 0;
    let lastCursor: string | null = cursor;

    for (let page = 0; page < maxPages; page += 1) {
      const { transactions, nextCursor } = await input.provider.fetchTransactions({
        address: input.wallet.address,
        cursor,
      });

      if (transactions.length === 0) {
        break;
      }

      const entries: ClassifiedEntry[] = transactions.map((normalized) => ({
        normalized,
        classification: this.classifier.classify(normalized, input.ownedAddresses),
      }));

      const persisted = await this.transactionRepository.persistBatch(
        input.wallet.id,
        input.wallet.network,
        entries,
      );
      persistedTotal += persisted;

      if (nextCursor === null || nextCursor === cursor) {
        lastCursor = nextCursor ?? cursor;
        break;
      }

      cursor = nextCursor;
      lastCursor = nextCursor;
    }

    return {
      persisted: persistedTotal,
      finalCursor: lastCursor,
    };
  }
}
