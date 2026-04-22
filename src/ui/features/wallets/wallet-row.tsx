'use client';

import * as React from 'react';
import { Button } from '@/ui/components/button';
import { t } from '@/lib/i18n';
import type { WalletDTO } from './use-wallets';
import { useSyncWallet } from './use-sync-wallet';

export interface WalletRowProps {
  wallet: WalletDTO;
}

/**
 * Encurta um endereço on-chain para `prefixo…sufixo` para a lista.
 * O valor completo fica exposto via `title` (tooltip nativo) para
 * facilitar copiar sem introduzir lib de tooltip.
 */
export function truncateAddress(address: string, visible = 6): string {
  if (address.length <= visible * 2 + 1) {
    return address;
  }
  return `${address.slice(0, visible)}…${address.slice(-visible)}`;
}

function formatLastSync(iso: string | null): string {
  if (!iso) {
    return t('wallets.row.neverSynced');
  }
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function WalletRow({ wallet }: WalletRowProps) {
  const syncMutation = useSyncWallet();

  const isSyncing = syncMutation.isPending && syncMutation.variables === wallet.id;

  return (
    <li
      data-slot="wallet-row"
      data-wallet-id={wallet.id}
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-base font-medium text-foreground">{wallet.label}</span>
        <span
          className="truncate font-mono text-sm text-muted-foreground"
          title={wallet.address}
        >
          {truncateAddress(wallet.address)}
        </span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-medium">{t('wallets.row.network')}:</span> {wallet.network}
          </span>
          <span>
            <span className="font-medium">{t('wallets.row.lastSync')}:</span>{' '}
            {formatLastSync(wallet.lastSyncedAt)}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => syncMutation.mutate(wallet.id)}
        disabled={isSyncing}
        aria-label={t('wallets.row.syncAria')}
      >
        {isSyncing ? t('wallets.action.syncing') : t('wallets.action.sync')}
      </Button>
    </li>
  );
}
