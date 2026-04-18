---
id: TASK-130
title: TxClassifier (TRANSFER, INTERNAL, SWAP, FEE, STAKING, LP)
status: done
wave: 1
depends_on: [TASK-000, TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-100]
parallel_safe_with: [TASK-110, TASK-111, TASK-112, TASK-120]
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-130-tx-classifier
acceptance:
  - criterion: "TxClassifier classifica casos basicos de entrada, saida e internal"
    verify: "npm run test -- tests/unit/classifier/tx-classifier.test.ts"
  - criterion: "TxClassifier detecta UNKNOWN quando nao houver regra suficiente"
    verify: "npm run test -- tests/unit/classifier/tx-classifier.test.ts"
  - criterion: "Classificacao considera wallets do usuario para marcar INTERNAL"
    verify: "npm run test -- tests/unit/classifier/tx-classifier.test.ts"
deliverables:
  - src/core/services/tx-classifier.ts
  - src/core/domain/normalized-transaction.ts
  - tests/unit/classifier/tx-classifier.test.ts
  - docs/01-arquitetura.md
---

# TASK-130 — TxClassifier

## Objetivo
Classificar transações normalizadas em tipos de domínio da aplicação, sem depender de chamadas de rede.

## Escopo
- regras básicas de classificação
- detecção de INTERNAL com base nas wallets cadastradas
- fallback para UNKNOWN com versionamento simples

## Fora do escopo
- heurísticas avançadas de protocolos DeFi
- reprocessamento em lote
- integração com sync end-to-end
