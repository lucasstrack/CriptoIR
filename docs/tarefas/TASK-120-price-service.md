---
id: TASK-120
title: PriceService (CoinGecko USD e BRL)
status: done
wave: 1
depends_on: [TASK-000, TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006]
parallel_safe_with: [TASK-110, TASK-111, TASK-112, TASK-130]
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-120-price-service
acceptance:
  - criterion: "PriceService consulta CoinGecko e retorna USD e BRL"
    verify: "npm run test -- tests/unit/prices/price-service.test.ts"
  - criterion: "Servico suporta uso com e sem COINGECKO_KEY"
    verify: "npm run test -- tests/unit/prices/price-service.test.ts"
  - criterion: "Mapeamento de coingeckoId por asset esta centralizado"
    verify: "test -f src/infra/prices/coingecko-asset-map.ts"
deliverables:
  - src/core/services/price-service.ts
  - src/infra/prices/coingecko-client.ts
  - src/infra/prices/coingecko-asset-map.ts
  - tests/unit/prices/price-service.test.ts
  - docs/01-arquitetura.md
---

# TASK-120 — PriceService

## Objetivo
Criar o serviço de preços para alimentar custo médio, patrimônio atual e snapshots futuros.

## Escopo
- preço atual em USD e BRL
- integração com CoinGecko
- preparação para snapshots no banco em ondas futuras

## Fora do escopo
- cálculo de holdings
- histórico semanal
- endpoints públicos de preço
