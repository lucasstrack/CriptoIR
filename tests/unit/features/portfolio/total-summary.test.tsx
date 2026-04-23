import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useCurrencyStore } from '@/ui/stores/currency-store';
import { TotalSummary } from '@/ui/features/portfolio/total-summary';
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

const ethHolding2: Holding = {
  ...ethHolding,
  asset: { ...ethHolding.asset, id: 'a-eth-2' },
  valueUsd: '1000',
  valueBrl: '5000',
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

describe('TotalSummary', () => {
  beforeEach(() => {
    useCurrencyStore.setState({ currency: 'USD' });
  });
  afterEach(() => {
    cleanup();
    useCurrencyStore.setState({ currency: 'USD' });
  });

  it('soma total consolidado em USD e ignora holdings sem preço', () => {
    render(<TotalSummary holdings={[btcHolding, ethHolding, unpricedHolding]} />);

    const total = screen.getByTestId('portfolio-total-value');
    // 20000 + 4000 = 24000 USD
    expect(total.textContent).toMatch(/US\$\s*24\.000,00/);
  });

  it('respeita toggle USD/BRL trocando a moeda', () => {
    useCurrencyStore.setState({ currency: 'BRL' });
    render(<TotalSummary holdings={[btcHolding, ethHolding]} />);

    const total = screen.getByTestId('portfolio-total-value');
    // 100000 + 20000 = 120000 BRL
    expect(total.textContent).toMatch(/R\$\s*120\.000,00/);
  });

  it('consolida total por rede agrupando holdings da mesma network', () => {
    render(<TotalSummary holdings={[btcHolding, ethHolding, ethHolding2]} />);

    // Cards por rede
    const btcCard = screen.getByTestId('portfolio-network-BTC');
    expect(btcCard.textContent).toMatch(/US\$\s*20\.000,00/);

    const ethCard = screen.getByTestId('portfolio-network-ETH');
    // 4000 + 1000 = 5000 USD
    expect(ethCard.textContent).toMatch(/US\$\s*5\.000,00/);
  });

  it('não renderiza grid de redes quando todos os holdings estão sem preço', () => {
    render(<TotalSummary holdings={[unpricedHolding]} />);
    expect(screen.queryByTestId('portfolio-networks')).not.toBeInTheDocument();
  });
});
