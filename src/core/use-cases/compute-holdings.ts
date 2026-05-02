import type { Network } from '@prisma/client';
import { prisma } from '@/infra/db/prisma';
import {
  AverageCostService,
  type AcquisitionEntry,
  SCALE_FACTOR,
  parseDecimal,
  formatDecimal,
} from '@/core/services/average-cost';
import { PriceService, type PriceableAsset } from '@/core/services/price-service';
import { CoinGeckoClient } from '@/infra/prices/coingecko-client';

export type HoldingDTO = {
  asset: {
    id: string;
    symbol: string;
    name: string;
    network: Network;
    contractAddress: string | null;
    decimals: number;
    coingeckoId: string | null;
  };
  amount: string;
  averagePriceUsd: string | null;
  averagePriceBrl: string | null;
  priceUsd: string | null;
  priceBrl: string | null;
  valueUsd: string | null;
  valueBrl: string | null;
};

type HoldingComputation = {
  netAmount: bigint;
  acquisitions: AcquisitionEntry[];
  asset: HoldingDTO['asset'];
};

const ZERO = BigInt(0);
const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d+)?$/;

// Cache em memoria (por processo) para precos atuais. Chave: ativo especifico
// (network+contract quando houver, senao native/id). TTL configuravel via env;
// default 60s. So cacheia sucesso — erro nao contamina proxima chamada.
const DEFAULT_PRICE_CACHE_TTL_MS = 60_000;

type CachedPrice = {
  priceUsd: string;
  priceBrl: string;
  expiresAt: number;
};

const priceCache = new Map<string, CachedPrice>();
let nowProvider: () => number = () => Date.now();

function getPriceCacheTtlMs(): number {
  const raw = process.env.HOLDINGS_PRICE_CACHE_TTL_MS;
  if (!raw) return DEFAULT_PRICE_CACHE_TTL_MS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PRICE_CACHE_TTL_MS;
  return parsed;
}

export function __resetPriceCacheForTests() {
  priceCache.clear();
}

export function __setNowProviderForTests(provider: (() => number) | null) {
  nowProvider = provider ?? (() => Date.now());
}

export class ComputeHoldingsUseCase {
  constructor(
    private readonly priceService: PriceService = new PriceService(new CoinGeckoClient()),
    private readonly averageCostService: AverageCostService = new AverageCostService(),
  ) {}

