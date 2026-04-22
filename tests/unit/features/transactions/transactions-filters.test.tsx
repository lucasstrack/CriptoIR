import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import {
  TransactionsFiltersForm,
} from '@/ui/features/transactions/transactions-filters';
import type { TransactionsFilters } from '@/ui/features/transactions/use-transactions';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const initialFilters: TransactionsFilters = {
  page: 3,
  pageSize: 25,
  sort: 'timestamp:desc',
};

describe('TransactionsFiltersForm', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('envia novos filtros de data/rede/tipo e reseta page para 1', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: [], error: null, meta: null })),
    );
    const onChange = vi.fn();

    renderWithClient(<TransactionsFiltersForm value={initialFilters} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-04-01' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ dateFrom: '2026-04-01', page: 1 }),
    );

    fireEvent.change(screen.getByLabelText('Rede'), { target: { value: 'ETH' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ network: 'ETH', page: 1 }),
    );

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'SWAP' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'SWAP', page: 1 }),
    );
  });

  it('popula o select de carteira com as wallets retornadas por GET /api/wallets', async () => {
    const wallets = [
      {
        id: 'w-1',
        label: 'Cold BTC',
        address: 'bc1qabc',
        network: 'BTC',
        createdAt: '2026-04-01T00:00:00.000Z',
        lastSyncedAt: null,
        lastSyncedCursor: null,
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: wallets, error: null, meta: null })),
    );

    renderWithClient(
      <TransactionsFiltersForm value={initialFilters} onChange={vi.fn()} />,
    );

    const walletSelect = screen.getByLabelText('Carteira') as HTMLSelectElement;
    await waitFor(() => {
      expect(walletSelect.disabled).toBe(false);
    });
    expect(
      Array.from(walletSelect.options).some((option) => option.value === 'w-1'),
    ).toBe(true);
  });

  it('filtro de asset envia assetSymbol trimado', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: [], error: null, meta: null })),
    );
    const onChange = vi.fn();

    renderWithClient(<TransactionsFiltersForm value={initialFilters} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Ativo'), { target: { value: '  ETH  ' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ assetSymbol: 'ETH', page: 1 }),
    );
  });
});
