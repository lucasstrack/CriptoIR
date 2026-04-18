import { describe, expect, it, vi } from 'vitest';
import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';
import type { BlockchainProvider } from '@/infra/blockchain/provider';
import type { ClassifiedEntry } from '@/infra/db/transaction-repository';
import { TransactionRepository } from '@/infra/db/transaction-repository';
import { TxClassifier } from '@/core/services/tx-classifier';
import { SyncOrchestrator } from '@/core/services/sync-orchestrator';

function normalized(overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return {
    network: 'ETH',
    walletAddress: '0xwallet',
    txHash: '0xtx1',
    blockNumber: '10',
    timestamp: '2026-04-18T10:00:00.000Z',
    status: 'CONFIRMED',
    transfers: [
      {
        assetSymbol: 'ETH',
        amount: '1',
        fromAddress: '0xother',
        toAddress: '0xwallet',
        direction: 'IN',
      },
    ],
    fee: null,
    cursor: 'cursor-a',
    rawPayload: '{"raw":"a"}',
    ...overrides,
  };
}

function fakeProvider(pages: Array<{ transactions: NormalizedTransaction[]; nextCursor: string | null }>) {
  const calls: Array<{ cursor: string | null | undefined }> = [];
  const provider: BlockchainProvider = {
    network: 'ETH',
    validateAddress: () => true,
    fetchTransactions: vi.fn(async ({ cursor }) => {
      calls.push({ cursor });
      return pages.shift() ?? { transactions: [], nextCursor: null };
    }),
  };
  return { provider, calls };
}

function fakeRepository() {
  const batches: Array<{ walletId: string; entries: ClassifiedEntry[] }> = [];
  const repository = {
    persistBatch: vi.fn(async (walletId: string, _network, entries: ClassifiedEntry[]) => {
      batches.push({ walletId, entries });
      return entries.reduce((sum, entry) => sum + entry.normalized.transfers.length, 0);
    }),
  } as unknown as TransactionRepository;
  return { repository, batches };
}

describe('SyncOrchestrator', () => {
  it('consome paginacao do provider comecando pelo lastSyncedCursor da wallet', async () => {
    const { provider, calls } = fakeProvider([
      { transactions: [normalized({ txHash: '0xtx1', cursor: 'cursor-a' })], nextCursor: 'cursor-b' },
      { transactions: [normalized({ txHash: '0xtx2', cursor: 'cursor-b' })], nextCursor: 'cursor-b' },
    ]);
    const { repository } = fakeRepository();
    const orchestrator = new SyncOrchestrator(new TxClassifier(), repository);

    const result = await orchestrator.sync({
      provider,
      wallet: {
        id: 'w1',
        address: '0xwallet',
        network: 'ETH',
        lastSyncedCursor: 'cursor-start',
      },
      ownedAddresses: ['0xwallet'],
    });

    expect(calls[0].cursor).toBe('cursor-start');
    expect(calls[1].cursor).toBe('cursor-b');
    expect(result.finalCursor).toBe('cursor-b');
    expect(result.persisted).toBe(2);
  });

  it('classifica cada transacao com contexto das wallets do usuario antes de persistir', async () => {
    const { provider } = fakeProvider([
      {
        transactions: [
          normalized({
            txHash: '0xinternal',
            transfers: [
              {
                assetSymbol: 'ETH',
                amount: '1',
                fromAddress: '0xwallet',
                toAddress: '0xwallet2',
                direction: 'OUT',
              },
            ],
          }),
        ],
        nextCursor: null,
      },
    ]);
    const { repository, batches } = fakeRepository();
    const orchestrator = new SyncOrchestrator(new TxClassifier(), repository);

    await orchestrator.sync({
      provider,
      wallet: { id: 'w1', address: '0xwallet', network: 'ETH', lastSyncedCursor: null },
      ownedAddresses: ['0xwallet', '0xwallet2'],
    });

    expect(batches).toHaveLength(1);
    expect(batches[0].entries[0].classification.type).toBe('INTERNAL');
    expect(batches[0].entries[0].normalized.rawPayload).toBe('{"raw":"a"}');
  });

  it('encerra o loop quando nextCursor eh null ou repete o cursor atual', async () => {
    const { provider, calls } = fakeProvider([
      { transactions: [normalized({ txHash: '0xtx1' })], nextCursor: null },
      { transactions: [normalized({ txHash: '0xtx2' })], nextCursor: 'should-not-fetch' },
    ]);
    const { repository } = fakeRepository();
    const orchestrator = new SyncOrchestrator(new TxClassifier(), repository);

    const result = await orchestrator.sync({
      provider,
      wallet: { id: 'w1', address: '0xwallet', network: 'ETH', lastSyncedCursor: null },
      ownedAddresses: ['0xwallet'],
    });

    expect(calls).toHaveLength(1);
    expect(result.finalCursor).toBeNull();
  });

  it('respeita o teto de paginas para evitar loop infinito em provider defeituoso', async () => {
    const provider: BlockchainProvider = {
      network: 'ETH',
      validateAddress: () => true,
      fetchTransactions: vi.fn(async () => ({
        transactions: [normalized({ txHash: `0xtx-${Math.random()}` })],
        nextCursor: `cursor-${Math.random()}`,
      })),
    };
    const { repository } = fakeRepository();
    const orchestrator = new SyncOrchestrator(new TxClassifier(), repository);

    await orchestrator.sync({
      provider,
      wallet: { id: 'w1', address: '0xwallet', network: 'ETH', lastSyncedCursor: null },
      ownedAddresses: ['0xwallet'],
      maxPages: 3,
    });

    expect(provider.fetchTransactions).toHaveBeenCalledTimes(3);
  });
});
