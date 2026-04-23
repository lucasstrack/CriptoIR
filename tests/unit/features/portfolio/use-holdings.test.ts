import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { useHoldings, HOLDINGS_QUERY_KEY } from '@/ui/features/portfolio/use-holdings';

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

describe('useHoldings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('usa chave ["holdings"] para cache', () => {
    expect(HOLDINGS_QUERY_KEY).toEqual(['holdings']);
  });

  it('GETa /api/holdings e desembrulha o envelope em sucesso', async () => {
    const holdings = [
      {
        asset: {
          id: 'a-1',
          symbol: 'BTC',
          name: 'Bitcoin',
          network: 'BTC',
          contractAddress: null,
          decimals: 8,
        },
        amount: '0.5',
        averagePriceUsd: '30000',
        averagePriceBrl: '150000',
        priceUsd: '40000',
        priceBrl: '200000',
        valueUsd: '20000',
        valueBrl: '100000',
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: holdings, error: null, meta: null }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useHoldings(), { wrapper: makeWrapper(client) });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(holdings);
    expect(fetchMock).toHaveBeenCalledWith('/api/holdings', expect.any(Object));
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
    const { result } = renderHook(() => useHoldings(), { wrapper: makeWrapper(client) });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({
      name: 'ApiClientError',
      code: 'INTERNAL_ERROR',
    });
  });
});
