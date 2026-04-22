'use client';

import * as React from 'react';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { ApiClientError } from '@/lib/api-client';
import { t } from '@/lib/i18n';
import { createWalletSchema, type CreateWalletInput } from '@/lib/zod-schemas/wallet';
import { useCreateWallet } from './use-create-wallet';

const NETWORKS = ['BTC', 'ETH', 'BASE', 'ARB', 'SOL'] as const;

export interface WalletFormProps {
  /** Chamado quando a wallet é criada com sucesso — o consumidor fecha o dialog. */
  onCreated: () => void;
  /** Chamado quando o usuário clica em cancelar. */
  onCancel: () => void;
}

type FieldErrors = Partial<Record<'label' | 'address' | 'network', string>>;

/**
 * Mapeia códigos de erro retornados pela API em uma string traduzida.
 * `VALIDATION_ERROR` volta a mensagem default do Zod server-side via fallback.
 */
function mapApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return t('wallets.form.error.validation');
      case 'INVALID_ADDRESS':
        return t('wallets.form.error.invalidAddress');
      case 'WALLET_ALREADY_EXISTS':
        return t('wallets.form.error.duplicate');
      default:
        return t('wallets.form.error.generic');
    }
  }
  return t('wallets.form.error.generic');
}

export function WalletForm({ onCreated, onCancel }: WalletFormProps) {
  const [label, setLabel] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [network, setNetwork] = React.useState<CreateWalletInput['network']>('BTC');
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const createMutation = useCreateWallet();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const parsed = createWalletSchema.safeParse({ label, address, network });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'label' || key === 'address' || key === 'network') {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    try {
      await createMutation.mutateAsync(parsed.data);
      onCreated();
    } catch (error) {
      setFormError(mapApiError(error));
    }
  }

  const isSubmitting = createMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4"
      aria-label={t('wallets.form.title')}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="wallet-label" className="text-sm font-medium text-foreground">
          {t('wallets.form.labelField')}
        </label>
        <Input
          id="wallet-label"
          name="label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t('wallets.form.labelPlaceholder')}
          aria-invalid={Boolean(fieldErrors.label)}
          aria-describedby={fieldErrors.label ? 'wallet-label-error' : undefined}
          disabled={isSubmitting}
        />
        {fieldErrors.label ? (
          <p id="wallet-label-error" role="alert" className="text-xs text-destructive">
            {fieldErrors.label}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="wallet-address" className="text-sm font-medium text-foreground">
          {t('wallets.form.addressField')}
        </label>
        <Input
          id="wallet-address"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder={t('wallets.form.addressPlaceholder')}
          aria-invalid={Boolean(fieldErrors.address)}
          aria-describedby={fieldErrors.address ? 'wallet-address-error' : undefined}
          disabled={isSubmitting}
        />
        {fieldErrors.address ? (
          <p id="wallet-address-error" role="alert" className="text-xs text-destructive">
            {fieldErrors.address}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="wallet-network" className="text-sm font-medium text-foreground">
          {t('wallets.form.networkField')}
        </label>
        <select
          id="wallet-network"
          name="network"
          value={network}
          onChange={(event) => setNetwork(event.target.value as CreateWalletInput['network'])}
          disabled={isSubmitting}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {NETWORKS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('wallets.form.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('wallets.form.submitting') : t('wallets.form.submit')}
        </Button>
      </div>
    </form>
  );
}
