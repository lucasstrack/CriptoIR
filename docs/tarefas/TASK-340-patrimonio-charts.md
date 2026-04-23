---
id: TASK-340
title: Gráficos de patrimônio (evolução semanal + breakdown)
status: in-review
wave: 3
depends_on: [TASK-330]
parallel_safe_with: []
owner_dev: claude-dev
owner_reviewer:
branch: task/TASK-340-patrimonio-charts
acceptance:
  - criterion: "Seção de gráficos renderiza gráfico de linha com evolução semanal (weekStart x total) consumindo GET /api/portfolio/history"
    verify: "npm run test -- tests/unit/features/portfolio/line-chart-history.test.tsx"
  - criterion: "Gráfico de pizza/donut mostra breakdown por asset (percentual do total atual) consumindo GET /api/holdings"
    verify: "npm run test -- tests/unit/features/portfolio/breakdown-donut.test.tsx"
  - criterion: "Ambos os gráficos respeitam toggle USD/BRL e re-renderizam ao alternar"
    verify: "npm run test -- tests/unit/features/portfolio/line-chart-history.test.tsx"
  - criterion: "Quando `/api/portfolio/history` retorna vazio, exibe `empty-state` com mensagem dedicada (sem snapshot ainda)"
    verify: "npm run test -- tests/unit/features/portfolio/line-chart-history.test.tsx"
  - criterion: "Suite completa continua verde (`npm run test`)"
    verify: "npm run test"
deliverables:
  - src/app/(dashboard)/patrimonio/page.tsx
  - src/ui/features/portfolio/line-chart-history.tsx
  - src/ui/features/portfolio/breakdown-donut.tsx
  - src/ui/features/portfolio/use-portfolio-history.ts
  - src/ui/components/chart-container.tsx
  - src/lib/i18n/messages.ts
  - tests/unit/features/portfolio/line-chart-history.test.tsx
  - tests/unit/features/portfolio/breakdown-donut.test.tsx
  - tests/unit/features/portfolio/use-portfolio-history.test.ts
  - package.json
---

# TASK-340 — Gráficos de patrimônio

## Objetivo
Completar a tela `/patrimonio` (TASK-330) com a seção de visualização: evolução semanal do patrimônio e breakdown percentual por asset.

## Escopo
- Instalar `recharts`.
- `chart-container.tsx` em `src/ui/components/`: wrapper padronizado com título, subtítulo, estado loading/empty/error, altura fixa, paleta consistente com o tema dark. **Reusável por outras visualizações futuras.**
- `line-chart-history.tsx`: gráfico de linha em Recharts consumindo `use-portfolio-history.ts` (GET /api/portfolio/history). Eixo X = `weekStart` (formatado `dd/MM` pt-BR); eixo Y = `totalUsd` ou `totalBrl` conforme toggle. Tooltip mostra valor formatado com `formatCurrency`.
- `breakdown-donut.tsx`: gráfico donut/pizza consumindo `useHoldings` (de TASK-330, via `src/ui/features/portfolio/use-holdings.ts`). Fatia = valor (USD/BRL). Legenda com símbolo + percentual.
- Editar `src/app/(dashboard)/patrimonio/page.tsx` (deliverable também da TASK-330) **apenas para injetar** `<LineChartHistory />` e `<BreakdownDonut />` na seção reservada por 330. Não alterar `<TotalSummary />` nem `<HoldingsTable />`.
- Strings em `src/lib/i18n/messages.ts` (estende seção `portfolio`).

## Fora do escopo
- Gráfico de evolução diária (só semanal; só temos snapshot semanal em v1).
- Drilldown por wallet (v1 é global).
- Export de imagem/CSV do gráfico.

## Decisões a respeitar
- Toggle USD/BRL via `useCurrency()`; gráfico re-renderiza via query key ou via useMemo dependente de `currency`.
- Recharts configurado em modo responsivo (`ResponsiveContainer`) com altura via `chart-container`.
- Reusar `empty-state` e `error-state` de TASK-300.
- Paleta de cores centralizada (definir `src/ui/components/chart-container.tsx` com constante `CHART_COLORS`) para consistência entre linha e donut.
- Nenhum literal em JSX; tudo via `t('portfolio.charts.xxx')`.
