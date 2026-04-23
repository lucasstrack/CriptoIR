import * as React from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Skeleton } from './skeleton';

/**
 * Paleta central de gráficos. Ordem importa — Recharts consome os índices
 * ciclicamente, então os primeiros valores aparecem nas fatias/linhas mais
 * destacadas. Valores em HSL batem com o tema dark definido em tailwind.
 */
export const CHART_COLORS: readonly string[] = [
  'hsl(217, 91%, 60%)', // blue
  'hsl(142, 71%, 45%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(280, 85%, 65%)', // purple
  'hsl(0, 84%, 60%)', // red
  'hsl(172, 66%, 50%)', // teal
  'hsl(24, 95%, 53%)', // orange
  'hsl(330, 81%, 60%)', // pink
];

export interface ChartContainerProps extends React.HTMLAttributes<HTMLElement> {
  /** Título do gráfico (já traduzido). */
  title: string;
  /** Subtítulo opcional abaixo do título. */
  subtitle?: string;
  /** Altura total do corpo do chart em pixels. Default: 320. */
  height?: number;
  /** Exibe estado de loading no lugar do corpo. */
  isLoading?: boolean;
  /** Exibe estado vazio no lugar do corpo. */
  isEmpty?: boolean;
  /** Props repassadas para o EmptyState (title + description já traduzidos). */
  emptyState?: { title: string; description?: string };
  /** Exibe estado de erro no lugar do corpo. */
  isError?: boolean;
  /** Props repassadas para o ErrorState (title já traduzido). */
  errorState?: {
    title: string;
    description?: string;
    onRetry?: () => void;
    retryLabel?: string;
  };
  /** Aria-label para o bloco de loading (já traduzido). */
  loadingAriaLabel?: string;
  children?: React.ReactNode;
}

/**
 * Wrapper reutilizável para gráficos. Centraliza:
 * - Header (título + subtítulo).
 * - Altura fixa do corpo.
 * - Estados loading / empty / error via componentes compartilhados.
 *
 * Não depende do Recharts — quem consome injeta o gráfico em `children`.
 */
export function ChartContainer({
  title,
  subtitle,
  height = 320,
  isLoading = false,
  isEmpty = false,
  emptyState,
  isError = false,
  errorState,
  loadingAriaLabel,
  children,
  className,
  ...props
}: ChartContainerProps) {
  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <div
        role="status"
        aria-label={loadingAriaLabel}
        className="flex h-full w-full items-center justify-center"
        data-slot="chart-loading"
      >
        <Skeleton className="h-full w-full" />
      </div>
    );
  } else if (isError && errorState) {
    body = (
      <ErrorState
        title={errorState.title}
        description={errorState.description}
        onRetry={errorState.onRetry}
        retryLabel={errorState.retryLabel}
      />
    );
  } else if (isEmpty && emptyState) {
    body = <EmptyState title={emptyState.title} description={emptyState.description} />;
  } else {
    body = children;
  }

  return (
    <section
      data-slot="chart-container"
      className={cn('flex flex-col gap-3 rounded-2xl border bg-card p-4', className)}
      {...props}
    >
      <header className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </header>
      <div data-slot="chart-body" style={{ height }} className="w-full">
        {body}
      </div>
    </section>
  );
}
