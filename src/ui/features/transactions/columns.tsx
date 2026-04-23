'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Network } from '@prisma/client';
import type { TransactionDTO } from '@/core/use-cases/list-transactions';
import { t, type MessageKey } from '@/lib/i18n';

function truncateHash(hash: string, visible = 6): string {
  if (hash.length <= visible * 2 + 1) return hash;
  return `${hash.slice(0, visible)}…${hash.slice(-visible)}`;
}

function explorerUrl(network: Network, txHash: string): string | null {
  switch (network) {
    case 'BTC':
      return `https://mempool.space/tx/${txHash}`;
    case 'ETH':
      return `https://etherscan.io/tx/${txHash}`;
    case 'BASE':
      return `https://basescan.org/tx/${txHash}`;
    case 'ARB':
      return `https://arbiscan.io/tx/${txHash}`;
    case 'SOL':
      return `https://solscan.io/tx/${txHash}`;
    default:
      return null;
  }
}

function typeLabel(type: TransactionDTO['type']): string {
  return t(`transactions.types.${type}` as MessageKey);
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function buildTransactionColumns(): ColumnDef<TransactionDTO>[] {
  return [
    {
      id: 'timestamp',
      accessorKey: 'timestamp',
      header: () => t('transactions.columns.timestamp'),
      cell: ({ row }) => (
        <span data-slot="tx-timestamp">{formatTimestamp(row.original.timestamp)}</span>
      ),
      enableSorting: true,
    },
    {
      id: 'network',
      accessorKey: 'network',
      header: () => t('transactions.columns.network'),
      cell: ({ row }) => (
        <span
          data-slot="tx-network"
          className="inline-flex rounded border border-border/60 px-2 py-0.5 text-xs font-medium"
        >
          {row.original.network}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: () => t('transactions.columns.type'),
      cell: ({ row }) => (
        <span
          data-slot="tx-type"
          className="inline-flex rounded-full bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {typeLabel(row.original.type)}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'asset',
      header: () => t('transactions.columns.asset'),
      cell: ({ row }) => (
        <span data-slot="tx-asset" className="font-medium">
          {row.original.asset.symbol}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: () => t('transactions.columns.amount'),
      cell: ({ row }) => (
        <span data-slot="tx-amount" className="block text-right font-mono tabular-nums">
          {row.original.amount}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'wallet',
      header: () => t('transactions.columns.wallet'),
      cell: ({ row }) => (
        <span data-slot="tx-wallet" className="text-sm">
          {row.original.wallet.label}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'hash',
      accessorKey: 'txHash',
      header: () => t('transactions.columns.hash'),
      cell: ({ row }) => {
        const url = explorerUrl(row.original.network, row.original.txHash);
        const truncated = truncateHash(row.original.txHash);
        return url ? (
          <a
            data-slot="tx-hash"
            href={url}
            target="_blank"
            rel="noreferrer"
            title={row.original.txHash}
            className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {truncated}
          </a>
        ) : (
          <span
            data-slot="tx-hash"
            title={row.original.txHash}
            className="font-mono text-xs text-muted-foreground"
          >
            {truncated}
          </span>
        );
      },
      enableSorting: false,
    },
  ];
}
