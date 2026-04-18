import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';
import type { BlockchainProvider } from '@/infra/blockchain/provider';
import { prisma } from '@/infra/db/prisma';
import { ProviderRegistry } from '@/infra/blockchain/provider-registry';
import { SyncWalletUseCase, SyncWalletError } from '@/core/use-cases/sync-wallet';
import { ensureTestSchema } from '@/../tests/integration/helpers/ensure-test-schema';

async function createWallet(address: string) {
  return prisma.wallet.create({
    data: {
      label: `Wallet ${address}`,
      address,
      network: 'ETH',
    },
    select: { id: true, address: true },
  });
}

function buildProvider(pages: Array<{ transactions: NormalizedTransaction[]; nextCursor: string | null }>): BlockchainProvider {
  return {
    network: 'ETH',
    validateAddress: () => true,
    fetchTransactions: async () => pages.shift() ?? { transactions: [], nextCursor: null },
  };
}

function buildFailingProvider(message: string): BlockchainProvider {
  return {
    network: 'ETH',
    validateAddress: () => true,
    fetchTransactions: async () => {
      throw new Error(message);
    },
  };
}

function ethTransfer(overrides: { txHash: string; cursor: string } & Partial<NormalizedTransaction>): NormalizedTransaction {
  return {
    network: 'ETH',
    walletAddress: '0xwallet',
    blockNumber: '42',
    timestamp: '2026-04-18T10:00:00.000Z',
    status: 'CONFIRMED',
    transfers: [
      {
        assetSymbol: 'ETH',
        amount: '1.5',
        fromAddress: '0xother',
        toAddress: '0xwallet',
        direction: 'IN',
      },
    ],
    fee: null,
    rawPayload: `{"hash":"${overrides.txHash}"}`,
    ...overrides,
  };
}

describe('SyncWalletUseCase (integration)', () => {
  beforeAll(() => {
    ensureTestSchema();
  });

  beforeEach(async () => {
    await prisma.syncLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.wallet.deleteMany();
  });

  it('persiste transacoes vindas do provider e atualiza lastSyncedAt/cursor', async () => {
    const wallet = await createWallet('0xwallet');
    const registry = new ProviderRegistry();
    registry.register(
      'ETH',
      buildProvider([
        {
          transactions: [ethTransfer({ txHash: '0xtx1', cursor: 'cursor-1' })],
          nextCursor: 'cursor-1',
        },
      ]),
    );

    const useCase = new SyncWalletUseCase({ registry });
    const result = await useCase.execute(wallet.id);

    expect(result.persisted).toBe(1);
    const refreshed = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(refreshed.lastSyncedAt).toBeInstanceOf(Date);
    expect(refreshed.lastSyncedCursor).toBe('cursor-1');

    const rows = await prisma.transaction.findMany({ where: { walletId: wallet.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].rawPayload).toBe('{"hash":"0xtx1"}');
    expect(rows[0].type).toBe('TRANSFER_IN');
  });

  it('nao duplica linhas quando o sync eh executado novamente sobre o mesmo txHash', async () => {
    const wallet = await createWallet('0xwallet');
    const registry = new ProviderRegistry();

    registry.register(
      'ETH',
      buildProvider([
        {
          transactions: [ethTransfer({ txHash: '0xtx1', cursor: 'cursor-1' })],
          nextCursor: 'cursor-1',
        },
      ]),
    );
    await new SyncWalletUseCase({ registry }).execute(wallet.id);

    registry.register(
      'ETH',
      buildProvider([
        {
          transactions: [ethTransfer({ txHash: '0xtx1', cursor: 'cursor-1' })],
          nextCursor: 'cursor-1',
        },
      ]),
    );
    const second = await new SyncWalletUseCase({ registry }).execute(wallet.id);

    expect(second.persisted).toBe(0);
    const rows = await prisma.transaction.findMany({ where: { walletId: wallet.id } });
    expect(rows).toHaveLength(1);
  });

  it('marca SyncLog com erro e nao deixa linhas orfas quando o provider falha', async () => {
    const wallet = await createWallet('0xwallet');
    const registry = new ProviderRegistry();
    registry.register('ETH', buildFailingProvider('provider offline'));

    await expect(new SyncWalletUseCase({ registry }).execute(wallet.id)).rejects.toBeInstanceOf(
      SyncWalletError,
    );

    const logs = await prisma.syncLog.findMany({ where: { walletId: wallet.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].error).toContain('provider offline');
    expect(logs[0].finishedAt).toBeInstanceOf(Date);

    const refreshed = await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    expect(refreshed.lastSyncedAt).toBeNull();
    expect(refreshed.lastSyncedCursor).toBeNull();

    const rows = await prisma.transaction.findMany({ where: { walletId: wallet.id } });
    expect(rows).toHaveLength(0);
  });

  it('rejeita inicio de sync quando ja existe SyncLog aberto para a wallet', async () => {
    const wallet = await createWallet('0xwallet');
    await prisma.syncLog.create({
      data: { walletId: wallet.id, startedAt: new Date(), txCount: 0 },
    });

    const registry = new ProviderRegistry();
    registry.register(
      'ETH',
      buildProvider([{ transactions: [], nextCursor: null }]),
    );

    await expect(
      new SyncWalletUseCase({ registry }).execute(wallet.id),
    ).rejects.toMatchObject({ code: 'SYNC_ALREADY_RUNNING' });
  });
});
