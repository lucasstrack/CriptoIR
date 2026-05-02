import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Direction, Network, TxType } from '@prisma/client';
import {
  RecordPortfolioSnapshotUseCase,
  normalizeToWeekStartUTC,
} from '@/core/use-cases/record-portfolio-snapshot';
import { PriceService } from '@/core/services/price-service';
import { prisma } from '@/infra/db/prisma';
import { ensureTestSchema } from '@/../tests/integration/helpers/ensure-test-schema';

type WalletRecord = { id: string; label: string; address: string; network: Network };
type AssetRecord = {
  id: string;
  symbol: string;
  network: Network;
  contractAddress: string | null;
  coingeckoId: string | null;
};

async function createWallet(
  label: string,
  address: string,
  network: Network,
): Promise<WalletRecord> {
  return prisma.wallet.create({
    data: { label, address, network },
    select: { id: true, label: true, address: true, network: true },
  });
}

async function ensureAsset(symbol: string, network: Network): Promise<AssetRecord> {
  const existing = await prisma.asset.findFirst({
    where: { symbol, network, contractAddress: null },
    select: { id: true, symbol: true, network: true, contractAddress: true, coingeckoId: true },
  });
  if (existing) return existing;
  return prisma.asset.create({
    data: { symbol, name: symbol, network, decimals: 18, contractAddress: null },
    select: { id: true, symbol: true, network: true, contractAddress: true, coingeckoId: true },
  });
}

type SeedTxInput = {
  wallet: WalletRecord;
  asset: AssetRecord;
  txHash: string;
  timestamp: string;
  type: TxType;
  direction: Direction;
  amount: string;
};

async function seedTx(input: SeedTxInput) {
  return prisma.transaction.create({
    data: {
      walletId: input.wallet.id,
      network: input.wallet.network,
      txHash: input.txHash,
      blockNumber: BigInt(1),
      timestamp: new Date(input.timestamp),
      direction: input.direction,
      type: input.type,
      counterparty: '0xdead',
      assetId: input.asset.id,
      amount: input.amount,
      status: 'CONFIRMED',
      rawPayload: '{}',
      classificationVersion: 1,
    },
  });
}

function buildUseCaseWithMockedPrices(
  prices: Record<string, { priceUsd: string; priceBrl: string } | 'fail'>,
) {
  const mockService = {
    getPriceById: vi.fn(async (coingeckoId: string) => {
      const value = prices[coingeckoId];
      if (!value || value === 'fail') {
        throw new Error(`no price for ${coingeckoId}`);
      }
      return { priceUsd: value.priceUsd, priceBrl: value.priceBrl };
    }),
    getPriceForAsset: vi.fn(async (asset: AssetRecord) => {
      const key = asset.contractAddress
        ? `${asset.network}:${asset.contractAddress.toLowerCase()}`
        : asset.coingeckoId ?? (asset.network === 'BTC' ? 'bitcoin' : asset.network === 'SOL' ? 'solana' : 'ethereum');
      const value = prices[key];
      if (!value || value === 'fail') {
        throw new Error(`no price for ${key}`);
      }
      return { priceUsd: value.priceUsd, priceBrl: value.priceBrl };
    }),
  } as unknown as PriceService;
  return new RecordPortfolioSnapshotUseCase(mockService);
}

