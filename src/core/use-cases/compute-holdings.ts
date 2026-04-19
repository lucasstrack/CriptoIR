import type { Network } from '@prisma/client';
import { prisma } from '@/infra/db/prisma';
import { AverageCostService, type AcquisitionEntry } from '@/core/services/average-cost';
import { PriceService } from '@/core/services/price-service';
import { CoinGeckoClient } from '@/infra/prices/coingecko-client';
import {
  COINGECKO_ASSET_MAP,
  type SupportedPricedAsset,
} from '@/infra/prices/coingecko-asset-map';

export type HoldingDTO = {
  asset: {
    id: string;
    symbol: string;
    name: string;
    network: Network;
    contractAddress: string | null;
    decimals: number;
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

const SCALE = 18;
const ZERO = BigInt(0);
const TEN = BigInt(10);
const SCALE_FACTOR = TEN ** BigInt(SCALE);

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
      const price = await safeFetchPrice(this.priceService, computation.asset.symbol);

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
  symbol: string,
): Promise<{ priceUsd: string; priceBrl: string } | null> {
  if (!(symbol in COINGECKO_ASSET_MAP)) {
    return null;
  }
  try {
    const price = await priceService.getCurrentPrice(symbol as SupportedPricedAsset);
    return { priceUsd: price.priceUsd, priceBrl: price.priceBrl };
  } catch {
    return null;
  }
}

function parseDecimal(value: string): bigint {
  const trimmed = value.trim();
  if (trimmed === '') return ZERO;
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [intPart = '0', fracPartRaw = ''] = unsigned.split('.');
  const fracPart = (fracPartRaw + '0'.repeat(SCALE)).slice(0, SCALE);
  const combined = `${intPart}${fracPart}`.replace(/^0+/, '') || '0';
  const result = BigInt(combined);
  return negative ? -result : result;
}

function multiplyDecimals(amount: bigint, priceStr: string): string {
  const price = parseDecimal(priceStr);
  const product = (amount * price) / SCALE_FACTOR;
  return formatDecimal(product);
}

function formatDecimal(value: bigint): string {
  const negative = value < ZERO;
  const abs = negative ? -value : value;
  const str = abs.toString().padStart(SCALE + 1, '0');
  const intPart = str.slice(0, str.length - SCALE);
  const fracPart = str.slice(str.length - SCALE);
  const formatted = `${intPart}.${fracPart}`;
  return negative ? `-${formatted}` : formatted;
}
