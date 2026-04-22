import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/ui/providers/query-provider';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: t('app.title'),
  description: t('app.description'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
