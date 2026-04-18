---
id: TASK-112
title: Provider SOL (Helius e Alchemy)
status: done
wave: 1
depends_on: [TASK-000, TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006]
parallel_safe_with: [TASK-110, TASK-111, TASK-120, TASK-130]
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-112-provider-sol
acceptance:
  - criterion: "Provider SOL suporta consulta via Helius"
    verify: "npm run test -- tests/unit/providers/sol-provider.test.ts"
  - criterion: "Provider SOL suporta consulta via Alchemy quando ALCHEMY_SOL_KEY estiver configurada"
    verify: "npm run test -- tests/unit/providers/sol-provider.test.ts"
  - criterion: "Normalizacao de assinaturas, slots e transfers segue contrato comum de provider"
    verify: "npm run test -- tests/unit/providers/sol-provider.test.ts"
deliverables:
  - src/infra/blockchain/sol/helius-provider.ts
  - src/infra/blockchain/sol/alchemy-sol-provider.ts
  - src/infra/blockchain/sol/provider-factory.ts
  - tests/unit/providers/sol-provider.test.ts
  - docs/99-setup-chaves.md
---

# TASK-112 — Provider SOL

## Objetivo
Implementar o provider de Solana com suporte aos dois upstreams já documentados no projeto: Helius e Alchemy.

## Escopo
- escolher provider conforme variáveis de ambiente disponíveis
- normalizar assinaturas, slots e movimentos relevantes
- manter a interface igual às demais redes

## Fora do escopo
- fallback automático entre providers em runtime
- persistência
- classificação de transações
