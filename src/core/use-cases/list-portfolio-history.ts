import { prisma } from '@/infra/db/prisma';

export type PortfolioHistoryPoint = {
  weekStart: string;
  totalUsd: string;
  totalBrl: string;
  breakdown: Array<{
    assetId: string;
    symbol?: string;
    amount: string;
    valueUsd: string;
    valueBrl: string;
  }>;
};

type RawBreakdownEntry = {
  assetId?: unknown;
  symbol?: unknown;
  amount?: unknown;
  valueUsd?: unknown;
  valueBrl?: unknown;
};

export class ListPortfolioHistoryUseCase {
  async execute(): Promise<PortfolioHistoryPoint[]> {
    const snapshots = await prisma.portfolioSnapshot.findMany({
      orderBy: { weekStart: 'asc' },
    });

    return snapshots.map((snapshot) => ({
      weekStart: snapshot.weekStart.toISOString(),
      totalUsd: snapshot.totalUsd,
      totalBrl: snapshot.totalBrl,
      breakdown: parseBreakdown(snapshot.breakdown),
    }));
  }
}

function parseBreakdown(raw: string): PortfolioHistoryPoint['breakdown'] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((entry): entry is RawBreakdownEntry => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      assetId: typeof entry.assetId === 'string' ? entry.assetId : '',
      symbol: typeof entry.symbol === 'string' ? entry.symbol : undefined,
      amount: typeof entry.amount === 'string' ? entry.amount : '0',
      valueUsd: typeof entry.valueUsd === 'string' ? entry.valueUsd : '0',
      valueBrl: typeof entry.valueBrl === 'string' ? entry.valueBrl : '0',
    }));
}
