import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { WalletForm } from '@/ui/features/wallets/wallet-form';
import { WALLETS_QUERY_KEY } from '@/ui/features/wallets/use-wallets';

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

function fillValidFields() {
  fireEvent.change(screen.getByLabelText('Nome'), {
    target: { value: 'Cold wallet BTC' },
  });
  fireEvent.change(screen.getByLabelText('Endereço'), {
    target: { value: 'bc1qabcdef0123456789fedcba9876543210' },
  });
}

describe('WalletForm', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('submete POST /api/wallets e chama onCreated; invalida cache de wallets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          data: {
            id: 'w1',
            label: 'Cold wallet BTC',
            address: 'bc1qabcdef0123456789fedcba9876543210',
            network: 'BTC',
            createdAt: '2026-04-22T12:00:00.000Z',
            lastSyncedAt: null,
            lastSyncedCursor: null,
          },
          error: null,
          meta: null,
        },
        201,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const onCreated = vi.fn();
    const onCancel = vi.fn();

    renderWithClient(<WalletForm onCreated={onCreated} onCancel={onCancel} />, client);

    fillValidFields();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/wallets',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      label: 'Cold wallet BTC',
      address: 'bc1qabcdef0123456789fedcba9876543210',
      network: 'BTC',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: WALLETS_QUERY_KEY });
  });

  it('exibe erros inline na validacao local sem chamar a API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onCreated = vi.fn();
    const onCancel = vi.fn();

    renderWithClient(<WalletForm onCreated={onCreated} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('traduz INVALID_ADDRESS em mensagem localizada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: null,
            error: { code: 'INVALID_ADDRESS', message: 'endereco invalido' },
            meta: null,
          },
          400,
        ),
      ),
    );

    renderWithClient(<WalletForm onCreated={vi.fn()} onCancel={vi.fn()} />);

    fillValidFields();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(
      await screen.findByText('Endereço inválido para a rede selecionada.'),
    ).toBeInTheDocument();
  });

  it('traduz WALLET_ALREADY_EXISTS em mensagem de duplicidade', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            data: null,
            error: { code: 'WALLET_ALREADY_EXISTS', message: 'ja existe' },
            meta: null,
          },
          409,
        ),
      ),
    );

    renderWithClient(<WalletForm onCreated={vi.fn()} onCancel={vi.fn()} />);

    fillValidFields();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(
      await screen.findByText(
        'Já existe uma carteira cadastrada com esse endereço nessa rede.',
      ),
    ).toBeInTheDocument();
  });

  it('chama onCancel ao clicar em cancelar', () => {
    const onCancel = vi.fn();
    renderWithClient(<WalletForm onCreated={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
