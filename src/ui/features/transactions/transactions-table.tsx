'use client';

import * as React from 'react';
import type { SortingState } from '@tanstack/react-table';
import { DataTable } from '@/ui/components/data-table';
import { EmptyState } from '@/ui/components/empty-state';
import { ErrorState } from '@/ui/components/error-state';
import { Skeleton } from '@/ui/components/skeleton';
import { t } from '@/lib/i18n';
import { buildTransactionColumns } from './columns';
import { TransactionsFiltersForm } from './transactions-filters';
import {
  useTransactions,
  type TransactionsFilters,
  type TransactionSort,
} from './use-transactions';

const INITIAL_FILTERS: TransactionsFilters = {
  page: 1,
  pageSize: 25,
  sort: 'timestamp:desc',
};

function sortingStateFromSort(sort: TransactionSort): SortingState {
  return [{ id: 'timestamp', desc: sort === 'timestamp:desc' }];
}

function sortFromSortingState(sorting: SortingState): TransactionSort {
  const first = sorting[0];
  if (!first || first.id !== 'timestamp') return 'timestamp:desc';
  return first.desc ? 'timestamp:desc' : 'timestamp:asc';
}

export function TransactionsTable() {
  const [filters, setFilters] = React.useState<TransactionsFilters>(INITIAL_FILTERS);
  const columns = React.useMemo(() => buildTransactionColumns(), []);
  const query = useTransactions(filters);

  const handlePageChange = (nextPage: number) =>
    setFilters((prev) => ({ ...prev, page: nextPage }));

  const handleSortChange = (nextSorting: SortingState) =>
    setFilters((prev) => ({ ...prev, page: 1, sort: sortFromSortingState(nextSorting) }));

  let body: React.ReactNode;

  if (query.isPending) {
    body = (
      <div
        role="status"
        aria-label={t('transactions.loading.aria')}
        className="flex flex-col gap-3"
        data-slot="transactions-loading"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  } else if (query.isError) {
    body = (
      <ErrorState
        title={t('transactions.error.title')}
        description={t('transactions.error.body')}
        retryLabel={t('transactions.error.retry')}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  } else if (query.data.data.length === 0) {
    body = (
      <EmptyState
        title={t('transactions.empty.title')}
        description={t('transactions.empty.body')}
      />
    );
  } else {
    body = (
      <DataTable
        columns={columns}
        data={query.data.data}
        meta={query.data.meta}
        sorting={sortingStateFromSort(filters.sort)}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        labels={{
          previousPage: t('transactions.pagination.previous'),
          nextPage: t('transactions.pagination.next'),
          empty: t('transactions.empty.title'),
          pageOf: ({ page, totalPages, total }) =>
            t('transactions.pagination.pageOf')
              .replace('{page}', String(page))
              .replace('{totalPages}', String(totalPages))
              .replace('{total}', String(total)),
        }}
      />
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('transactions.page.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('transactions.page.description')}</p>
      </header>
      <TransactionsFiltersForm value={filters} onChange={setFilters} />
      {body}
    </section>
  );
}
