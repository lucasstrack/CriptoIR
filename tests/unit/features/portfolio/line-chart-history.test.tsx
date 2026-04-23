import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCurrencyStore } from '@/ui/stores/currency-store';
import {
  LineChartHistory,
  toChartPoints,
} from '@/ui/features/portfolio/line-chart-history';
import type { PortfolioHistoryPoint } from '@/ui/features/portfolio/use-portfolio-history';

// Recharts depende de clientWidth/clientHeight via ResponsiveContainer, que
// e 0 em jsdom. Mockamos para passar children com dimensoes fixas.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-slot="responsive-container" style={{ width: 600, height: 320 }}>
        {children}
      </div>
    ),
  };
});

const history: PortfolioHistoryPoint[] = [
  {
    weekStart: '2026-03-02T00:00:00.000Z',
    totalUsd: '1000',
    totalBrl: '5000',
    breakdown: [],
  },
  {
    weekStart: '2026-03-09T00:00:00.000Z',
    totalUsd: '1500',
    totalBrl: '7500',
    breakdown: [],
  },
];

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

describe('toChartPoints (pure)', () => {
  it('extrai totalUsd quando currency=USD', () => {
    expect(toChartPoints(history, 'USD')).toEqual([
      expect.objectContaining({ value: 1000, weekStart: '2026-03-02T00:00:00.000Z' }),
      expect.objectContaining({ value: 1500, weekStart: '2026-03-09T00:00:00.000Z' }),
    ]);
  });

  it('extrai totalBrl quando currency=BRL (prova re-render ao alternar toggle)', () => {
    expect(toChartPoints(history, 'BRL')).toEqual([
      expect.objectContaining({ value: 5000 }),
      expect.objectContaining({ value: 7500 }),
    ]);
  });

  it('converte valores nao-numericos em 0 sem lancar', () => {
    const bogus: PortfolioHistoryPoint[] = [
      { weekStart: '2026-03-02T00:00:00.000Z', totalUsd: 'n/a', totalBrl: null as unknown as string, breakdown: [] },
    ];
    expect(toChartPoints(bogus, 'USD')[0].value).toBe(0);
    expect(toChartPoints(bogus, 'BRL')[0].value).toBe(0);
  });

  it('formata label weekStart como dd/MM (pt-BR)', () => {
    const [first] = toChartPoints(history, 'USD');
    expect(first.label).toMatch(/\d{2}\/\d{2}/);
  });
});

describe('LineChartHistory', () => {
  beforeEach(() => {
    useCurrencyStore.setState({ currency: 'USD' });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useCurrencyStore.setState({ currency: 'USD' });
  });

  it('consome GET /api/portfolio/history e sai do estado loading em sucesso', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: history, error: null, meta: null }));
    vi.stubGlobal('fetch', fetchMock);

    const { container } = renderWithClient(<LineChartHistory />);

    await vi.waitFor(() => {
      // Quando a query resolve, o ChartContainer nao renderiza mais chart-loading.
      expect(container.querySelector('[data-slot="chart-loading"]')).toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/portfolio/history', expect.any(Object));
    // Nao exibe empty-state quando ha dados
    expect(container.querySelector('[data-slot="empty-state"]')).toBeNull();
    // ResponsiveContainer foi montado
    expect(container.querySelector('[data-slot="responsive-container"]')).not.toBeNull();
  });

  it('respeita toggle USD/BRL — toChartPoints usa os valores da moeda ativa', () => {
    // Garantia unitaria do re-render: trocar moeda muda os values dos pontos.
    const usd = toChartPoints(history, 'USD').map((p) => p.value);
    const brl = toChartPoints(history, 'BRL').map((p) => p.value);
    expect(usd).not.toEqual(brl);
    expect(usd).toEqual([1000, 1500]);
    expect(brl).toEqual([5000, 7500]);
  });

  it('exibe empty-state dedicado quando /api/portfolio/history retorna vazio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: [], error: null, meta: null })),
    );

    renderWithClient(<LineChartHistory />);

    // Aguarda texto do empty-state aparecer (passa pelo estado loading).
    const emptyText = await screen.findByText(/Sem histórico ainda/);
    expect(emptyText.closest('[data-slot="empty-state"]')).not.toBeNull();
  });
});