describe('RecordPortfolioSnapshotUseCase', () => {
  beforeAll(() => {
    ensureTestSchema();
  });

  beforeEach(async () => {
    await prisma.portfolioSnapshot.deleteMany();
    await prisma.priceSnapshot.deleteMany();
    await prisma.syncLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.wallet.deleteMany();
  });

  it('normaliza referenceDate para domingo 00:00 UTC', () => {
    // 2026-04-19 e' domingo; 2026-04-22 e' quarta
    expect(normalizeToWeekStartUTC(new Date('2026-04-19T10:30:00.000Z')).toISOString()).toBe(
      '2026-04-19T00:00:00.000Z',
    );
    expect(normalizeToWeekStartUTC(new Date('2026-04-22T12:00:00.000Z')).toISOString()).toBe(
      '2026-04-19T00:00:00.000Z',
    );
    expect(normalizeToWeekStartUTC(new Date('2026-04-18T23:59:59.999Z')).toISOString()).toBe(
      '2026-04-12T00:00:00.000Z',
    );
  });

  it('grava PortfolioSnapshot com totalUsd, totalBrl e breakdown no schema esperado', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');

    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-04-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '2',
    });

    const useCase = buildUseCaseWithMockedPrices({
      ethereum: { priceUsd: '3000', priceBrl: '15000' },
    });
    const result = await useCase.execute({
      referenceDate: new Date('2026-04-19T12:00:00.000Z'),
      useHistoricalPrice: false,
    });

    expect(result.weekStart.toISOString()).toBe('2026-04-19T00:00:00.000Z');
    expect(result.totalUsd).toBe('6000.000000000000000000');
    expect(result.totalBrl).toBe('30000.000000000000000000');

    const persisted = await prisma.portfolioSnapshot.findUnique({
      where: { weekStart: new Date('2026-04-19T00:00:00.000Z') },
    });
    expect(persisted).not.toBeNull();
    expect(persisted!.totalUsd).toBe('6000.000000000000000000');

    const breakdown = JSON.parse(persisted!.breakdown) as unknown;
    expect(Array.isArray(breakdown)).toBe(true);
    expect(breakdown).toEqual([
      {
        assetId: eth.id,
        symbol: 'ETH',
        amount: '2.000000000000000000',
        valueUsd: '6000.000000000000000000',
        valueBrl: '30000.000000000000000000',
      },
    ]);
  });

  it('e idempotente por upsert no indice unico de weekStart', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-04-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1',
    });

    const useCase = buildUseCaseWithMockedPrices({
      ethereum: { priceUsd: '100', priceBrl: '500' },
    });
    const reference = new Date('2026-04-19T00:00:00.000Z');

    const first = await useCase.execute({ referenceDate: reference, useHistoricalPrice: false });
    expect(first.created).toBe(true);

    const second = await useCase.execute({ referenceDate: reference, useHistoricalPrice: false });
    expect(second.created).toBe(false);

    const count = await prisma.portfolioSnapshot.count({ where: { weekStart: reference } });
    expect(count).toBe(1);
  });

  it('backfill usa PriceSnapshot historico (anterior ou igual a weekStart) e retorna null se nao houver', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    const usdc = await ensureAsset('USDC', 'ETH');

    // Compra 2 ETH antes do weekStart
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '2',
    });
    // Compra 1000 USDC (sem PriceSnapshot)
    await seedTx({
      wallet,
      asset: usdc,
      txHash: '0x2',
      timestamp: '2026-03-15T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1000',
    });

    // ETH: dois snapshots; o mais recente anterior a semana e de 2026-04-10
    await prisma.priceSnapshot.create({
      data: {
        assetId: eth.id,
        date: new Date('2026-04-10T00:00:00.000Z'),
        priceUsd: '2500',
        priceBrl: '12500',
        source: 'test',
      },
    });
    // Um snapshot ate mais recente, mas *depois* da weekStart — nao deve ser usado
    await prisma.priceSnapshot.create({
      data: {
        assetId: eth.id,
        date: new Date('2026-04-15T00:00:00.000Z'),
        priceUsd: '9999',
        priceBrl: '99999',
        source: 'test',
      },
    });

    const useCase = buildUseCaseWithMockedPrices({});
    const result = await useCase.execute({
      // weekStart = 2026-04-12 (domingo anterior a 2026-04-14)
      referenceDate: new Date('2026-04-14T00:00:00.000Z'),
      useHistoricalPrice: true,
    });

    expect(result.weekStart.toISOString()).toBe('2026-04-12T00:00:00.000Z');
    expect(result.breakdown).toHaveLength(2);

    const byAsset = Object.fromEntries(result.breakdown.map((b) => [b.symbol, b]));
    expect(byAsset.ETH).toMatchObject({
      amount: '2.000000000000000000',
      valueUsd: '5000.000000000000000000', // 2 * 2500
      valueBrl: '25000.000000000000000000',
    });
    expect(byAsset.USDC).toMatchObject({
      amount: '1000.000000000000000000',
      valueUsd: null,
      valueBrl: null,
    });
    // totalUsd soma apenas assets com preco
    expect(result.totalUsd).toBe('5000.000000000000000000');
  });

  it('considera apenas transacoes ate weekStart (inclusive) e ignora INTERNAL/FEE', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');

    // Antes do weekStart — conta
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-04-05T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '3',
    });
    // INTERNAL — ignora
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x2',
      timestamp: '2026-04-06T00:00:00.000Z',
      type: 'INTERNAL',
      direction: 'INTERNAL',
      amount: '100',
    });
    // FEE — ignora
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x3',
      timestamp: '2026-04-07T00:00:00.000Z',
      type: 'FEE',
      direction: 'OUT',
      amount: '0.01',
    });
    // Depois do weekStart — ignora
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x4',
      timestamp: '2026-04-20T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '99',
    });

    const useCase = buildUseCaseWithMockedPrices({
      ethereum: { priceUsd: '10', priceBrl: '50' },
    });
    const result = await useCase.execute({
      referenceDate: new Date('2026-04-12T00:00:00.000Z'),
      useHistoricalPrice: false,
    });

    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]).toMatchObject({
      symbol: 'ETH',
      amount: '3.000000000000000000',
      valueUsd: '30.000000000000000000',
    });
  });

  it('exclui assets com saldo zero ou negativo do breakdown', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-04-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1',
    });
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x2',
      timestamp: '2026-04-02T00:00:00.000Z',
      type: 'TRANSFER_OUT',
      direction: 'OUT',
      amount: '1',
    });

    const useCase = buildUseCaseWithMockedPrices({
      ethereum: { priceUsd: '1', priceBrl: '1' },
    });
    const result = await useCase.execute({
      referenceDate: new Date('2026-04-12T00:00:00.000Z'),
      useHistoricalPrice: false,
    });

    expect(result.breakdown).toEqual([]);
    expect(result.totalUsd).toBe('0.000000000000000000');
    expect(result.totalBrl).toBe('0.000000000000000000');
  });

  it('breakdown persiste como JSON valido com o schema [{ assetId, amount, valueUsd, valueBrl }]', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-04-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1',
    });

    const useCase = buildUseCaseWithMockedPrices({
      ethereum: { priceUsd: '100', priceBrl: '500' },
    });
    await useCase.execute({
      referenceDate: new Date('2026-04-19T00:00:00.000Z'),
      useHistoricalPrice: false,
    });

    const row = await prisma.portfolioSnapshot.findUnique({
      where: { weekStart: new Date('2026-04-19T00:00:00.000Z') },
    });
    expect(row).not.toBeNull();
    const parsed = JSON.parse(row!.breakdown) as Array<Record<string, unknown>>;
    expect(Array.isArray(parsed)).toBe(true);
    for (const entry of parsed) {
      expect(entry).toHaveProperty('assetId');
      expect(entry).toHaveProperty('amount');
      expect(entry).toHaveProperty('valueUsd');
      expect(entry).toHaveProperty('valueBrl');
      expect(typeof entry.assetId).toBe('string');
      expect(typeof entry.amount).toBe('string');
    }
  });
});
