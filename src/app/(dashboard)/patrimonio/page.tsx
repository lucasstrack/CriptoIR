'use client';

import { EmptyState } from '@/ui/components/empty-state';
import { ErrorState } from '@/ui/components/error-state';
import { Skeleton } from '@/ui/components/skeleton';
import { t } from '@/lib/i18n';
import { HoldingsTable } from '@/ui/features/portfolio/holdings-table';
import { TotalSummary } from '@/ui/features/portfolio/total-summary';
import { useHoldings } from '@/ui/features/portfolio/use-holdings';

export default function PatrimonioPage() {
  const holdingsQuery = useHoldings();

  let body: React.ReactNode;

  if (holdingsQuery.isPending) {
    body = (
      <div
        role="status"
        aria-label={t('portfolio.loading.aria')}
        className="flex flex-col gap-3"
        data-slot="portfolio-loading"
      >
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  } else if (holdingsQuery.isError) {
    body = (
      <ErrorState
        title={t('portfolio.error.title')}
        description={t('portfolio.error.body')}
        retryLabel={t('portfolio.error.retry')}
        onRetry={() => {
          void holdingsQuery.refetch();
        }}
      />
    );
  } else if (holdingsQuery.data.length === 0) {
    body = (
      <EmptyState
        title={t('portfolio.empty.title')}
        description={t('portfolio.empty.body')}
      />
    );
  } else {
    body = (
      <>
        <TotalSummary holdings={holdingsQuery.data} />
        <HoldingsTable holdings={holdingsQuery.data} />
        {/* Slot reservado para graficos — TASK-340 injeta aqui */}
        <section id="charts" aria-hidden="true" />
      </>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('portfolio.page.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('portfolio.page.description')}</p>
      </header>
      {body}
    </section>
  );
}
