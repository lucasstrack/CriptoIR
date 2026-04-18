import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CriptoIR',
  description: 'Rastreador local de transações on-chain e agregador de patrimônio em cripto.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}
