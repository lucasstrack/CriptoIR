'use client';

import * as React from 'react';
import { Button } from '@/ui/components/button';
import { Dialog } from '@/ui/components/dialog';
import { EmptyState } from '@/ui/components/empty-state';
import { ErrorState } from '@/ui/components/error-state';
import { Skeleton } from '@/ui/components/skeleton';
import { t } from '@/lib/i18n';
import { useWallets } from './use-wallets';
import { WalletForm } from './wallet-form';
import { WalletRow } from './wallet-row';

/**
 * Lista de carteiras + CTA de adicionar e dialog com `WalletForm`.
 *
 * Estados: `loading` mostra skeletons, `error` usa `ErrorState` com retry,
 * vazio usa `EmptyState` e oferece botão "Adicionar carteira"; sucesso
 * renderiza `ul > WalletRow`.
 */
export function WalletList() {
  const [isFormOpen, setFormOpen] = React.useState(false);
  const walletsQuery = useWallets();

  const openForm = React.useCallback(() => setFormOpen(true), []);
  const closeForm = React.useCallback(() => setFormOpen(false), []);

  const addButton = (
    <Button type="button" onClick={openForm}>
      {t('wallets.action.add')}
    </Button>
  );

  let content: React.ReactNode;

  if (walletsQuery.isPending) {
    content = (
      <div
        role="status"
        aria-label={t('wallets.loading.aria')}
        className="flex flex-col gap-3"
        data-slot="wallets-loading"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    );
  } else if (walletsQuery.isError) {
    content = (
      <ErrorState
        title={t('wallets.error.title')}
        description={t('wallets.error.body')}
        retryLabel={t('wallets.error.retry')}
        onRetry={() => {
          void walletsQuery.refetch();
        }}
      />
    );
  } else if (walletsQuery.data.length === 0) {
    content = (
      <EmptyState
        title={t('wallets.empty.title')}
        description={t('wallets.empty.body')}
        action={addButton}
      />
    );
  } else {
    content = (
      <ul data-slot="wallet-list" className="flex flex-col gap-3">
        {walletsQuery.data.map((wallet) => (
          <WalletRow key={wallet.id} wallet={wallet} />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">{t('wallets.page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('wallets.page.description')}</p>
        </div>
        {walletsQuery.data && walletsQuery.data.length > 0 ? addButton : null}
      </header>

      {content}

      <Dialog
        open={isFormOpen}
        onOpenChange={setFormOpen}
        title={t('wallets.form.title')}
        description={t('wallets.form.description')}
        closeLabel={t('wallets.form.close')}
      >
        <WalletForm onCreated={closeForm} onCancel={closeForm} />
      </Dialog>
    </section>
  );
}
