import { ArrowRightLeft, Database, MoonStar } from 'lucide-react';
import { Button } from '@/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/components/card';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-20">
        <Card className="w-full border-border/60 bg-card/95 shadow-2xl shadow-black/20">
          <CardHeader className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <MoonStar className="size-3.5" />
              Onda 0 pronta para evoluir
            </div>
            <CardTitle className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              CriptoIR
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              Base local para consolidar transacoes on-chain, acompanhar patrimonio e evoluir com
              providers modulares para BTC, EVM e SOL.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <Database className="mb-3 size-5 text-primary" />
              <p className="font-medium">Prisma + SQLite</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Persistencia local com schema inicial pronto para wallets, transacoes e snapshots.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <ArrowRightLeft className="mb-3 size-5 text-primary" />
              <p className="font-medium">API-first</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Envelope padrao, endpoint de health e catalogo centralizado para futuras rotas.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <MoonStar className="mb-3 size-5 text-primary" />
              <p className="font-medium">Tema dark</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Fundacao visual pronta com Tailwind e componentes base no estilo shadcn.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Proximo passo natural: Onda 1 com wallets, providers e sincronizacao.
            </p>
            <Button>Explorar a base</Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
