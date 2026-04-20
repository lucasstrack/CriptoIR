import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AppNavbar } from '@/ui/components/app-navbar';
import { useCurrencyStore } from '@/ui/stores/currency-store';

vi.mock('next/navigation', () => ({
  usePathname: () => '/patrimonio',
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('AppNavbar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCurrencyStore.setState({ currency: 'USD' });
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza os links de navegação principais', () => {
    render(<AppNavbar />);

    const patrimonio = screen.getByRole('link', { name: 'Patrimônio' });
    const carteiras = screen.getByRole('link', { name: 'Carteiras' });
    const transacoes = screen.getByRole('link', { name: 'Transações' });

    expect(patrimonio).toHaveAttribute('href', '/patrimonio');
    expect(carteiras).toHaveAttribute('href', '/carteiras');
    expect(transacoes).toHaveAttribute('href', '/transacoes');
  });

  it('marca o link ativo pelo pathname atual', () => {
    render(<AppNavbar />);

    const patrimonio = screen.getByRole('link', { name: 'Patrimônio' });
    expect(patrimonio).toHaveAttribute('aria-current', 'page');
  });

  it('renderiza o toggle USD/BRL visível na navbar', () => {
    render(<AppNavbar />);

    const group = screen.getByRole('group', { name: 'Alternar moeda' });
    expect(group).toBeInTheDocument();

    const usd = screen.getByRole('button', { name: 'USD' });
    const brl = screen.getByRole('button', { name: 'BRL' });
    expect(usd).toHaveAttribute('aria-pressed', 'true');
    expect(brl).toHaveAttribute('aria-pressed', 'false');
  });
});
