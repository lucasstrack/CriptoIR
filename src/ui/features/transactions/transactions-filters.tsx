'use client';

import * as React from 'react';
import { Input } from '@/ui/components/input';
import { Select, type SelectOption } from '@/ui/components/select';
import { DateRangePicker, type DateRange } from '@/ui/components/date-range-picker';
import { t, type MessageKey } from '@/lib/i18n';
import { useWallets } from '@/ui/features/wallets/use-wallets';
import type { Network, TransactionsFilters, TxType } from './use-transactions';

const NETWORK_OPTIONS: ReadonlyArray<SelectOption> = [
  { value: 'BTC', label: 'BTC' },
  { value: 'ETH', label: 'ETH' },
  { value: 'BASE', label: 'BASE' },
  { value: 'ARB', label: 'ARB' },
  { value: 'SOL', label: 'SOL' },
];

const TYPE_VALUES: TxType[] = [
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'INTERNAL',
  'SWAP',
  'FEE',
  'LIQUIDITY_ADD',
  'LIQUIDITY_REMOVE',
  'STAKING_IN',
  'STAKING_OUT',
  'UNKNOWN',
];

export interface TransactionsFiltersProps {
  value: TransactionsFilters;
  onChange: (next: TransactionsFilters) => void;
}

export function TransactionsFiltersForm({ value, onChange }: TransactionsFiltersProps) {
  const walletsQuery = useWallets();

  const walletOptions = React.useMemo<ReadonlyArray<SelectOption>>(() => {
    if (!walletsQuery.data) return [];
    return walletsQuery.data.map((wallet) => ({ value: wallet.id, label: wallet.label }));
  }, [walletsQuery.data]);

  const typeOptions = React.useMemo<ReadonlyArray<SelectOption>>(
    () =>
      TYPE_VALUES.map((typeValue) => ({
        value: typeValue,
        label: t(`transactions.types.${typeValue}` as MessageKey),
      })),
    [],
  );

  const dateRange: DateRange = {
    from: value.dateFrom ?? '',
    to: value.dateTo ?? '',
  };

  const resetPage = (partial: Partial<TransactionsFilters>) =>
    onChange({ ...value, ...partial, page: 1 });

  return (
    <form
      data-slot="transactions-filters"
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4"
      aria-label={t('transactions.filters.aria')}
      onSubmit={(event) => event.preventDefault()}
    >
      <DateRangePicker
        value={dateRange}
        labels={{ from: t('transactions.filters.dateFrom'), to: t('transactions.filters.dateTo') }}
        onChange={(next) =>
          resetPage({
            dateFrom: next.from || undefined,
            dateTo: next.to || undefined,
          })
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{t('transactions.filters.network')}</span>
          <Select
            aria-label={t('transactions.filters.network')}
            options={NETWORK_OPTIONS}
            placeholder={t('transactions.filters.anyNetwork')}
            value={value.network ?? ''}
            onChange={(next) => resetPage({ network: (next as Network) || undefined })}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{t('transactions.filters.type')}</span>
          <Select
            aria-label={t('transactions.filters.type')}
            options={typeOptions}
            placeholder={t('transactions.filters.anyType')}
            value={value.type ?? ''}
            onChange={(next) => resetPage({ type: (next as TxType) || undefined })}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{t('transactions.filters.wallet')}</span>
          <Select
            aria-label={t('transactions.filters.wallet')}
            options={walletOptions}
            placeholder={t('transactions.filters.anyWallet')}
            value={value.walletId ?? ''}
            onChange={(next) => resetPage({ walletId: next || undefined })}
            disabled={walletsQuery.isPending || walletsQuery.isError}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{t('transactions.filters.asset')}</span>
          <Input
            aria-label={t('transactions.filters.asset')}
            value={value.assetSymbol ?? ''}
            placeholder={t('transactions.filters.assetPlaceholder')}
            onChange={(event) =>
              resetPage({ assetSymbol: event.target.value.trim() || undefined })
            }
          />
        </label>
      </div>
    </form>
  );
}
