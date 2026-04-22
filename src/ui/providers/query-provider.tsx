'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Provider do TanStack Query montado no root layout.
 *
 * `staleTime` default de 60s reflete a natureza dos dados (preços, holdings)
 * que não precisam de refresh agressivo. Telas específicas podem
 * sobrescrever via useQuery.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
