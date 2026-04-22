import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { TransactionsTable } from '@/ui/features/transactions/transactions-table';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const tx = {
  id: 'tx-1',
  walletId: 'w-1',
  network: 'BTC',
  txHash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  blockNumber: '800001',
  timestamp: '2026-04-15T14:30:00.000Z',
  direction: 'IN',
  type: 'TRANSFER_IN',
  counterparty: null,
  amount: '0.12345678',
  feeAmount: null,
  status: 'CONFIRMED',
  asset: {
    id: 'a-1',
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'BTC',
    contractAddress: null,
    decimals: 8,
  },
  feeAsset: null,
  wallet: { id: 'w-1', label: 'Cold BTC', address: 'bc1qabc', network: 'BTC' },
};

describe('TransactionsTable', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renderiza grid TanStack Table com colunas data, rede, tipo, asset, amount, wallet, hash', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/wallets')) {
          return Promise.resolve(jsonResponse({ data: [], error: null, meta: null }));
        }
        return Promise.resolve(
          jsonResponse({
            data: [tx],
            error: null,
            meta: { total: 1, page: 1, pageSize: 25 },
          }),
        );
      }),
    );

    renderWithClient(<TransactionsTable />);

    await waitFor(() => {
      expect(screen.getByText('BTC', { selector: '[data-slot="tx-network"]' })).toBeInTheDocument();
    });

    // Colunas
    expect(screen.getByRole('columnheader', { name: 'Data' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Rede/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Tipo/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Ativo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Quantidade' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Carteira' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Hash' })).toBeInTheDocument();

    // Dados da linha (tx-type aparece tambem nas options do select de filtros — usar seletor especifico)
    expect(
      screen.getByText('TRANSFER_IN', { selector: '[data-slot="tx-type"]' }),
    ).toBeInTheDocument();
    expect(screen.getByText('0.12345678')).toBeInTheDocument();
    expect(screen.getByText('Cold BTC')).toBeInTheDocument();
    // Hash truncado, full no title
    const hashCell = screen.getByTitle(tx.txHash);
    expect(hashCell.textContent).not.toBe(tx.txHash);
    expect(hashCell.textContent).toMatch(/abcdef…/);
  });

  it('mostra empty-state quando a API retorna lista vazia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/wallets')) {
          return Promise.resolve(jsonResponse({ data: [], error: null, meta: null }));
        }
        return Promise.resolve(
          jsonResponse({
            data: [],
            error: null,
            meta: { total: 0, page: 1, pageSize: 25 },
          }),
        );
      }),
    );

    renderWithClient(<TransactionsTable />);

    expect(
      await screen.findByRole('heading', { name: 'Nenhuma transação encontrada' }),
    ).toBeInTheDocument();
  });

  it('exibe ErrorState quando a query falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/wallets')) {
          return Promise.resolve(jsonResponse({ data: [], error: null, meta: null }));
        }
        return Promise.resolve(
          jsonResponse(
            {
              data: null,
              error: { code: 'INTERNAL_ERROR', message: 'boom' },
              meta: null,
            },
            500,
          ),
        );
      }),
    );

    renderWithClient(<TransactionsTable />);

    expect(
      await screen.findByRole('heading', { name: 'Não foi possível carregar as transações' }),
    ).toBeInTheDocument();
  });
});
