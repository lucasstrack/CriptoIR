import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { useSyncWallet } from '@/ui/features/wallets/use-sync-wallet';
import { WALLETS_QUERY_KEY } from '@/ui/features/wallets/use-wallets';

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

describe('useSyncWallet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('POSTa /api/wallets/:id/sync e invalida cache de wallets no sucesso', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ data: { syncLogId: 'log-1' }, error: null, meta: null }, 202),
      );
    vi.stubGlobal('fetch', fetchMock);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useSyncWallet(), { wrapper: makeWrapper(client) });

    result.current.mutate('wallet-123');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wallets/wallet-123/sync',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.data).toEqual({ syncLogId: 'log-1' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: WALLETS_QUERY_KEY });
  });

  it('expoe erro quando API responde com code de erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: null,
            error: { code: 'SYNC_ALREADY_RUNNING', message: 'em andamento' },
            meta: null,
          },
          409,
        ),
      ),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useSyncWallet(), { wrapper: makeWrapper(client) });

    result.current.mutate('wallet-err');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toMatchObject({
      name: 'ApiClientError',
      code: 'SYNC_ALREADY_RUNNING',
    });
  });

  it('sinaliza estado pendente enquanto fetch nao resolve', async () => {
    let resolveFetch!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending));

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSyncWallet(), { wrapper: makeWrapper(client) });

    result.current.mutate('wallet-pending');

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolveFetch(jsonResponse({ data: { syncLogId: 'log-2' }, error: null, meta: null }, 202));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
