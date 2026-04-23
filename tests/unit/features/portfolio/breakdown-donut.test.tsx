import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCurrencyStore } from '@/ui/stores/currency-store';
import { BreakdownDonut } from '@/ui/features/portfolio/breakdown-donut';
import type { Holding } from '@/ui/features/portfolio/use-holdings';

// Recharts ResponsiveContainer nao funciona em jsdom (clientWidth = 0).
// Abordagem (a): mockar apenas esse componente para entregar um tamanho fixo
// aos filhos e deixar o resto do Recharts renderizar normalmente.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-slot="responsive-container" style={{ width: 400, height: 320 }}>
        {children}
      </div>
    ),
  };
});

const btcHolding: Holding = {
  asset: {
    id: 'a-btc',
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
  valueUsd: '7500',
  valueBrl: '37500',
};

const ethHolding: Holding = {
  asset: {
    id: 'a-eth',
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'ETH',
    contractAddress: null,
    decimals: 18,
  },
  amount: '2',
  averagePriceUsd: '1000',
  averagePriceBrl: '5000',
  priceUsd: '1250',
  priceBrl: '6250',
  valueUsd: '2500',
  valueBrl: '12500',
};

const unpricedHolding: Holding = {
  asset: {
    id: 'a-unk',
    symbol: 'FOO',
    name: 'Foo',
    network: 'BASE',
    contractAddress: '0xabc',
    decimals: 18,
  },
  amount: '1000',
  averagePriceUsd: null,
  averagePriceBrl: null,
  priceUsd: null,
  priceBrl: null,
  valueUsd: null,
  valueBrl: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('BreakdownDonut', () => {
  beforeEach(() => {
    useCurrencyStore.setState({ currency: 'USD' });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useCurrencyStore.setState({ currency: 'USD' });
  });

  it('renderiza uma fatia por holding com preço e legenda com percentual', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ data: [btcHolding, ethHolding, unpricedHolding], error: null, meta: null }),
        ),
    );

    renderWithClient(<BreakdownDonut />);

    // Legend aparece quando carrega (7500 + 2500 = 10000 USD → BTC 75% / ETH 25%)
    const legend = await screen.findByTestId('breakdown-legend');
    const items = legend.querySelectorAll('li');
    // 2 holdings com preço — FOO ignorado
    expect(items).toHaveLength(2);
    const btcLegend = screen.getByTestId('breakdown-legend-BTC');
    expect(btcLegend.textContent ?? '').toContain('75.0%');
    const ethLegend = screen.getByTestId('breakdown-legend-ETH');
    expect(ethLegend.textContent ?? '').toContain('25.0%');
  });

  it('exibe empty-state quando nenhum holding tem preço na moeda ativa', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ data: [unpricedHolding], error: null, meta: null })),
    );

    renderWithClient(<BreakdownDonut />);

    // Aguarda o texto do empty-state aparecer (passa pelo estado loading).
    const emptyText = await screen.findByText(/Sem ativos para distribuir/);
    expect(emptyText.closest('[data-slot="empty-state"]')).not.toBeNull();
  });
});