  async execute(): Promise<HoldingDTO[]> {
    const transactions = await prisma.transaction.findMany({
      where: { status: 'CONFIRMED' },
      include: { asset: true },
      orderBy: { timestamp: 'asc' },
    });

    if (transactions.length === 0) {
      return [];
    }

    const byAsset = new Map<string, HoldingComputation>();

    const priceSnapshots = await prisma.priceSnapshot.findMany({
      where: { assetId: { in: [...new Set(transactions.map((tx) => tx.assetId))] } },
      orderBy: { date: 'asc' },
    });

    const snapshotIndex = new Map<string, { date: Date; priceUsd: string; priceBrl: string }[]>();
    for (const snapshot of priceSnapshots) {
      const existing = snapshotIndex.get(snapshot.assetId) ?? [];
      existing.push({
        date: snapshot.date,
        priceUsd: snapshot.priceUsd,
        priceBrl: snapshot.priceBrl,
      });
      snapshotIndex.set(snapshot.assetId, existing);
    }

    for (const tx of transactions) {
      // Desconsidera movimentacoes internas e taxas no calculo de quantidade.
      if (tx.direction === 'INTERNAL' || tx.direction === 'SELF' || tx.type === 'FEE') {
        continue;
      }

      // Defesa contra dados persistidos em formato invalido (ex.: provider que
      // gravou String(null) === "null" antes do fix em alchemy-evm-provider).
      // Uma tx corrompida nao pode derrubar o calculo de todas as outras.
      if (typeof tx.amount !== 'string' || !DECIMAL_STRING_PATTERN.test(tx.amount.trim())) {
        console.warn(
          `[compute-holdings] amount invalido em tx ${tx.id} (${tx.txHash}): "${tx.amount}" — pulando`,
        );
        continue;
      }

      const current =
        byAsset.get(tx.assetId) ?? {
          netAmount: ZERO,
          acquisitions: [],
          asset: {
            id: tx.asset.id,
            symbol: tx.asset.symbol,
            name: tx.asset.name,
            network: tx.asset.network,
            contractAddress: tx.asset.contractAddress,
            decimals: tx.asset.decimals,
            coingeckoId: tx.asset.coingeckoId,
          },
        };

      const amount = parseDecimal(tx.amount);
      if (tx.direction === 'IN') {
        current.netAmount += amount;
        // Aquisicoes: TRANSFER_IN ou lado IN de SWAP. Nao reseta apos venda (contabil).
        if (tx.type === 'TRANSFER_IN' || tx.type === 'SWAP') {
          const snapshotPrice = resolveHistoricalPrice(snapshotIndex.get(tx.assetId), tx.timestamp);
          current.acquisitions.push({
            amount: tx.amount,
            priceUsd: snapshotPrice?.priceUsd ?? null,
            priceBrl: snapshotPrice?.priceBrl ?? null,
          });
        }
      } else if (tx.direction === 'OUT') {
        current.netAmount -= amount;
      }

      byAsset.set(tx.assetId, current);
    }

    const holdings: HoldingDTO[] = [];
    for (const computation of byAsset.values()) {
      if (computation.netAmount <= ZERO) {
        continue;
      }
      const { averagePriceUsd, averagePriceBrl } = this.averageCostService.compute(
        computation.acquisitions,
      );
      const price = await safeFetchPrice(this.priceService, computation.asset);

      const amountStr = formatDecimal(computation.netAmount);
      const valueUsd =
        price?.priceUsd != null ? multiplyDecimals(computation.netAmount, price.priceUsd) : null;
      const valueBrl =
        price?.priceBrl != null ? multiplyDecimals(computation.netAmount, price.priceBrl) : null;

      holdings.push({
        asset: computation.asset,
        amount: amountStr,
        averagePriceUsd,
        averagePriceBrl,
        priceUsd: price?.priceUsd ?? null,
        priceBrl: price?.priceBrl ?? null,
        valueUsd,
        valueBrl,
      });
    }

    holdings.sort((a, b) => a.asset.symbol.localeCompare(b.asset.symbol));
    return holdings;
  }
}

function resolveHistoricalPrice(
  snapshots: { date: Date; priceUsd: string; priceBrl: string }[] | undefined,
  timestamp: Date,
) {
  if (!snapshots || snapshots.length === 0) {
    return null;
  }
  // Pega o snapshot mais recente anterior ou igual a data da tx.
  let candidate: { date: Date; priceUsd: string; priceBrl: string } | null = null;
  for (const snapshot of snapshots) {
    if (snapshot.date.getTime() <= timestamp.getTime()) {
      candidate = snapshot;
    } else {
      break;
    }
  }
  if (candidate) {
    return candidate;
  }
  // Fallback: primeiro snapshot disponivel (melhor que nada para acquisitions antigas).
  return snapshots[0];
}

async function safeFetchPrice(
  priceService: PriceService,
  asset: PriceableAsset,
): Promise<{ priceUsd: string; priceBrl: string } | null> {
  const cacheKey = priceCacheKey(asset);
  const now = nowProvider();
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { priceUsd: cached.priceUsd, priceBrl: cached.priceBrl };
  }
  try {
    const price = await priceService.getPriceForAsset(asset);
    const ttl = getPriceCacheTtlMs();
    priceCache.set(cacheKey, {
      priceUsd: price.priceUsd,
      priceBrl: price.priceBrl,
      expiresAt: now + ttl,
    });
    return { priceUsd: price.priceUsd, priceBrl: price.priceBrl };
  } catch {
    return null;
  }
}

function priceCacheKey(asset: PriceableAsset): string {
  if (asset.contractAddress) {
    return `${asset.network}:${asset.contractAddress.toLowerCase()}`;
  }
  return `${asset.network}:native:${asset.coingeckoId ?? asset.symbol}`;
}

function multiplyDecimals(amount: bigint, priceStr: string): string {
  const price = parseDecimal(priceStr);
  const product = (amount * price) / SCALE_FACTOR;
  return formatDecimal(product);
}
