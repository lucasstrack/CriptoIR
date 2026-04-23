---
id: TASK-320
title: Tela Transações (grid TanStack Table com filtros)
status: approved
wave: 3
depends_on: [TASK-300]
parallel_safe_with: [TASK-310, TASK-330]
owner_dev: claude-dev
owner_reviewer: claude-reviewer
branch: task/TASK-320-transacoes-ui
acceptance:
  - criterion: "Rota `/transacoes` renderiza grid TanStack Table v8 com colunas data, rede, tipo, asset, amount, wallet, hash"
    verify: "npm run test -- tests/unit/features/transactions/transactions-table.test.tsx"
  - criterion: "Filtros de data (from/to), rede, asset, wallet e tipo compõem a query enviada ao GET /api/transactions"
    verify: "npm run test -- tests/unit/features/transactions/transactions-filters.test.tsx"
  - criterion: "Paginação server-side respeita `meta.total` do envelope e controla page/pageSize"
    verify: "npm run test -- tests/unit/features/transactions/use-transactions.test.ts"
  - criterion: "Sort por timestamp asc/desc troca o parâmetro `sort` da query"
    verify: "npm run test -- tests/unit/features/transactions/use-transactions.test.ts"
  - criterion: "`data-table.tsx` é um componente genérico reusável (recebe `columns` e `data` via props) e tem teste próprio"
    verify: "npm run test -- tests/unit/ui/data-table.test.tsx"
  - criterion: "Suite completa continua verde (`npm run test`)"
    verify: "npm run test"
deliverables:
  - src/app/(dashboard)/transacoes/page.tsx
  - src/ui/components/data-table.tsx
  - src/ui/components/date-range-picker.tsx
  - src/ui/components/select.tsx
  - src/ui/features/transactions/transactions-table.tsx
  - src/ui/features/transactions/transactions-filters.tsx
  - src/ui/features/transactions/use-transactions.ts
  - src/ui/features/transactions/columns.tsx
  - src/lib/i18n/messages.ts
  - tests/unit/ui/data-table.test.tsx
  - tests/unit/features/transactions/transactions-table.test.tsx
  - tests/unit/features/transactions/transactions-filters.test.tsx
  - tests/unit/features/transactions/use-transactions.test.ts
  - package.json
---

# TASK-320 — Tela Transações

## Objetivo
Exibir as transações persistidas numa grid estilo Excel, com filtros, paginação e sort — consumindo `GET /api/transactions` (TASK-220).

## Escopo
- Instalar `@tanstack/react-table`.
- `data-table.tsx` genérico em `src/ui/components/`: recebe `ColumnDef<T>[]`, `data: T[]`, `meta?: { total, page, pageSize }`, callbacks `onPageChange`, `onSortChange`. **Reusável por outras telas que precisem de tabela.**
- `transactions-table.tsx`: compõe `data-table` com colunas de transação via `columns.tsx`. Colunas: timestamp (formatado pt-BR), rede, tipo (badge), asset, amount (string decimal alinhada à direita), wallet (label curto), hash (truncado com link para explorer).
- `transactions-filters.tsx`: form com `DateRangePicker` (range de timestamp), `Select` (rede), `Select` (tipo), `Select` (wallet — alimentado por `useWallets` de TASK-310; se 310 ainda não mergeado, usa fetch local temporário), input text para asset symbol.
- `use-transactions.ts`: `useQuery` que serializa os filtros atuais na query string, chave `['transactions', filters]`.
- `select.tsx` e `date-range-picker.tsx` como primitivas compartilhadas em `src/ui/components/` (não em `features/`).
- Todas as strings em `src/lib/i18n/messages.ts` (nova seção `transactions`).

## Fora do escopo
- Exportar CSV/XLSX (Onda 5 backlog).
- Editar transação na UI (fora do modelo — dados são read-only no grid).
- Detalhe de transação em modal (backlog de UX).

## Decisões a respeitar
- `data-table` fica em `src/ui/components/`, não em `src/ui/features/transactions/`, porque é reutilizável.
- Paginação **server-side**: nunca chamar `getPaginationRowModel` sobre o dataset inteiro. A tabela só recebe a página corrente.
- Wallet select precisa funcionar mesmo se TASK-310 não estiver mergeada: consumir `GET /api/wallets` direto via `api-client.ts`.
- Reusar `skeleton`, `empty-state`, `error-state` de TASK-300.
- Nenhum literal em JSX; tudo via `t('transactions.xxx')`.
