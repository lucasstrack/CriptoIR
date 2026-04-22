'use client';

import type { CurrencyCode } from '@/lib/format-currency';
import { useCurrency } from '@/ui/hooks/use-currency';
import { t, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface CurrencyToggleProps {
  className?: string;
}

const OPTIONS: ReadonlyArray<{ code: CurrencyCode; labelKey: MessageKey }> = [
  { code: 'USD', labelKey: 'currency.toggle.usd' },
  { code: 'BRL', labelKey: 'currency.toggle.brl' },
];

/**
 * Par de botões segmentado para alternar USD/BRL. Lê e escreve diretamente
 * no store global (`useCurrency`), sem prop drilling. Basta adicionar uma
 * entrada em `OPTIONS` para suportar uma moeda nova.
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
      {OPTIONS.map(({ code, labelKey }) => {
        const active = currency === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => setCurrency(code)}
            className={cn(
              'rounded-sm px-2.5 py-1 transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}
