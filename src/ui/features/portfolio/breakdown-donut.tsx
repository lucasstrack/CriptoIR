'use client';

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { t } from '@/lib/i18n';
import { formatCurrency, type CurrencyCode } from '@/lib/format-currency';
import { useCurrency } from '@/ui/hooks/use-currency';
import { CHART_COLORS, ChartContainer } from '@/ui/components/chart-container';
import { useHoldings, type Holding } from './use-holdings';

interface DonutSlice {
  assetId: string;
  symbol: string;
  value: number;
}

function toSlices(holdings: Holding[], currency: CurrencyCode): DonutSlice[] {
  const slices: DonutSlice[] = [];
  for (const holding of holdings) {
    const raw = currency === 'USD' ? holding.valueUsd : holding.valueBrl;
    if (raw == null) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    slices.push({
      assetId: holding.asset.id,
      symbol: holding.asset.symbol,
      value,
    });
  }
  slices.sort((a, b) => b.value - a.value);
  return slices;
}

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DonutSlice & { percent?: number } }>;
  currency: CurrencyCode;
  total: number;
}

function DonutTooltip({ active, payload, currency, total }: DonutTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0].payload) return null;
  const slice = payload[0].payload;
  const percent = total > 0 ? (slice.value / total) * 100 : 0;
  return (
    <div
      data-slot="breakdown-tooltip"
      className="rounded-md border border-border/60 bg-popover px-3 py-2 text-xs text-popover-foreground shadow"
    >
      <div className="font-medium">{slice.symbol}</div>
      <div className="tabular-nums">{formatCurrency(slice.value, currency)}</div>
      <div className="tabular-nums text-muted-foreground">{percent.toFixed(1)}%</div>
    </div>
  );
}

export function BreakdownDonut() {
  const { currency } = useCurrency();
  const query = useHoldings();

  const { slices, total } = useMemo(() => {
    if (!query.data) return { slices: [] as DonutSlice[], total: 0 };
    const computed = toSlices(query.data, currency);
    const sum = computed.reduce((acc, s) => acc + s.value, 0);
    return { slices: computed, total: sum };
  }, [query.data, currency]);

  const isEmpty = query.isSuccess && slices.length === 0;

  return (
    <ChartContainer
      title={t('portfolio.charts.breakdown.title')}
      subtitle={t('portfolio.charts.breakdown.subtitle')}
      isLoading={query.isPending}
      loadingAriaLabel={t('portfolio.charts.breakdown.loading.aria')}
      isError={query.isError}
      errorState={{
        title: t('portfolio.charts.breakdown.error.title'),
        description: t('portfolio.charts.breakdown.error.body'),
        retryLabel: t('portfolio.charts.breakdown.error.retry'),
        onRetry: () => {
          void query.refetch();
        },
      }}
      isEmpty={isEmpty}
      emptyState={{
        title: t('portfolio.charts.breakdown.empty.title'),
        description: t('portfolio.charts.breakdown.empty.body'),
      }}
      data-testid="breakdown-donut"
    >
      <div className="flex h-full w-full flex-col gap-4 md:flex-row">
        <div className="h-full min-h-[200px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<DonutTooltip currency={currency} total={total} />} />
              <Pie
                data={slices}
                dataKey="value"
                nameKey="symbol"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={1}
                isAnimationActive={false}
              >
                {slices.map((slice, index) => (
                  <Cell
                    key={slice.assetId}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul
          data-testid="breakdown-legend"
          className="flex flex-col gap-1.5 overflow-y-auto text-xs md:w-48"
        >
          {slices.map((slice, index) => {
            const percent = total > 0 ? (slice.value / total) * 100 : 0;
            return (
              <li
                key={slice.assetId}
                className="flex items-center justify-between gap-2"
                data-testid={`breakdown-legend-${slice.symbol}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="font-medium text-foreground">{slice.symbol}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {percent.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartContainer>
  );
}
