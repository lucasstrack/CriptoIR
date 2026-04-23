import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import {
  usePortfolioHistory,
  PORTFOLIO_HISTORY_QUERY_KEY,
} from '@/ui/features/portfolio/use-portfolio-history';

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

describe('usePortfolioHistory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('usa chave ["portfolio-history"] para cache', () => {
    expect(PORTFOLIO_HISTORY_QUERY_KEY).toEqual(['portfolio-history']);
  });

  it('GETa /api/portfolio/history e desembrulha o envelope em sucesso', async () => {
    const history = [
      {
        weekStart: '2026-03-02T00:00:00.000Z',
        totalUsd: '1000',
        totalBrl: '5000',
        breakdown: [],
      },
      {
        weekStart: '2026-03-09T00:00:00.000Z',
        totalUsd: '1200',
        totalBrl: '6000',
        breakdown: [],
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: history, error: null, meta: null }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => usePortfolioHistory(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(history);
    expect(fetchMock).toHaveBeenCalledWith('/api/portfolio/history', expect.any(Object));
  });

  it('expõe erro com code preservado quando API responde envelope de erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: null,
            error: { code: 'INTERNAL_ERROR', message: 'boom' },
            meta: null,
          },
          500,
        ),
      ),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => usePortfolioHistory(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({
      name: 'ApiClientError',
      code: 'INTERNAL_ERROR',
    });
  });
});
