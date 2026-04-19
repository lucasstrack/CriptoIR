---
id: TASK-230
title: GET /api/holdings e GET /api/portfolio/history
status: in-review
wave: 2
depends_on: [TASK-200, TASK-120]
parallel_safe_with: [TASK-210, TASK-220]
owner_dev: claude-dev-agent
owner_reviewer:
branch: task/TASK-230-holdings-portfolio
acceptance:
  - criterion: "GET /api/holdings retorna posição atual por asset com amount, preço médio, valor atual USD e BRL"
    verify: "npm run test -- tests/integration/holdings-endpoint.test.ts"
  - criterion: "Preço médio calculado a partir das tx de aquisição (TRANSFER_IN/SWAP in) ignorando INTERNAL"
    verify: "npm run test -- tests/unit/holdings/average-cost.test.ts"
  - criterion: "GET /api/portfolio/history retorna série temporal a partir de PortfolioSnapshot"
    verify: "npm run test -- tests/integration/portfolio-history-endpoint.test.ts"
  - criterion: "Valores monetários sempre em string decimal; datas em ISO 8601 UTC"
    verify: "npm run test -- tests/integration/holdings-endpoint.test.ts"
  - criterion: "docs/02-api.md documenta os dois endpoints com payload e códigos de erro"
    verify: "grep -q 'GET /api/holdings' docs/02-api.md && grep -q 'GET /api/portfolio/history' docs/02-api.md"
deliverables:
  - src/app/api/holdings/route.ts
  - src/app/api/portfolio/history/route.ts
  - src/core/use-cases/compute-holdings.ts
  - src/core/use-cases/list-portfolio-history.ts
  - src/core/services/average-cost.ts
  - tests/unit/holdings/average-cost.test.ts
  - tests/integration/holdings-endpoint.test.ts
  - tests/integration/portfolio-history-endpoint.test.ts
  - docs/02-api.md
---

# TASK-230 — Holdings e histórico de patrimônio

## Objetivo
Agregar transações em posições atuais e expor a série histórica pré-computada para alimentar as telas de patrimônio e gráficos.

## Escopo
- holdings = soma de `(IN - OUT)` por `assetId` sobre Transactions confirmadas, excluindo INTERNAL e FEE no cálculo de quantidade
- preço médio ponderado por quantidade de aquisição (entradas positivas apenas)
- valor atual via PriceService (TASK-120) consultado no request — cacheável localmente em memória por minutos
- `/portfolio/history` apenas lê `PortfolioSnapshot`; retorna vazio se ainda não houver snapshot (job TASK-240)

## Fora do escopo
- cálculo on-the-fly do histórico (tudo vem do snapshot semanal)
- realized/unrealized P&L (backlog)
- holdings por wallet individual (holdings é global do usuário na v1)

## Decisões a respeitar
- Preço médio é contábil: não reseta após venda total (mantém referência para análise)
- Se PriceService falhar para um asset, retorna `valueUsd/valueBrl: null` em vez de derrubar o endpoint inteiro
