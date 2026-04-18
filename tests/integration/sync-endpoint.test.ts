import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  POST,
  __resetStartSyncUseCaseForTests,
  __setStartSyncUseCaseForTests,
} from '@/app/api/wallets/[id]/sync/route';
import { prisma } from '@/infra/db/prisma';
import { ProviderRegistry } from '@/infra/blockchain/provider-registry';
import { StartSyncUseCase, type BackgroundRunner } from '@/core/use-cases/start-sync';
import type { BlockchainProvider } from '@/infra/blockchain/provider';
import type { NormalizedTransaction } from '@/core/domain/normalized-transaction';
import { ensureTestSchema } from '@/../tests/integration/helpers/ensure-test-schema';

function stubProvider(pages: Array<{ transactions: NormalizedTransaction[]; nextCursor: string | null }>): BlockchainProvider {
  return {
    network: 'ETH',
    validateAddress: () => true,
    fetchTransactions: async () => pages.shift() ?? { transactions: [], nextCursor: null },
  };
}

function syncRequest(id: string): Request {
  return new Request(`http://localhost:3000/api/wallets/${id}/sync`, { method: 'POST' });
}

describe('POST /api/wallets/[id]/sync', () => {
  const background: Promise<void>[] = [];
  const awaitableRunner: BackgroundRunner = (task) => {
    background.push(task());
  };

  beforeAll(() => {
    ensureTestSchema();
  });

  beforeEach(async () => {
    background.length = 0;
    await prisma.syncLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.wallet.deleteMany();

    const registry = new ProviderRegistry();
    registry.register(
      'ETH',
      stubProvider([{ transactions: [], nextCursor: null }]),
    );
    __setStartSyncUseCaseForTests(
      new StartSyncUseCase({ registry, runner: awaitableRunner }),
    );
  });

  afterEach(async () => {
    await Promise.allSettled(background);
    __resetStartSyncUseCaseForTests();
  });

  it('retorna 202 com syncLogId e cria SyncLog aberto', async () => {
    const wallet = await prisma.wallet.create({
      data: { label: 'W', address: '0xwallet', network: 'ETH' },
      select: { id: true },
    });

    const response = await POST(syncRequest(wallet.id), {
      params: Promise.resolve({ id: wallet.id }),
    });
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.error).toBeNull();
    expect(payload.data.syncLogId).toBeTypeOf('string');

    const log = await prisma.syncLog.findUniqueOrThrow({
      where: { id: payload.data.syncLogId },
    });
    expect(log.walletId).toBe(wallet.id);
  });

  it('retorna 404 WALLET_NOT_FOUND quando o id nao existe', async () => {
    const response = await POST(syncRequest('inexistente'), {
      params: Promise.resolve({ id: 'inexistente' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toMatchObject({ code: 'WALLET_NOT_FOUND' });
  });

  it('retorna 409 SYNC_ALREADY_RUNNING quando ja existe SyncLog aberto', async () => {
    const wallet = await prisma.wallet.create({
      data: { label: 'W', address: '0xwallet', network: 'ETH' },
      select: { id: true },
    });
    await prisma.syncLog.create({
      data: { walletId: wallet.id, startedAt: new Date(), txCount: 0 },
    });

    const response = await POST(syncRequest(wallet.id), {
      params: Promise.resolve({ id: wallet.id }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toMatchObject({ code: 'SYNC_ALREADY_RUNNING' });
  });
});
