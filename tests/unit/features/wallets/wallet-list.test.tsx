import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { WalletList } from '@/ui/features/wallets/wallet-list';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWithClient(ui: ReactElement, client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe('WalletList', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mostra skeletons enquanto a query carrega', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    renderWithClient(<WalletList />);

    expect(screen.getByRole('status', { name: 'Carregando carteiras' })).toBeInTheDocument();
  });

  it('renderiza empty-state quando API retorna lista vazia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: [], error: null, meta: null })),
    );

    renderWithClient(<WalletList />);

    expect(
      await screen.findByRole('heading', { name: 'Nenhuma carteira cadastrada' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar carteira' })).toBeInTheDocument();
  });

  it('renderiza uma wallet-row por carteira com endereco truncado, rede e ultimo sync', async () => {
    const wallets = [
      {
        id: 'w1',
        label: 'BTC Cold',
        address: 'bc1qabcdef0123456789fedcba9876543210',
        network: 'BTC',
        createdAt: '2026-04-10T12:00:00.000Z',
        lastSyncedAt: '2026-04-20T08:30:00.000Z',
        lastSyncedCursor: null,
      },
      {
        id: 'w2',
        label: 'ETH Hot',
        address: '0xabcdef0123456789abcdef0123456789abcdef01',
        network: 'ETH',
        createdAt: '2026-04-15T12:00:00.000Z',
        lastSyncedAt: null,
        lastSyncedCursor: null,
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: wallets, error: null, meta: null })),
    );

    renderWithClient(<WalletList />);

    expect(await screen.findByText('BTC Cold')).toBeInTheDocument();
    expect(screen.getByText('ETH Hot')).toBeInTheDocument();
    // endereco truncado (nao exibe endereco completo)
    expect(screen.queryByText('bc1qabcdef0123456789fedcba9876543210')).not.toBeInTheDocument();
    // contem parte inicial truncada
    expect(screen.getByText(/bc1qab…/)).toBeInTheDocument();
    // estado "nunca sincronizado" para wallet sem lastSyncedAt
    expect(screen.getByText('Nunca sincronizado')).toBeInTheDocument();
    // botao sincronizar renderizado por row
    expect(screen.getAllByRole('button', { name: 'Sincronizar carteira' })).toHaveLength(2);
  });

  it('exibe ErrorState com botao de retry quando a query falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
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

    renderWithClient(<WalletList />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Não foi possível carregar as carteiras' }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
