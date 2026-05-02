'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { t } from '@/lib/i18n';
import { formatCurrency, type CurrencyCode } from '@/lib/format-currency';
import { useCurrency } from '@/ui/hooks/use-currency';
import { CHART_COLORS, ChartContainer } from '@/ui/components/chart-container';
import { usePortfolioHistory, type PortfolioHistoryPoint } from './use-portfolio-history';

interface ChartPoint {
  weekStart: string;
  label: string;
  value: number;
}

const AXIS_TICK_OPTS = { maximumFractionDigits: 0, minimumFractionDigits: 0 } as const;

function formatWeekLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
}

export function toChartPoints(
  history: PortfolioHistoryPoint[],
  currency: CurrencyCode,
): ChartPoint[] {
  return history.map((point) => {
    const raw = currency === 'USD' ? point.totalUsd : point.totalBrl;
    const value = Number(raw);
    return {
      weekStart: point.weekStart,
      label: formatWeekLabel(point.weekStart),
      value: Number.isFinite(value) ? value : 0,
    };
  });
}

interface HistoryTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ChartPoint }>;
  currency: CurrencyCode;
}

function HistoryTooltip({ active, payload, currency }: HistoryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const value = typeof entry.value === 'number' ? entry.value : 0;
  const label = entry.payload?.label ?? '';
  return (
    <div
      data-slot="history-tooltip"
      className="rounded-md border border-border/60 bg-popover px-3 py-2 text-xs text-popover-foreground shadow"
    >
      <div className="font-medium">{label}</div>
      <div className="tabular-nums">{formatCurrency(value, currency)}</div>
    </div>
  );
}

export function LineChartHistory() {
  const { currency } = useCurrency();
  const query = usePortfolioHistory();

  const points = useMemo(() => {
    if (!query.data) return [];
    return toChartPoints(query.data, currency);
  }, [query.data, currency]);

  const isEmpty = query.isSuccess && points.length === 0;

  return (
    <ChartContainer
      title={t('portfolio.charts.history.title')}
      subtitle={t('portfolio.charts.history.subtitle')}
      isLoading={query.isPending}
      loadingAriaLabel={t('portfolio.charts.history.loading.aria')}
      isError={query.isError}
      errorState={{
        title: t('portfolio.charts.history.error.title'),
        description: t('portfolio.charts.history.error.body'),
        retryLabel: t('portfolio.charts.history.error.retry'),
        onRetry: () => {
          void query.refetch();
        },
      }}
      isEmpty={isEmpty}
      emptyState={{
        title: t('portfolio.charts.history.empty.title'),
        description: t('portfolio.charts.history.empty.body'),
      }}
      data-testid="line-chart-history"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => formatCurrency(value, currency, AXIS_TICK_OPTS)}
            width={90}
          />
          <Tooltip content={<HistoryTooltip currency={currency} />} />
          <Line
            type="monotone"
            dataKey="value"
            name={t('portfolio.charts.history.seriesLabel')}
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLORS[0] }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
