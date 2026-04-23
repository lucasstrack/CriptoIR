---
id: TASK-400
title: Cobertura de testes (v8) com threshold 80%
status: ready
wave: 4
depends_on: []
parallel_safe_with: [TASK-430]
owner_dev:
owner_reviewer:
branch: task/TASK-400-coverage
acceptance:
  - criterion: "Vitest usa `@vitest/coverage-v8` com threshold 80% em lines/functions/branches/statements"
    verify: "node -e \"const c=require('./vitest.config.mts.js')||require('./vitest.config.mts'); process.exit(0)\" || npx vitest --coverage --reporter=basic --run"
  - criterion: "`npm run test:coverage` existe e roda v8 gerando relatório"
    verify: "npm run test:coverage -- --reporter=basic"
  - criterion: "6 rotas de API têm pelo menos 1 teste caminho feliz + 1 caminho de erro em `tests/integration/`"
    verify: "npm run test -- tests/integration/"
  - criterion: "`npm run check` inclui `test:coverage` no pipeline e falha se threshold quebrar"
    verify: "npm run check"
  - criterion: "Suite completa continua verde"
    verify: "npm run test"
deliverables:
  - vitest.config.mts
  - package.json
  - package-lock.json
  - tests/integration/health-endpoint.test.ts
  - tests/integration/*-endpoint.test.ts (ajustes pontuais para fechar gaps)
---

# TASK-400 — Cobertura 80%

## Objetivo
Instrumentar cobertura de código via `@vitest/coverage-v8` e impor threshold de 80% para evitar regressão silenciosa nas rotas de API. CI local (`npm run check`) falha se cair abaixo.

## Escopo
- Adicionar devDep `@vitest/coverage-v8` (compatível com Vitest 4).
- Configurar `vitest.config.mts` com:
  - `coverage.provider: 'v8'`
  - `coverage.thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }`
  - `coverage.include: ['src/**/*.{ts,tsx}']`
  - `coverage.exclude: ['src/**/*.d.ts', 'src/app/layout.tsx', 'src/app/**/page.tsx', 'tests/**']` (páginas Next são server components triviais cobertas por E2E).
- Novo script `test:coverage` em `package.json`.
- Atualizar script `check` para incluir `test:coverage` no lugar de `test` — um só run com coverage ligada basta.
- Rodar coverage, identificar gaps, fechar com testes de integração faltantes:
  - `GET /api/health` (sem teste dedicado hoje).
  - Casos de erro 4xx/5xx em rotas que só testam caminho feliz.
- Quando threshold passar, commitar.

## Fora do escopo
- E2E coverage (fica em TASK-410).
- Coverage de UI components (já coberta em unitários das Ondas 3).
- Reorganizar estrutura de testes.

## Decisões a respeitar
- Threshold **80% uniforme** nas 4 métricas (lines/functions/branches/statements). Se uma rota individual ficar abaixo, resolver com testes focados — não diminuir o threshold.
- `health` pode ter caminho feliz só — erro 5xx aceita-se cobrir via test de dependency injection falha.
- Páginas Next (`app/**/page.tsx`) excluídas da contagem: são server components finos, cobertura real está nos componentes de `src/ui/features/` (unitários) e nos fluxos E2E (TASK-410).
- Nenhum literal novo em UI (esta task não toca UI).
