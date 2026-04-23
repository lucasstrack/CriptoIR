'use client';

import { useMemo } from 'react';
import type { Network } from '@prisma/client';
import { useCurrency } from '@/ui/hooks/use-currency';
import { formatCurrency, type CurrencyCode } from '@/lib/format-currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/card';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Holding } from './use-holdings';

export interface TotalSummaryProps {
  holdings: Holding[];
  className?: string;
}

interface Aggregate {
  total: number;
  byNetwork: Map<Network, number>;
}

function aggregate(holdings: Holding[], currency: CurrencyCode): Aggregate {
  const byNetwork = new Map<Network, number>();
  let total = 0;

  for (const holding of holdings) {
    const raw = currency === 'USD' ? holding.valueUsd : holding.valueBrl;
    if (raw == null) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;

    total += value;
    const network = holding.asset.network;
    if (!network) continue;
    byNetwork.set(network, (byNetwork.get(network) ?? 0) + value);
  }

  return { total, byNetwork };
}

export function TotalSummary({ holdings, className }: TotalSummaryProps) {
  const { currency } = useCurrency();
  const { total, byNetwork } = useMemo(() => aggregate(holdings, currency), [holdings, currency]);

  const networks = useMemo(
    () => [...byNetwork.entries()].sort(([, a], [, b]) => b - a),
    [byNetwork],
  );

  return (
    <section className={cn('flex flex-col gap-4', className)} aria-labelledby="portfolio-total">
      <Card>
        <CardHeader>
          <CardDescription>{t('portfolio.total.label')}</CardDescription>
          <CardTitle
            id="portfolio-total"
            className="text-4xl"
            data-testid="portfolio-total-value"
          >
            {formatCurrency(total, currency)}
          </CardTitle>
        </CardHeader>
      </Card>

      {networks.length > 0 ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="portfolio-networks"
        >
          {networks.map(([network, value]) => (
            <Card key={network} data-testid={`portfolio-network-${network}`}>
              <CardContent className="flex flex-col gap-1 p-4 pt-4">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {network}
                </span>
                <span className="text-xl font-semibold tabular-nums">
                  {formatCurrency(value, currency)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
