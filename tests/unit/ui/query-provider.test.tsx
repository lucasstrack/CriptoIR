import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryProvider } from '@/ui/providers/query-provider';

function Consumer() {
  const client = useQueryClient();
  const { staleTime } = client.getDefaultOptions().queries ?? {};
  return (
    <div>
      <span data-testid="client-available">{client ? 'ok' : 'missing'}</span>
      <span data-testid="stale-time">{String(staleTime)}</span>
    </div>
  );
}

describe('QueryProvider', () => {
  afterEach(() => {
    cleanup();
  });

  it('disponibiliza um QueryClient para os filhos (smoke)', () => {
    render(
      <QueryProvider>
        <Consumer />
      </QueryProvider>,
    );

    expect(screen.getByTestId('client-available')).toHaveTextContent('ok');
  });

  it('define staleTime default de 60_000 ms', () => {
    render(
      <QueryProvider>
        <Consumer />
      </QueryProvider>,
    );

    expect(screen.getByTestId('stale-time')).toHaveTextContent('60000');
  });
});
