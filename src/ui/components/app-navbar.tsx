'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t, type MessageKey } from '@/lib/i18n';
import { CurrencyToggle } from '@/ui/components/currency-toggle';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  labelKey: MessageKey;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/patrimonio', labelKey: 'nav.patrimonio' },
  { href: '/carteiras', labelKey: 'nav.carteiras' },
  { href: '/transacoes', labelKey: 'nav.transacoes' },
];

/**
 * Navbar principal do grupo (dashboard). Marca o link ativo pelo pathname e
 * renderiza o toggle USD/BRL à direita.
 */
export function AppNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/patrimonio"
            className="text-sm font-semibold tracking-wide text-foreground"
          >
            {t('nav.brand')}
          </Link>
          <nav aria-label={t('nav.aria.primary')}>
            <ul className="flex items-center gap-6 text-sm">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'transition-colors',
                        active
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t(item.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <CurrencyToggle />
      </div>
    </header>
  );
}
