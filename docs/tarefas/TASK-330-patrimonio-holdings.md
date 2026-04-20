---
id: TASK-330
title: Tela Patrimônio (holdings + total consolidado)
status: ready
wave: 3
depends_on: [TASK-300]
parallel_safe_with: [TASK-310, TASK-320]
owner_dev:
owner_reviewer:
branch: task/TASK-330-patrimonio-holdings
acceptance:
  - criterion: "Rota `/patrimonio` mostra total consolidado (soma de valueUsd/valueBrl) no topo respeitando toggle USD/BRL"
    verify: "npm run test -- tests/unit/features/portfolio/total-summary.test.tsx"
  - criterion: "Tabela de holdings lista cada asset com amount, preço médio, preço atual e valor atual; respeita toggle USD/BRL"
    verify: "npm run test -- tests/unit/features/portfolio/holdings-table.test.tsx"
  - criterion: "Assets com preço atual null exibem placeholder (ex.: `—`) no lugar dos valores, sem quebrar o render"
    verify: "npm run test -- tests/unit/features/portfolio/holdings-table.test.tsx"
  - criterion: "Linha total consolida por rede quando aplicável (groupBy network secundário) além do total geral"
    verify: "npm run test -- tests/unit/features/portfolio/total-summary.test.tsx"
  - criterion: "Suite completa continua verde (`npm run test`)"
    verify: "npm run test"
deliverables:
  - src/app/(dashboard)/patrimonio/page.tsx
  - src/ui/features/portfolio/holdings-table.tsx
  - src/ui/features/portfolio/total-summary.tsx
  - src/ui/features/portfolio/use-holdings.ts
  - src/lib/i18n/messages.ts
  - tests/unit/features/portfolio/holdings-table.test.tsx
  - tests/unit/features/portfolio/total-summary.test.tsx
  - tests/unit/features/portfolio/use-holdings.test.ts
---

# TASK-330 — Tela Patrimônio (holdings)

## Objetivo
Mostrar a posição atual consolidada do usuário: total em USD ou BRL (toggle global) e detalhamento por asset, consumindo `GET /api/holdings` (TASK-230).

## Escopo
- Página `/patrimonio` (a rota-home do app, para onde `/` redireciona).
- `total-summary.tsx`: cartão grande no topo com **total consolidado** (soma de `valueUsd` ou `valueBrl` dependendo do toggle). Também mostra total por rede (agrupando `asset.network`), em cards menores abaixo.
- `holdings-table.tsx`: tabela com colunas asset (symbol + network badge), amount, preço médio, preço atual, valor atual. Ordena por `valueUsd`/`valueBrl` descendente por padrão.
- Quando `priceUsd`/`priceBrl` é `null`, a linha renderiza `—` nos campos de preço/valor e mantém o amount. O total consolidado soma só assets com preço.
- `use-holdings.ts`: `useQuery` GET /api/holdings, chave `['holdings']`.
- Página compõe `<TotalSummary />` em cima e `<HoldingsTable />` abaixo. **Deixa espaço/slot explícito abaixo para a seção de gráficos de TASK-340** (ex.: `<section id="charts" />` vazia ou comentário indicando onde 340 injeta).
- Strings em `src/lib/i18n/messages.ts` (nova seção `portfolio`).

## Fora do escopo
- Gráficos (TASK-340 no mesmo `page.tsx`, após este).
- Holdings por wallet (v1 é global).
- Realized/unrealized P&L (backlog).

## Decisões a respeitar
- Toggle USD/BRL via `useCurrency()`; jamais ler do localStorage direto.
- Formatar valores com `formatCurrency` de TASK-300 (nunca `toFixed()` ad-hoc).
- Reusar `skeleton`/`empty-state`/`error-state` de TASK-300.
- Nenhum literal em JSX; tudo via `t('portfolio.xxx')`.
- Consolidação por rede ignora `asset.network` ausente (defensivo).
