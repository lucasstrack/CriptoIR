---
id: TASK-006
title: Script npm run check (lint + typecheck + test + build)
status: done
wave: 0
depends_on: [TASK-000, TASK-001, TASK-002, TASK-003, TASK-004]
parallel_safe_with: []
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-006-ci-local
acceptance:
  - criterion: "npm run check executa lint, typecheck, test unit/integration e build em sequência e retorna 0"
    verify: "npm run check"
  - criterion: "npm run check:providers existe (mesmo que stub) e retorna 0 quando .env.local não tem chaves (skip com warning)"
    verify: "npm run check:providers"
  - criterion: "README.md menciona npm run check como comando principal de validação"
    verify: "grep -q 'npm run check' README.md"
deliverables:
  - package.json (scripts check e check:providers)
  - scripts/check-providers.ts
  - README.md (seção de desenvolvimento atualizada)
---

# TASK-006 — CI local

## Objetivo
Oferecer um comando único `npm run check` que é a fronteira de qualidade: se passa verde, a task está pronta para review.

## Scripts
```json
{
  "check": "npm run lint && npm run typecheck && npm run test && npm run build",
  "typecheck": "tsc --noEmit",
  "check:providers": "tsx scripts/check-providers.ts"
}
```

`scripts/check-providers.ts`:
- Lê `.env.local` (se não existir, warning "sem chaves configuradas — pulando" e exit 0).
- Para cada chave presente, faz 1 chamada mínima (ex: Alchemy `eth_blockNumber`, Helius `getSlot`, CoinGecko `/ping`).
- Imprime ✓/✗ por provider. Exit 0 mesmo se algum faltou (avisa). Exit 1 só se uma chave está presente e falhou a chamada.

## README
Adicionar seção "Como contribuir" com:
```
npm install
cp .env.example .env.local
npm run db:migrate
npm run check       # antes de todo commit
npm run check:providers  # opcional — confirma que suas chaves estão ok
```
