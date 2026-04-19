import { prisma } from '@/infra/db/prisma';
import {
  SCALE_FACTOR,
  parseDecimal,
  formatDecimal,
} from '@/core/services/average-cost';
import { PriceService } from '@/core/services/price-service';
import { CoinGeckoClient } from '@/infra/prices/coingecko-client';
import {
  COINGECKO_ASSET_MAP,
  type SupportedPricedAsset,
} from '@/infra/prices/coingecko-asset-map';

export type PortfolioSnapshotBreakdownEntry = {
  assetId: string;
  symbol: string;
  amount: string;
  valueUsd: string | null;
  valueBrl: string | null;
};

export type RecordPortfolioSnapshotResult = {
  weekStart: Date;
  totalUsd: string;
  totalBrl: string;
  breakdown: PortfolioSnapshotBreakdownEntry[];
  created: boolean;
};

export type PriceResolver = (input: {
  assetId: string;
  symbol: string;
  at: Date;
}) => Promise<{ priceUsd: string; priceBrl: string } | null>;

export type RecordPortfolioSnapshotOptions = {
  /**
   * Data de referencia (ex.: agora). Sera normalizada para o inicio da semana
   * (domingo 00:00 UTC). Default: now().
   */
  referenceDate?: Date;
  /**
   * Se true (default), usa PriceSnapshot historico (proximo anterior ou igual
   * a weekStart) para avaliar cada asset. Se nao houver snapshot disponivel,
   * valueUsd/valueBrl ficam null. Usado em backfill e garante determinismo.
   *
   * Se false, usa o preco atual via PriceService (CoinGecko). Usado pelo cron
   * semanal padrao, que grava o snapshot "de agora".
   */
  useHistoricalPrice?: boolean;
};

const ZERO = BigInt(0);

/**
 * Normaliza uma data para o inicio da semana (domingo 00:00:00.000 UTC).
 * Implementa a convencao usada pelo cron `0 0 * * 0`.
 */
export function normalizeToWeekStartUTC(date: Date): Date {
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - day);
  return result;
}

/**
 * Use-case idempotente que calcula holdings no momento `weekStart`, resolve
 * precos (historicos ou atuais) e faz upsert em `PortfolioSnapshot`. A
 * idempotencia e garantida pelo indice unico `weekStart` no schema.
 */
export class RecordPortfolioSnapshotUseCase {
  constructor(
    private readonly priceService: PriceService = new PriceService(
      new CoinGeckoClient(),
    ),
  ) {}

  async execute(
    options: RecordPortfolioSnapshotOptions = {},
  ): Promise<RecordPortfolioSnapshotResult> {
    const reference = options.referenceDate ?? new Date();
    const weekStart = normalizeToWeekStartUTC(reference);
    const useHistoricalPrice = options.useHistoricalPrice ?? true;

    const resolvePrice: PriceResolver = useHistoricalPrice
      ? (input) => this.resolveHistoricalPrice(input.assetId, input.at)
      : (input) => this.resolveCurrentPrice(input.symbol);

    const breakdown = await this.computeBreakdown({ weekStart, resolvePrice });

    let totalUsd = ZERO;
    let totalBrl = ZERO;
    for (const entry of breakdown) {
      if (entry.valueUsd !== null) {
        totalUsd += parseDecimal(entry.valueUsd);
      }
      if (entry.valueBrl !== null) {
        totalBrl += parseDecimal(entry.valueBrl);
      }
    }

    const totalUsdStr = formatDecimal(totalUsd);
    const totalBrlStr = formatDecimal(totalBrl);
    const breakdownJson = JSON.stringify(breakdown);

    const existing = await prisma.portfolioSnapshot.findUnique({
      where: { weekStart },
      select: { id: true },
    });

    await prisma.portfolioSnapshot.upsert({
      where: { weekStart },
      create: {
        weekStart,
        totalUsd: totalUsdStr,
        totalBrl: totalBrlStr,
        breakdown: breakdownJson,
      },
      update: {
        totalUsd: totalUsdStr,
        totalBrl: totalBrlStr,
        breakdown: breakdownJson,
      },
    });

    return {
      weekStart,
      totalUsd: totalUsdStr,
      totalBrl: totalBrlStr,
      breakdown,
      created: existing === null,
    };
  }

  /**
   * Calcula holdings (netAmount por asset) considerando somente transacoes
   * CONFIRMED ate `weekStart` (inclusive). Segue as mesmas regras de
   * ComputeHoldingsUseCase: ignora INTERNAL, SELF e FEE, nao compensa entradas
   * pos-data.
   */
  private async computeBreakdown(params: {
    weekStart: Date;
    resolvePrice: PriceResolver;
  }): Promise<PortfolioSnapshotBreakdownEntry[]> {
    const { weekStart, resolvePrice } = params;

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        timestamp: { lte: weekStart },
      },
      include: { asset: true },
      orderBy: { timestamp: 'asc' },
    });

    if (transactions.length === 0) {
      return [];
    }

    const byAsset = new Map<
      string,
      { netAmount: bigint; symbol: string }
    >();

    for (const tx of transactions) {
      if (tx.direction === 'INTERNAL' || tx.direction === 'SELF' || tx.type === 'FEE') {
        continue;
      }
      const current = byAsset.get(tx.assetId) ?? {
        netAmount: ZERO,
        symbol: tx.asset.symbol,
      };
      const amount = parseDecimal(tx.amount);
      if (tx.direction === 'IN') {
        current.netAmount += amount;
      } else if (tx.direction === 'OUT') {
        current.netAmount -= amount;
      }
      byAsset.set(tx.assetId, current);
    }

    const entries: PortfolioSnapshotBreakdownEntry[] = [];
    for (const [assetId, computation] of byAsset.entries()) {
      if (computation.netAmount <= ZERO) {
        continue;
      }
      const amountStr = formatDecimal(computation.netAmount);
      const price = await resolvePrice({
        assetId,
        symbol: computation.symbol,
        at: weekStart,
      });
      const valueUsd =
        price?.priceUsd != null
          ? multiplyDecimals(computation.netAmount, price.priceUsd)
          : null;
      const valueBrl =
        price?.priceBrl != null
          ? multiplyDecimals(computation.netAmount, price.priceBrl)
          : null;

      entries.push({
        assetId,
        symbol: computation.symbol,
        amount: amountStr,
        valueUsd,
        valueBrl,
      });
    }

    entries.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return entries;
  }

  private async resolveHistoricalPrice(
    assetId: string,
    at: Date,
  ): Promise<{ priceUsd: string; priceBrl: string } | null> {
    const snapshot = await prisma.priceSnapshot.findFirst({
      where: { assetId, date: { lte: at } },
      orderBy: { date: 'desc' },
      select: { priceUsd: true, priceBrl: true },
    });
    if (!snapshot) {
      return null;
    }
    return { priceUsd: snapshot.priceUsd, priceBrl: snapshot.priceBrl };
  }

  private async resolveCurrentPrice(
    symbol: string,
  ): Promise<{ priceUsd: string; priceBrl: string } | null> {
    if (!(symbol in COINGECKO_ASSET_MAP)) {
      return null;
    }
    try {
      const price = await this.priceService.getCurrentPrice(
        symbol as SupportedPricedAsset,
      );
      return { priceUsd: price.priceUsd, priceBrl: price.priceBrl };
    } catch {
      return null;
    }
  }
}

function multiplyDecimals(amount: bigint, priceStr: string): string {
  const price = parseDecimal(priceStr);
  const product = (amount * price) / SCALE_FACTOR;
  return formatDecimal(product);
}
