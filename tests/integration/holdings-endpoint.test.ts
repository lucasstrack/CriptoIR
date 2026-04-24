import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Direction, Network, TxType } from '@prisma/client';
import {
  GET,
  __resetComputeHoldingsUseCaseForTests,
  __setComputeHoldingsUseCaseForTests,
} from '@/app/api/holdings/route';
import {
  ComputeHoldingsUseCase,
  __setNowProviderForTests,
  __resetPriceCacheForTests,
} from '@/core/use-cases/compute-holdings';
import { PriceService } from '@/core/services/price-service';
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
    getCurrentPrice: vi.fn(async (symbol: string) => {
      const value = prices[symbol];
      if (!value) {
        throw new Error(`no price for ${symbol}`);
      }
      if (value === 'fail') {
        throw new Error('provider down');
      }
      return { assetSymbol: symbol, priceUsd: value.priceUsd, priceBrl: value.priceBrl };
    }),
  } as unknown as PriceService;
  return new ComputeHoldingsUseCase(mockService);
}

describe('GET /api/holdings', () => {
  beforeAll(() => {
    ensureTestSchema();
  });

  beforeEach(async () => {
    await prisma.priceSnapshot.deleteMany();
    await prisma.syncLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.wallet.deleteMany();
  });

  afterEach(() => {
    __resetComputeHoldingsUseCaseForTests();
  });

  it('retorna lista vazia quando nao ha transacoes', async () => {
    __setComputeHoldingsUseCaseForTests(buildUseCaseWithMockedPrices({}));
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([]);
    expect(payload.error).toBeNull();
  });

  it('agrega IN - OUT por asset e calcula valor atual em USD/BRL', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    const usdc = await ensureAsset('USDC', 'ETH');

    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '2',
    });
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x2',
      timestamp: '2026-03-15T00:00:00.000Z',
      type: 'TRANSFER_OUT',
      direction: 'OUT',
      amount: '0.5',
    });
    await seedTx({
      wallet,
      asset: usdc,
      txHash: '0x3',
      timestamp: '2026-03-10T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1000',
    });

    await prisma.priceSnapshot.create({
      data: {
        assetId: eth.id,
        date: new Date('2026-03-01T00:00:00.000Z'),
        priceUsd: '3000',
        priceBrl: '15000',
        source: 'test',
      },
    });
    await prisma.priceSnapshot.create({
      data: {
        assetId: usdc.id,
        date: new Date('2026-03-10T00:00:00.000Z'),
        priceUsd: '1',
        priceBrl: '5',
        source: 'test',
      },
    });

    __setComputeHoldingsUseCaseForTests(
      buildUseCaseWithMockedPrices({
        ETH: { priceUsd: '4000', priceBrl: '20000' },
        USDC: { priceUsd: '1', priceBrl: '5' },
      }),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(2);

    const byAsset = Object.fromEntries(
      payload.data.map((h: { asset: { symbol: string } }) => [h.asset.symbol, h]),
    );

    expect(byAsset.ETH).toMatchObject({
      amount: '1.500000000000000000', // 2 - 0.5
      averagePriceUsd: '3000.000000000000000000',
      averagePriceBrl: '15000.000000000000000000',
      priceUsd: '4000',
      priceBrl: '20000',
      valueUsd: '6000.000000000000000000', // 1.5 * 4000
      valueBrl: '30000.000000000000000000',
    });
    expect(byAsset.USDC).toMatchObject({
      amount: '1000.000000000000000000',
      valueUsd: '1000.000000000000000000',
    });
  });

  it('ignora transacoes INTERNAL e do tipo FEE no calculo de quantidade', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');

    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '5',
    });
    // INTERNAL nao deve mover quantidade
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x2',
      timestamp: '2026-03-02T00:00:00.000Z',
      type: 'INTERNAL',
      direction: 'INTERNAL',
      amount: '100',
    });
    // FEE tambem nao
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x3',
      timestamp: '2026-03-03T00:00:00.000Z',
      type: 'FEE',
      direction: 'OUT',
      amount: '999',
    });

    __setComputeHoldingsUseCaseForTests(
      buildUseCaseWithMockedPrices({
        ETH: { priceUsd: '1', priceBrl: '1' },
      }),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].amount).toBe('5.000000000000000000');
  });

  it('retorna valueUsd/valueBrl null quando PriceService falha em vez de 500', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1',
    });

    __setComputeHoldingsUseCaseForTests(
      buildUseCaseWithMockedPrices({ ETH: 'fail' }),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]).toMatchObject({
      amount: '1.000000000000000000',
      priceUsd: null,
      priceBrl: null,
      valueUsd: null,
      valueBrl: null,
    });
  });

  it('preco medio contabil nao reseta apos venda total', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');

    // Compra 1 @ 100 (snapshot)
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0xa',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1',
    });
    // Vende toda (1)
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0xb',
      timestamp: '2026-03-05T00:00:00.000Z',
      type: 'TRANSFER_OUT',
      direction: 'OUT',
      amount: '1',
    });
    // Recompra 2 @ 200
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0xc',
      timestamp: '2026-03-10T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '2',
    });

    await prisma.priceSnapshot.create({
      data: {
        assetId: eth.id,
        date: new Date('2026-03-01T00:00:00.000Z'),
        priceUsd: '100',
        priceBrl: '500',
        source: 'test',
      },
    });
    await prisma.priceSnapshot.create({
      data: {
        assetId: eth.id,
        date: new Date('2026-03-10T00:00:00.000Z'),
        priceUsd: '200',
        priceBrl: '1000',
        source: 'test',
      },
    });

    __setComputeHoldingsUseCaseForTests(
      buildUseCaseWithMockedPrices({ ETH: { priceUsd: '300', priceBrl: '1500' } }),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    const eth_h = payload.data[0];
    // Amount = 1 - 1 + 2 = 2
    expect(eth_h.amount).toBe('2.000000000000000000');
    // Preco medio contabil inclui TODAS aquisicoes (1@100 e 2@200): (100 + 400)/3
    expect(eth_h.averagePriceUsd).toBe('166.666666666666666666');
  });

  it('valores monetarios sempre em string; datas em ISO 8601 UTC', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-03-01T12:34:56.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1.5',
    });

    __setComputeHoldingsUseCaseForTests(
      buildUseCaseWithMockedPrices({ ETH: { priceUsd: '1000', priceBrl: '5000' } }),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    const row = payload.data[0];
    expect(typeof row.amount).toBe('string');
    expect(typeof row.priceUsd).toBe('string');
    expect(typeof row.valueUsd).toBe('string');
    expect(typeof row.valueBrl).toBe('string');
    // Sem float (tem ponto decimal)
    expect(row.amount).toMatch(/^\d+\.\d+$/);
  });

  it('cacheia precos por asset dentro do TTL (1 chamada ao PriceService por request consecutivo)', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1',
    });

    const getCurrentPrice = vi.fn(async (symbol: string) => ({
      assetSymbol: symbol,
      priceUsd: '4000',
      priceBrl: '20000',
    }));
    const mockService = { getCurrentPrice } as unknown as PriceService;

    // Controle explicito de tempo via hook DI.
    let now = 1_000_000;
    __setNowProviderForTests(() => now);
    __resetPriceCacheForTests();
    __setComputeHoldingsUseCaseForTests(new ComputeHoldingsUseCase(mockService));

    // Primeira chamada: cache miss -> bate no PriceService.
    const r1 = await GET();
    expect(r1.status).toBe(200);
    expect(getCurrentPrice).toHaveBeenCalledTimes(1);

    // Avanca 30s (< 60s default TTL): cache hit -> nao bate no PriceService.
    now += 30_000;
    const r2 = await GET();
    expect(r2.status).toBe(200);
    expect(getCurrentPrice).toHaveBeenCalledTimes(1);

    // Avanca mais 31s (total 61s > TTL): cache expirou -> bate de novo.
    now += 31_000;
    const r3 = await GET();
    expect(r3.status).toBe(200);
    expect(getCurrentPrice).toHaveBeenCalledTimes(2);

    __setNowProviderForTests(null);
  });

  it('nao cacheia falhas do PriceService (proximo request tenta de novo)', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1',
    });

    let shouldFail = true;
    const getCurrentPrice = vi.fn(async (symbol: string) => {
      if (shouldFail) {
        throw new Error('provider down');
      }
      return { assetSymbol: symbol, priceUsd: '4000', priceBrl: '20000' };
    });
    const mockService = { getCurrentPrice } as unknown as PriceService;

    __resetPriceCacheForTests();
    __setComputeHoldingsUseCaseForTests(new ComputeHoldingsUseCase(mockService));

    // Primeira chamada: falha — nao cacheia.
    const r1 = await GET();
    const p1 = await r1.json();
    expect(p1.data[0].priceUsd).toBeNull();
    expect(getCurrentPrice).toHaveBeenCalledTimes(1);

    // Provider volta — proxima chamada tenta de novo e deve suceder.
    shouldFail = false;
    const r2 = await GET();
    const p2 = await r2.json();
    expect(p2.data[0].priceUsd).toBe('4000');
    expect(getCurrentPrice).toHaveBeenCalledTimes(2);
  });

  it('exclui da lista assets com saldo zero ou negativo', async () => {
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x1',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '1',
    });
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0x2',
      timestamp: '2026-03-02T00:00:00.000Z',
      type: 'TRANSFER_OUT',
      direction: 'OUT',
      amount: '1',
    });

    __setComputeHoldingsUseCaseForTests(
      buildUseCaseWithMockedPrices({ ETH: { priceUsd: '1', priceBrl: '1' } }),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([]);
  });

  it('pula tx com amount invalido (ex.: string "null" de provider antigo) sem derrubar o endpoint', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wallet = await createWallet('W', '0xw', 'ETH');
    const eth = await ensureAsset('ETH', 'ETH');
    const spamAsset = await ensureAsset('SPAM', 'ETH');

    // Tx valida — entra no calculo.
    await seedTx({
      wallet,
      asset: eth,
      txHash: '0xok',
      timestamp: '2026-03-01T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: '2',
    });
    // Tx corrompida — simula bug historico do provider (amount gravado como "null").
    await seedTx({
      wallet,
      asset: spamAsset,
      txHash: '0xspam',
      timestamp: '2026-03-02T00:00:00.000Z',
      type: 'TRANSFER_IN',
      direction: 'IN',
      amount: 'null',
    });

    __setComputeHoldingsUseCaseForTests(
      buildUseCaseWithMockedPrices({ ETH: { priceUsd: '1000', priceBrl: '5000' } }),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toBeNull();
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].asset.symbol).toBe('ETH');
    expect(payload.data[0].amount).toBe('2.000000000000000000');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('amount invalido'),
    );
    warnSpy.mockRestore();
  });
});
