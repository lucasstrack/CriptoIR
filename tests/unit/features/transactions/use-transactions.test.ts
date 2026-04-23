import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import {
  buildTransactionsQuery,
  useTransactions,
  type TransactionsFilters,
} from '@/ui/features/transactions/use-transactions';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

const baseFilters: TransactionsFilters = {
  page: 1,
  pageSize: 25,
  sort: 'timestamp:desc',
};

describe('buildTransactionsQuery', () => {
  it('converte dateFrom/dateTo yyyy-mm-dd em ISO com offset UTC', () => {
    const params = buildTransactionsQuery({
      ...baseFilters,
      dateFrom: '2026-04-01',
      dateTo: '2026-04-22',
    });
    expect(params.get('dateFrom')).toBe('2026-04-01T00:00:00Z');
    expect(params.get('dateTo')).toBe('2026-04-22T23:59:59Z');
  });

  it('serializa page, pageSize e sort', () => {
    const params = buildTransactionsQuery({ ...baseFilters, page: 3, pageSize: 50 });
    expect(params.get('page')).toBe('3');
    expect(params.get('pageSize')).toBe('50');
    expect(params.get('sort')).toBe('timestamp:desc');
  });

  it('omite filtros nao definidos', () => {
    const params = buildTransactionsQuery(baseFilters);
    expect(params.has('dateFrom')).toBe(false);
    expect(params.has('network')).toBe(false);
    expect(params.has('walletId')).toBe(false);
    expect(params.has('type')).toBe(false);
    expect(params.has('assetSymbol')).toBe(false);
  });
});

describe('useTransactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('expoe data + meta do envelope com total da paginacao server-side', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [],
        error: null,
        meta: { total: 137, page: 2, pageSize: 25 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useTransactions({ ...baseFilters, page: 2 }),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.meta).toEqual({ total: 137, page: 2, pageSize: 25 });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('page=2');
    expect(String(url)).toContain('pageSize=25');
  });

  it('troca sort no parametro da query ao mudar filters.sort', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: [], error: null, meta: { total: 0, page: 1, pageSize: 25 } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(
      (filters: TransactionsFilters) => useTransactions(filters),
      {
        wrapper: makeWrapper(client),
        initialProps: baseFilters,
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('sort=timestamp%3Adesc');

    rerender({ ...baseFilters, sort: 'timestamp:asc' });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(String(fetchMock.mock.calls[1][0])).toContain('sort=timestamp%3Aasc');
  });
});
