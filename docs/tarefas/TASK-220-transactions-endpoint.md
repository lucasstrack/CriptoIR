---
id: TASK-220
title: GET /api/transactions com filtros, paginação e sort
status: backlog
wave: 2
depends_on: [TASK-200]
parallel_safe_with: [TASK-210, TASK-230]
owner_dev:
owner_reviewer:
branch: task/TASK-220-transactions-endpoint
acceptance:
  - criterion: "GET /api/transactions retorna lista paginada com meta.page/pageSize/total"
    verify: "npm run test -- tests/integration/transactions-endpoint.test.ts"
  - criterion: "Filtros suportados: dateFrom, dateTo, network, assetSymbol, walletId, type; combináveis"
    verify: "npm run test -- tests/integration/transactions-endpoint.test.ts"
  - criterion: "Sort por timestamp desc por padrão; aceita sort=timestamp:asc|timestamp:desc"
    verify: "npm run test -- tests/integration/transactions-endpoint.test.ts"
  - criterion: "Payload inválido retorna 400 VALIDATION_ERROR via Zod"
    verify: "npm run test -- tests/integration/transactions-endpoint.test.ts"
  - criterion: "docs/02-api.md documenta o endpoint com todos os filtros"
    verify: "grep -q 'GET /api/transactions' docs/02-api.md"
deliverables:
  - src/app/api/transactions/route.ts
  - src/core/use-cases/list-transactions.ts
  - src/infra/db/transaction-repository.ts
  - src/lib/zod-schemas/transaction-query.ts
  - tests/integration/transactions-endpoint.test.ts
  - docs/02-api.md
---

# TASK-220 — Listagem de transações

## Objetivo
Expor as transações sincronizadas com filtros suficientes para a tela de grid (TASK-320) e para análises manuais.

## Escopo
- parsing e validação de query params com Zod
- paginação offset-based (`page`, `pageSize` — default 50, teto 200)
- resposta inclui `asset` e `wallet` embedded o suficiente para a grid renderizar sem round-trip
- amounts como string decimal, timestamps ISO 8601 UTC

## Fora do escopo
- cursor-based pagination (backlog, só se os índices não aguentarem)
- export CSV/XLSX (Onda 5)
- agregações / totais (Onda 2 — vai em /holdings)

## Decisões a respeitar
- Reutilizar o repositório de Transaction da TASK-200; sem queries SQL cruas no route
- Envelope `{ data, error, meta }` conforme `docs/02-api.md`
