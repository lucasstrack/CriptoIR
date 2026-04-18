---
id: TASK-100
title: CRUD de Wallets (API + UI básica)
status: done
wave: 1
depends_on: [TASK-000, TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006]
parallel_safe_with: []
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-100-crud-wallets
acceptance:
  - criterion: "POST /api/wallets cria wallet válida e retorna 201"
    verify: "npm run test -- tests/integration/wallets.test.ts"
  - criterion: "docs/02-api.md lista POST /api/wallets"
    verify: "grep -q 'POST /api/wallets' docs/02-api.md"
deliverables:
  - src/app/api/wallets/route.ts
  - src/core/use-cases/create-wallet.ts
  - src/infra/db/wallet-repository.ts
  - tests/integration/wallets.test.ts
  - docs/02-api.md
---

# TASK-100 — CRUD de Wallets

## Objetivo
Iniciar a Onda 1 com o cadastro de wallets e a primeira rota de domínio da aplicação.

## Observação
Esta task fica pronta para o orquestrador assim que a Onda 0 estiver concluída.
