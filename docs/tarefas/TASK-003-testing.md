---
id: TASK-003
title: Vitest + Playwright com exemplos rodando
status: done
wave: 0
depends_on: [TASK-000]
parallel_safe_with: [TASK-001, TASK-002]
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-003-testing
acceptance:
  - criterion: "vitest, @vitest/coverage-v8, @testing-library/react instalados em devDependencies"
    verify: "node -e \"const d=require('./package.json').devDependencies; for(const k of ['vitest','@testing-library/react']) if(!d[k]) process.exit(1)\""
  - criterion: "vitest.config.ts presente e aponta para tests/"
    verify: "grep -q 'tests' vitest.config.ts"
  - criterion: "playwright instalado e playwright.config.ts presente"
    verify: "test -f playwright.config.ts && node -e \"if(!require('./package.json').devDependencies['@playwright/test']) process.exit(1)\""
  - criterion: "ao menos 1 teste unit e 1 de integração passam"
    verify: "npm run test"
  - criterion: "npm run test:e2e não falha (pode skip se env não tem navegador)"
    verify: "npm run test:e2e -- --list"
deliverables:
  - vitest.config.ts
  - vitest.setup.ts
  - playwright.config.ts
  - tests/unit/sample.test.ts
  - tests/integration/sample.test.ts
  - tests/e2e/home.spec.ts
  - package.json (scripts: test, test:watch, test:coverage, test:e2e)
---

# TASK-003 — Testing stack

## Objetivo
Configurar Vitest (unit + integration) e Playwright (e2e) com exemplos mínimos verdes. Servirá de base para que toda task a partir da Onda 1 tenha cobertura de teste como critério de aceite.

## Passos sugeridos
1. `npm i -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom`
2. Criar `vitest.config.ts`:
   - `test.environment = 'jsdom'`
   - `test.setupFiles = ['./vitest.setup.ts']`
   - `test.include = ['tests/**/*.test.ts?(x)']`
   - alias `@` → `./src`
3. `vitest.setup.ts` importa `@testing-library/jest-dom`.
4. Criar `tests/unit/sample.test.ts`: `expect(1+1).toBe(2)`.
5. Criar `tests/integration/sample.test.ts`: importa uma função simples de `src/lib/` (crie `src/lib/utils.ts` se não existir; coopera com TASK-001 que já cria).
6. `npm init playwright@latest` — aceitar TypeScript, pasta `tests/e2e`.
7. `tests/e2e/home.spec.ts`: abre `/` e verifica que `h1` contém "CriptoIR".
8. Scripts no `package.json`:
   - `"test": "vitest run"`
   - `"test:watch": "vitest"`
   - `"test:coverage": "vitest run --coverage"`
   - `"test:e2e": "playwright test"`

## Observação
Se `src/lib/utils.ts` não existir (TASK-001 pode não ter rodado ainda), crie um util trivial para testar. Depois da integração, a task 001 adiciona o `cn()` helper por cima.
