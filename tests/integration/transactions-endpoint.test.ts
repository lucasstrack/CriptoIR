import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Network, TxType } from '@prisma/client';
import { GET } from '@/app/api/transactions/route';
import { prisma } from '@/infra/db/prisma';
import { ensureTestSchema } from '@/../tests/integration/helpers/ensure-test-schema';

type WalletRecord = { id: string; label: string; address: string; network: Network };
type AssetRecord = { id: string; symbol: string; network: Network };

async function createWallet(label: string, address: string, network: Network): Promise<WalletRecord> {
  return prisma.wallet.create({
    data: { label, address, network },
    select: { id: true, label: true, address: true, network: true },
  });
}

async function ensureAsset(symbol: string, network: Network): Promise<AssetRecord> {
  const existing = await prisma.asset.findFirst({
    where: { symbol, network, contractAddress: null },
    select: { id: true, symbol: true, network: true },
  });
  if (existing) return existing;
  return prisma.asset.create({
    data: { symbol, name: symbol, network, decimals: 18, contractAddress: null },
    select: { id: true, symbol: true, network: true },
  });
}

type SeedTxInput = {
  wallet: WalletRecord;
  asset: AssetRecord;
  txHash: string;
  timestamp: string;
  type: TxType;
  direction?: 'IN' | 'OUT';
  amount?: string;
};

async function seedTx(input: SeedTxInput) {
  const direction = input.direction ?? (input.type === 'TRANSFER_IN' ? 'IN' : 'OUT');
  return prisma.transaction.create({
    data: {
      walletId: input.wallet.id,
      network: input.wallet.network,
      txHash: input.txHash,
      blockNumber: BigInt(1),
      timestamp: new Date(input.timestamp),
      direction,
      type: input.type,
      counterparty: '0xdead',
      assetId: input.asset.id,
      amount: input.amount ?? '1.0',
      status: 'CONFIRMED',
      rawPayload: '{}',
      classificationVersion: 1,
    },
  });
}

function getRequest(query: Record<string, string>) {
  const params = new URLSearchParams(query).toString();
  return new Request(`http://localhost:3000/api/transactions${params ? `?${params}` : ''}`);
}

describe('GET /api/transactions', () => {
  beforeAll(() => {
    ensureTestSchema();
  });

  beforeEach(async () => {
    await prisma.syncLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.wallet.deleteMany();
  });

  it('retorna lista paginada com meta.page/pageSize/total', async () => {
    const wallet = await createWallet('W', '0xwallet', 'ETH');
    const asset = await ensureAsset('ETH', 'ETH');
    for (let i = 0; i < 3; i += 1) {
      await seedTx({
        wallet,
        asset,
        txHash: `0xtx${i}`,
        timestamp: `2026-04-${10 + i}T10:00:00.000Z`,
        type: 'TRANSFER_IN',
      });
    }

    const response = await GET(getRequest({ pageSize: '2', page: '1' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta).toEqual({ page: 1, pageSize: 2, total: 3 });
    expect(payload.data).toHaveLength(2);
    expect(payload.data[0]).toMatchObject({
      txHash: '0xtx2',
      asset: { symbol: 'ETH' },
      wallet: { id: wallet.id, label: 'W' },
    });
  });

  it('aplica filtros dateFrom, dateTo, network, assetSymbol, walletId e type combinados', async () => {
    const walletEth = await createWallet('Eth', '0xeth', 'ETH');
    const walletBtc = await createWallet('Btc', 'bc1addr', 'BTC');
    const assetEth = await ensureAsset('ETH', 'ETH');
    const assetUsdc = await ensureAsset('USDC', 'ETH');
    const assetBtc = await ensureAsset('BTC', 'BTC');

    await seedTx({
      wallet: walletEth,
      asset: assetEth,
      txHash: '0xa',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
    });
    await seedTx({
      wallet: walletEth,
      asset: assetUsdc,
      txHash: '0xb',
      timestamp: '2026-04-15T00:00:00.000Z',
      type: 'TRANSFER_OUT',
      direction: 'OUT',
    });
    await seedTx({
      wallet: walletEth,
      asset: assetUsdc,
      txHash: '0xc',
      timestamp: '2026-04-20T00:00:00.000Z',
      type: 'TRANSFER_OUT',
      direction: 'OUT',
    });
    await seedTx({
      wallet: walletBtc,
      asset: assetBtc,
      txHash: 'btc1',
      timestamp: '2026-04-15T00:00:00.000Z',
      type: 'TRANSFER_IN',
    });

    const response = await GET(
      getRequest({
        dateFrom: '2026-04-01T00:00:00.000Z',
        dateTo: '2026-04-18T00:00:00.000Z',
        network: 'ETH',
        assetSymbol: 'USDC',
        walletId: walletEth.id,
        type: 'TRANSFER_OUT',
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].txHash).toBe('0xb');
  });

  it('ordena por timestamp desc por padrao e aceita sort=timestamp:asc', async () => {
    const wallet = await createWallet('W', '0xwallet', 'ETH');
    const asset = await ensureAsset('ETH', 'ETH');
    await seedTx({ wallet, asset, txHash: '0xold', timestamp: '2026-01-01T00:00:00.000Z', type: 'TRANSFER_IN' });
    await seedTx({ wallet, asset, txHash: '0xnew', timestamp: '2026-04-01T00:00:00.000Z', type: 'TRANSFER_IN' });

    const desc = await (await GET(getRequest({}))).json();
    expect(desc.data.map((t: { txHash: string }) => t.txHash)).toEqual(['0xnew', '0xold']);

    const asc = await (await GET(getRequest({ sort: 'timestamp:asc' }))).json();
    expect(asc.data.map((t: { txHash: string }) => t.txHash)).toEqual(['0xold', '0xnew']);
  });

  it('retorna 400 VALIDATION_ERROR para payload invalido', async () => {
    const response = await GET(getRequest({ pageSize: '9999' }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
