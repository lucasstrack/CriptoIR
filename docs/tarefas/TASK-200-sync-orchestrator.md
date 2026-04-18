---
id: TASK-200
title: SyncOrchestrator (providers + classifier, persistência idempotente)
status: done
wave: 2
depends_on: [TASK-100, TASK-110, TASK-111, TASK-112, TASK-120, TASK-130]
parallel_safe_with: []
owner_dev: claude-opus-4-7 (2026-04-18)
owner_reviewer:
branch: task/TASK-200-sync-orchestrator
acceptance:
  - criterion: "SyncOrchestrator resolve provider correto por Network e consome sua paginação usando lastSyncedCursor da wallet"
    verify: "npm run test -- tests/unit/sync/sync-orchestrator.test.ts"
  - criterion: "Transações normalizadas passam pelo TxClassifier antes da persistência"
    verify: "npm run test -- tests/unit/sync/sync-orchestrator.test.ts"
  - criterion: "Re-sync sobre janela já processada não duplica linhas (idempotência via índice único em Transaction)"
    verify: "npm run test -- tests/integration/sync.test.ts"
  - criterion: "Wallet tem lastSyncedAt e lastSyncedCursor atualizados ao final do sync"
    verify: "npm run test -- tests/integration/sync.test.ts"
  - criterion: "Falha de provider é registrada em SyncLog sem deixar transações parciais órfãs"
    verify: "npm run test -- tests/integration/sync.test.ts"
  - criterion: "rawPayload é persistido para permitir reprocessar classificação"
    verify: "grep -q 'rawPayload' src/core/use-cases/sync-wallet.ts"
deliverables:
  - src/core/use-cases/sync-wallet.ts
  - src/core/services/sync-orchestrator.ts
  - src/infra/db/transaction-repository.ts
  - src/infra/db/sync-log-repository.ts
  - src/infra/blockchain/provider-registry.ts
  - tests/unit/sync/sync-orchestrator.test.ts
  - tests/integration/sync.test.ts
  - docs/01-arquitetura.md
---

# TASK-200 — SyncOrchestrator

## Objetivo
Amarrar providers de blockchain, TxClassifier e persistência em um único caso de uso `syncWallet(walletId)` idempotente, que é o coração operacional do sistema.

## Escopo
- registry que resolve `BlockchainProvider` a partir de `Network`
- iteração paginada baseada em `lastSyncedCursor` (block height p/ BTC/EVM, signature p/ SOL)
- normalização → classificação (TxClassifier com contexto de todas as wallets do usuário p/ detectar INTERNAL) → persistência transacional
- criação de `Asset` on-demand quando a tx referenciar token ainda não cadastrado
- `SyncLog` registrando `startedAt`, `finishedAt`, `txCount` e `error`
- atualização de `lastSyncedAt` / `lastSyncedCursor` só ao final do bloco persistido com sucesso

## Fora do escopo
- endpoint HTTP (TASK-210)
- agendamento (TASK-210)
- cálculos de holdings / preço médio (TASK-230)
- reprocessamento em lote de classificação (backlog)

## Decisões a respeitar
- Idempotência via índice único `(walletId, txHash, direction)` em `Transaction` — não usar upsert por `id`
- Nunca descartar `rawPayload`: é o que permite reclassificar sem re-sync
- Transação de banco por lote (não por tx individual) para não segurar conexão durante fetch remoto
