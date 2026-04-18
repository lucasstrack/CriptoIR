# CriptoIR

Aplicação web local para rastrear transações on-chain de carteiras pessoais e agregar patrimônio em cripto, com grid estilo Excel e gráficos de evolução. Projetada para uso pessoal e auxílio em declaração de imposto de renda.

> **Status:** Onda 0 concluída.

## Stack

- Next.js + TypeScript (App Router)
- Tailwind CSS + shadcn/ui (tema dark)
- Prisma + SQLite
- Vitest + Playwright
- Orquestrador local de tasks para fluxo multi-agente

## Estado atual

Ja disponivel nesta base:

- scaffold Next.js com layout e home inicial
- tema dark com Tailwind + componentes base
- Prisma + SQLite com schema inicial e primeira migration
- endpoint `GET /api/health`
- Vitest, Playwright e `npm run check`
- scripts `orch:*` para listar, escolher e verificar tasks

Planejado para a Onda 1:

- CRUD de wallets
- providers BTC, EVM e SOL
- sincronizacao incremental de transacoes
- holdings, historico e telas principais

## Redes suportadas (v1)

BTC, ETH, BASE, ARB, SOL — arquitetura plugável para novas redes.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha as chaves (ver docs/99-setup-chaves.md)
npm run db:migrate
npm run dev
```

## Como contribuir

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run check
npm run check:providers
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
