# ADR 0001 — Stack inicial e providers

- **Data:** 2026-04-18
- **Status:** Aceito
- **Contexto:** Decisão inicial de stack após Q&A com o usuário.

## Decisão

- Framework: **Next.js + TypeScript (App Router)**
- UI: **Tailwind + shadcn/ui**, tema dark
- Data grid: **TanStack Table v8**
- Gráficos: **Recharts**
- ORM: **Prisma** sobre **SQLite**
- Validação: **Zod**
- Tests: **Vitest** (unit/integration) + **Playwright** (e2e)
- Package manager: **npm**
- Providers:
  - BTC → mempool.space (público)
  - EVM (ETH/BASE/ARB) → Alchemy (chave gratuita)
  - SOL → Helius (chave gratuita)
  - Preços → CoinGecko (free tier)

## Consequências

- Stack fullstack num só repo reduz overhead de infra local.
- Prisma exige step de `generate` após alterações de schema — amarrado em `postinstall` e em `npm run check`.
- Chaves de Alchemy/Helius exigem onboarding inicial do usuário (guia em `docs/99-setup-chaves.md`).
- TanStack Table dá flexibilidade total mas exige mais código custom do que grids "completos" como AG Grid — aceito pela licenciamento livre.

## Alternativas avaliadas

- **Drizzle** vs Prisma → Drizzle mais enxuto mas Prisma Studio e ecossistema vencem p/ um projeto local.
- **Node puro + React separado** → descartado por dobrar complexidade de build/deploy local.
- **Mantine / MUI** vs shadcn → descartados por menor controle sobre tema dark custom.
- **AG Grid / Handsontable** vs TanStack → licenças restritivas ou pesadas p/ open source.
