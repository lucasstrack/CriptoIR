---
id: TASK-111
title: Provider EVM (ETH, BASE, ARB via Alchemy)
status: done
wave: 1
depends_on: [TASK-000, TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006]
parallel_safe_with: [TASK-110, TASK-112, TASK-120, TASK-130]
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-111-provider-evm
acceptance:
  - criterion: "Provider EVM suporta ETH, BASE e ARB com configuracao por rede"
    verify: "npm run test -- tests/unit/providers/evm-provider.test.ts"
  - criterion: "Chamadas a Alchemy geram transacoes normalizadas para o contrato BlockchainProvider"
    verify: "npm run test -- tests/unit/providers/evm-provider.test.ts"
  - criterion: "Leitura de chaves ALCHEMY_ETH_KEY, ALCHEMY_BASE_KEY e ALCHEMY_ARB_KEY esta centralizada"
    verify: "grep -R \"ALCHEMY_ETH_KEY\\|ALCHEMY_BASE_KEY\\|ALCHEMY_ARB_KEY\" src/infra/blockchain/evm"
deliverables:
  - src/infra/blockchain/evm/alchemy-evm-provider.ts
  - src/infra/blockchain/evm/networks.ts
  - src/infra/http/fetch-json.ts
  - tests/unit/providers/evm-provider.test.ts
  - docs/01-arquitetura.md
---

# TASK-111 — Provider EVM

## Objetivo
Implementar o provider para redes EVM da v1 usando Alchemy como upstream: Ethereum, Base e Arbitrum.

## Escopo
- reutilizar o contrato BlockchainProvider
- compartilhar código entre redes EVM
- preparar base para sync incremental por bloco

## Fora do escopo
- classificação de tx
- gravação no banco
- agendamento de sync
