'use client';

import { useMemo } from 'react';
import { useCurrency } from '@/ui/hooks/use-currency';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Holding } from './use-holdings';

export interface HoldingsTableProps {
  holdings: Holding[];
  className?: string;
}

const DASH = '—';

function toValue(holding: Holding, currency: 'USD' | 'BRL'): number {
  const raw = currency === 'USD' ? holding.valueUsd : holding.valueBrl;
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function HoldingsTable({ holdings, className }: HoldingsTableProps) {
  const { currency } = useCurrency();

  const rows = useMemo(() => {
    const copy = [...holdings];
    copy.sort((a, b) => toValue(b, currency) - toValue(a, currency));
    return copy;
  }, [holdings, currency]);

  const priceKey = currency === 'USD' ? 'priceUsd' : 'priceBrl';
  const avgKey = currency === 'USD' ? 'averagePriceUsd' : 'averagePriceBrl';
  const valueKey = currency === 'USD' ? 'valueUsd' : 'valueBrl';

  return (
    <div
      data-slot="holdings-table"
      className={cn('w-full overflow-x-auto rounded-2xl border bg-card', className)}
    >
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {t('portfolio.table.asset')}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {t('portfolio.table.amount')}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {t('portfolio.table.averagePrice')}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {t('portfolio.table.currentPrice')}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {t('portfolio.table.value')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((holding) => {
            const rawPrice = holding[priceKey];
            const rawAvg = holding[avgKey];
            const rawValue = holding[valueKey];

            return (
              <tr
                key={holding.asset.id}
                data-slot="holdings-row"
                className="border-t border-border/40 text-foreground"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{holding.asset.symbol}</span>
                    <span
                      className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                      data-testid={`network-badge-${holding.asset.id}`}
                    >
                      {holding.asset.network}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{holding.amount}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {rawAvg != null ? formatCurrency(rawAvg, currency) : DASH}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {rawPrice != null ? formatCurrency(rawPrice, currency) : DASH}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {rawValue != null ? formatCurrency(rawValue, currency) : DASH}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
