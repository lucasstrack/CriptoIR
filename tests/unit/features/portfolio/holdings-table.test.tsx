import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useCurrencyStore } from '@/ui/stores/currency-store';
import { HoldingsTable } from '@/ui/features/portfolio/holdings-table';
import type { Holding } from '@/ui/features/portfolio/use-holdings';

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
  valueUsd: '20000',
  valueBrl: '100000',
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
  priceUsd: '2000',
  priceBrl: '10000',
  valueUsd: '4000',
  valueBrl: '20000',
};

const unpricedHolding: Holding = {
  asset: {
    id: 'a-unk',
    symbol: 'FOO',
    name: 'Foo Token',
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

describe('HoldingsTable', () => {
  beforeEach(() => {
    useCurrencyStore.setState({ currency: 'USD' });
  });

  afterEach(() => {
    cleanup();
    useCurrencyStore.setState({ currency: 'USD' });
  });

  it('renderiza uma linha por holding com amount, preço médio, atual e valor em USD', () => {
    render(<HoldingsTable holdings={[btcHolding, ethHolding]} />);

    const rows = screen.getAllByRole('row');
    // 1 header + 2 data rows
    expect(rows).toHaveLength(3);
    // symbol "BTC" aparece tambem no network-badge — checamos ambos via row content
    expect(rows[1]).toHaveTextContent('BTC');
    expect(rows[2]).toHaveTextContent('ETH');
    expect(screen.getByText('0.5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // USD formatting "US$ 40.000,00"
    expect(screen.getByText(/US\$\s*40\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/US\$\s*2\.000,00/)).toBeInTheDocument();
  });

  it('respeita toggle USD/BRL e exibe valores na moeda ativa', () => {
    useCurrencyStore.setState({ currency: 'BRL' });
    render(<HoldingsTable holdings={[btcHolding]} />);

    // BRL price 200000 → "R$ 200.000,00"
    expect(screen.getByText(/R\$\s*200\.000,00/)).toBeInTheDocument();
    // USD price 40000 não deve aparecer
    expect(screen.queryByText(/US\$\s*40\.000,00/)).not.toBeInTheDocument();
  });

  it('ordena por valor descendente na moeda ativa', () => {
    render(<HoldingsTable holdings={[ethHolding, btcHolding]} />);
    const dataRows = screen.getAllByRole('row').slice(1);
    expect(dataRows[0]).toHaveTextContent('BTC');
    expect(dataRows[1]).toHaveTextContent('ETH');
  });

  it('exibe placeholder "—" nos campos sem preço sem quebrar o render', () => {
    render(<HoldingsTable holdings={[unpricedHolding]} />);

    const row = screen.getAllByRole('row')[1];
    expect(row).toHaveTextContent('FOO');
    expect(row).toHaveTextContent('1000');
    // preço médio, preço atual e valor todos "—"
    const dashes = row.querySelectorAll('td');
    expect(dashes[2]).toHaveTextContent('—');
    expect(dashes[3]).toHaveTextContent('—');
    expect(dashes[4]).toHaveTextContent('—');
  });
});
