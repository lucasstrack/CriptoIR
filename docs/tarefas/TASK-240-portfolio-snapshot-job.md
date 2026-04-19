---
id: TASK-240
title: Job semanal de PortfolioSnapshot
status: approved
wave: 2
depends_on: [TASK-230]
parallel_safe_with: []
owner_dev: claude-dev-agent
owner_reviewer: claude-reviewer-agent
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

## Review

Revisão independente executada em worktree limpa a partir do commit `7585945`, com `npm ci` fresh (670 pacotes instalados).

### Escopo do diff
- `git diff --name-only main...HEAD` confirma somente deliverables declarados (7 arquivos): `src/core/use-cases/record-portfolio-snapshot.ts`, `src/infra/jobs/portfolio-snapshot-cron.ts`, `scripts/portfolio-snapshot.ts`, `tests/unit/jobs/portfolio-snapshot.test.ts`, `tests/integration/portfolio-snapshot.test.ts`, `docs/01-arquitetura.md`, `docs/tarefas/TASK-240-portfolio-snapshot-job.md`. Nenhum arquivo fora do escopo.
- `git diff --stat main...HEAD`: 986 inserções, 3 deleções.

### Resultados dos comandos
- `npm ci`: OK (670 pacotes, 0 vulnerabilidades).
- `npm run orch:verify TASK-240`: todos os 4 critérios **OK** (com `DATABASE_URL="file:./dev.db"` via env, já que o repo não tem `.env` commitado; o bootstrap `f511313` resolve DATABASE_URL em cascata de `.env`/`.env.local`/`process.env`).
- `npm run lint`: OK.
- `npm run typecheck`: OK.
- `npm run test` (suíte completa): **70 testes passam em 20 arquivos**, incluindo as suítes anteriores de Ondas 0/1/2.

### Itens verificados manualmente
- `normalizeToWeekStartUTC` trunca para 00:00 UTC e recua para o domingo anterior usando `getUTCDay()` — matematicamente correto (testado para domingo, quarta e sábado).
- `RecordPortfolioSnapshotUseCase.execute` faz upsert por `weekStart` (índice único), retorna `created: false` no reexecute (teste integração confirma `count === 1` após 2 chamadas).
- Assets sem preço entram no breakdown com `valueUsd/valueBrl: null`; totais somam só entradas com preço (teste `backfill usa PriceSnapshot historico`).
- Transações `INTERNAL`, `SELF` e `FEE` são ignoradas; saldo ≤ 0 sai do breakdown; apenas `CONFIRMED` com `timestamp <= weekStart`.
- `portfolio-snapshot-cron.ts`: expressão default `0 0 * * 0`, validada via `cron.validate`, aceita `cronExpr` override, erros caem em `logger.error` com mensagem estruturada e retornam `status: 'error'` em vez de propagar exceção.
- `scripts/portfolio-snapshot.ts`: parsing de `--week=YYYY-MM-DD` com validação de `Number.isNaN`, `--help` documentando uso, default `--week` presente ⇒ `useHistoricalPrice=true`; saída JSON utilizável (`weekStart`, totais, `breakdownSize`, `created`, `mode`).
- `docs/01-arquitetura.md` (seção 5) menciona o job, o script, a env `SNAPSHOT_CRON_EXPR` e referencia os arquivos corretos; a árvore em `scripts/` também menciona `portfolio-snapshot.ts`.

### Observações (não bloqueantes)
- Não há script `snapshot` em `package.json`, mas o verify exige apenas `test -f scripts/portfolio-snapshot.ts`; o arquivo é executável via `npx tsx scripts/portfolio-snapshot.ts` (verificado `--help`).
- O `createPortfolioSnapshotCron` aceita `cronExpr` como opção, mas `src/infra/jobs/index.ts` ainda não registra o cron no startup. Como `src/infra/jobs/index.ts` não é deliverable desta task, fica como melhoria incremental — o módulo já expõe a API completa para consumi-lo.

### Veredito
**Approved**. Todos os critérios de aceite passam, suite completa verde, deliverables limpos e código consistente com as decisões declaradas.
