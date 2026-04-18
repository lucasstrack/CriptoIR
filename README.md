# CriptoIR

Aplicação web local para rastrear transações on-chain de carteiras pessoais e agregar patrimônio em cripto, com grid estilo Excel e gráficos de evolução. Projetada para uso pessoal e auxílio em declaração de imposto de renda.

> **Status:** em desenvolvimento inicial (Onda 0 — fundação).

## Stack

- Next.js + TypeScript (App Router)
- Tailwind CSS + shadcn/ui (tema dark)
- Prisma + SQLite
- Vitest + Playwright
- TanStack Table + TanStack Query + Recharts

## Redes suportadas (v1)

BTC, ETH, BASE, ARB, SOL — arquitetura plugável para novas redes.

## Como rodar (em breve)

Depois que a Onda 0 concluir:

```bash
npm install
cp .env.example .env.local   # preencha as chaves (ver docs/99-setup-chaves.md)
npx prisma migrate dev
npm run dev
```

## Documentação

- [Arquitetura](docs/01-arquitetura.md)
- [Catálogo de API](docs/02-api.md)
- [Modelo de dados](docs/03-modelo-de-dados.md)
- [Fluxo multi-agente](docs/04-fluxo-multi-agente.md)
- [Roadmap](docs/05-roadmap.md)
- [Setup de chaves de API](docs/99-setup-chaves.md)
- [Decisões técnicas (ADRs)](docs/decisoes/)

## Licença

MIT — ver [LICENSE](LICENSE).
