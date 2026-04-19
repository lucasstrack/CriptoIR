---
id: TASK-240
title: Job semanal de PortfolioSnapshot
status: in-progress
wave: 2
depends_on: [TASK-230]
parallel_safe_with: []
owner_dev: claude-dev-agent
owner_reviewer:
branch: task/TASK-240-portfolio-snapshot
acceptance:
  - criterion: "Job roda toda semana (domingo 00:00 UTC) e grava um PortfolioSnapshot com totalUsd, totalBrl e breakdown por asset"
    verify: "npm run test -- tests/unit/jobs/portfolio-snapshot.test.ts"
  - criterion: "Execução manual via script idempotente grava no máximo 1 snapshot por weekStart (upsert pelo índice único)"
    verify: "npm run test -- tests/integration/portfolio-snapshot.test.ts"
  - criterion: "Breakdown é JSON válido com o schema [{ assetId, amount, valueUsd, valueBrl }]"
    verify: "npm run test -- tests/integration/portfolio-snapshot.test.ts"
  - criterion: "Script manual npm run snapshot permite backfill de semanas passadas a partir de PriceSnapshot histórico"
    verify: "test -f scripts/portfolio-snapshot.ts"
deliverables:
  - src/infra/jobs/portfolio-snapshot-cron.ts
  - src/core/use-cases/record-portfolio-snapshot.ts
  - scripts/portfolio-snapshot.ts
  - tests/unit/jobs/portfolio-snapshot.test.ts
  - tests/integration/portfolio-snapshot.test.ts
  - docs/01-arquitetura.md
---

# TASK-240 — Snapshot semanal de patrimônio

## Objetivo
Materializar o histórico de patrimônio semanalmente para que `/api/portfolio/history` (TASK-230) responda em O(n) sobre a série pré-computada, sem recalcular holdings a cada request.

## Escopo
- cron expression `0 0 * * 0` (domingo 00:00 UTC), configurável por env `SNAPSHOT_CRON_EXPR`
- reutiliza `computeHoldings` (TASK-230) para consistência com o endpoint
- script manual `scripts/portfolio-snapshot.ts` aceita `--week=YYYY-MM-DD` para backfill
- idempotência via índice único em `weekStart`

## Fora do escopo
- snapshots diários (semanal é suficiente p/ v1)
- retenção / poda de snapshots antigos (backlog)
- notificação no final da execução

## Decisões a respeitar
- Backfill usa `PriceSnapshot` histórico (não o preço de agora) — se não houver preço daquela data, o asset entra no breakdown com `valueUsd/valueBrl: null`
- Job registra falhas no `SyncLog` ou em log estruturado, nunca engole silenciosamente
