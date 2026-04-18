---
id: TASK-210
title: POST /api/wallets/:id/sync + job agendado (node-cron)
status: backlog
wave: 2
depends_on: [TASK-200]
parallel_safe_with: [TASK-220, TASK-230]
owner_dev:
owner_reviewer:
branch: task/TASK-210-sync-endpoint-cron
acceptance:
  - criterion: "POST /api/wallets/:id/sync dispara SyncOrchestrator e retorna 202 com syncLogId"
    verify: "npm run test -- tests/integration/sync-endpoint.test.ts"
  - criterion: "Endpoint retorna 404 WALLET_NOT_FOUND para id inexistente"
    verify: "npm run test -- tests/integration/sync-endpoint.test.ts"
  - criterion: "Endpoint retorna 409 SYNC_ALREADY_RUNNING se já houver SyncLog em andamento para a wallet"
    verify: "npm run test -- tests/integration/sync-endpoint.test.ts"
  - criterion: "Job node-cron percorre wallets não arquivadas no intervalo configurado e chama o mesmo caso de uso do endpoint"
    verify: "npm run test -- tests/unit/jobs/sync-cron.test.ts"
  - criterion: "docs/02-api.md documenta POST /api/wallets/:id/sync com payload, códigos de erro e task de origem"
    verify: "grep -q 'POST /api/wallets/:id/sync' docs/02-api.md"
deliverables:
  - src/app/api/wallets/[id]/sync/route.ts
  - src/core/use-cases/start-sync.ts
  - src/infra/jobs/sync-cron.ts
  - src/infra/jobs/index.ts
  - tests/integration/sync-endpoint.test.ts
  - tests/unit/jobs/sync-cron.test.ts
  - docs/02-api.md
---

# TASK-210 — Endpoint de sync + cron

## Objetivo
Expor o sync de uma wallet via HTTP e garantir que ele rode periodicamente sem intervenção manual.

## Escopo
- rota dinâmica `/api/wallets/[id]/sync` que valida id, confere ausência de SyncLog aberto e delega ao `syncWallet` da TASK-200
- bootstrap de job node-cron executado no startup do Next (cuidado com Turbopack em dev: rodar só no server runtime)
- intervalo configurável por env `SYNC_CRON_EXPR` (padrão: a cada 30 minutos)
- log estruturado por execução

## Fora do escopo
- fila distribuída
- priorização de wallets (todas tratadas igual)
- retry exponencial (delegado ao próximo ciclo do cron)

## Riscos conhecidos
- Múltiplas instâncias Next podem duplicar o job — a v1 é single-user local, tudo bem, mas registrar no arquivo de arquitetura
- Endpoint retorna 202 (async); cliente deve consultar SyncLog ou confiar no próximo GET de transações
