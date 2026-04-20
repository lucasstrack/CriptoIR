'use client';

import { useCurrency } from '@/ui/hooks/use-currency';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface CurrencyToggleProps {
  className?: string;
}

/**
 * Par de botões segmentado para alternar USD/BRL. Lê e escreve diretamente
 * no store global (`useCurrency`), sem prop drilling.
 */
export function CurrencyToggle({ className }: CurrencyToggleProps) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div
      role="group"
      aria-label={t('currency.toggle.aria')}
      className={cn(
        'inline-flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5 text-xs font-medium',
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={currency === 'USD'}
        onClick={() => setCurrency('USD')}
        className={cn(
          'rounded-sm px-2.5 py-1 transition-colors',
          currency === 'USD'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {t('currency.toggle.usd')}
      </button>
      <button
        type="button"
        aria-pressed={currency === 'BRL'}
        onClick={() => setCurrency('BRL')}
        className={cn(
          'rounded-sm px-2.5 py-1 transition-colors',
          currency === 'BRL'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {t('currency.toggle.brl')}
      </button>
    </div>
  );
}
