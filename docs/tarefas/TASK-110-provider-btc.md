---
id: TASK-110
title: BlockchainProvider base + provider BTC (mempool.space)
status: done
wave: 1
depends_on: [TASK-000, TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006]
parallel_safe_with: [TASK-111, TASK-112, TASK-120, TASK-130]
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-110-provider-btc
acceptance:
  - criterion: "Interface BlockchainProvider define contrato comum para sync de wallets"
    verify: "test -f src/infra/blockchain/provider.ts"
  - criterion: "Provider BTC consulta mempool.space e retorna transacoes normalizadas"
    verify: "npm run test -- tests/unit/providers/btc-provider.test.ts"
  - criterion: "Provider BTC respeita validacao minima de endereco BTC"
    verify: "npm run test -- tests/unit/providers/btc-provider.test.ts"
deliverables:
  - src/infra/blockchain/provider.ts
  - src/infra/blockchain/btc/mempool-space-provider.ts
  - src/infra/http/fetch-json.ts
  - tests/unit/providers/btc-provider.test.ts
  - docs/01-arquitetura.md
---

# TASK-110 — BlockchainProvider base + provider BTC

## Objetivo
Criar o contrato base de providers de blockchain e a primeira implementação concreta para BTC usando mempool.space.

## Escopo
- definir tipos normalizados de sync
- mapear transações BTC relevantes para uma wallet
- manter o código desacoplado do orquestrador de sync

## Fora do escopo
- persistência em banco
- endpoint de sync
- classificação avançada de transações
