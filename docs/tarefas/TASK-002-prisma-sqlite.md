---
id: TASK-002
title: Prisma + SQLite com schema inicial e primeira migration
status: blocked
wave: 0
depends_on: [TASK-000]
parallel_safe_with: [TASK-001, TASK-003]
owner_dev: null
owner_reviewer: null
branch: task/TASK-002-prisma-sqlite
acceptance:
  - criterion: "prisma/schema.prisma existe com datasource sqlite"
    verify: "grep -q 'provider = \"sqlite\"' prisma/schema.prisma"
  - criterion: "Modelos Wallet, Asset, Transaction, PriceSnapshot, PortfolioSnapshot, SyncLog declarados"
    verify: "for m in Wallet Asset Transaction PriceSnapshot PortfolioSnapshot SyncLog; do grep -q \"model $m\" prisma/schema.prisma || exit 1; done"
  - criterion: "Enums Network, Direction, TxType, TxStatus declarados"
    verify: "for e in Network Direction TxType TxStatus; do grep -q \"enum $e\" prisma/schema.prisma || exit 1; done"
  - criterion: "prisma/migrations/ contém ao menos 1 migration"
    verify: "ls prisma/migrations/*/migration.sql | head -n1"
  - criterion: "npx prisma validate passa"
    verify: "npx prisma validate"
  - criterion: "npx prisma generate passa e @prisma/client fica disponível"
    verify: "npx prisma generate && node -e \"require('@prisma/client')\""
  - criterion: "src/infra/db/prisma.ts exporta singleton PrismaClient"
    verify: "grep -q 'PrismaClient' src/infra/db/prisma.ts"
deliverables:
  - prisma/schema.prisma
  - prisma/migrations/**
  - src/infra/db/prisma.ts
  - package.json (scripts: db:migrate, db:push, db:studio, postinstall com prisma generate)
  - .env.example (já existe; garantir DATABASE_URL)
---

# TASK-002 — Prisma + SQLite

## Objetivo
Implementar o schema definido em [docs/03-modelo-de-dados.md](../03-modelo-de-dados.md) em Prisma, rodar a primeira migration e expor um PrismaClient singleton para a camada de infra.

## Passos sugeridos
1. `npm i -D prisma && npm i @prisma/client`
2. `npx prisma init --datasource-provider sqlite`
3. Substituir `prisma/schema.prisma` implementando todos os modelos e enums conforme doc 03.
   - Usar tipo `String` para valores decimais (`amount`, `feeAmount`, preços, totais).
   - `BigInt` para `blockNumber`.
   - Relações com `onDelete: Cascade` entre Wallet → Transaction, Wallet → SyncLog.
4. `npx prisma migrate dev --name init`
5. Criar `src/infra/db/prisma.ts` com pattern singleton (evita múltiplas conexões em dev por HMR).
6. Adicionar scripts em `package.json`:
   - `"db:migrate": "prisma migrate dev"`
   - `"db:push": "prisma db push"`
   - `"db:studio": "prisma studio"`
   - `"postinstall": "prisma generate"`

## Fora do escopo
- Repositories (ex: `wallet-repository.ts`) — virão com as use-cases na Onda 1.
- Seeds — não necessários na v1.
