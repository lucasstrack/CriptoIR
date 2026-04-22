---
id: TASK-310
title: Tela Carteiras (CRUD + botão sincronizar)
status: done
wave: 3
depends_on: [TASK-300]
parallel_safe_with: [TASK-320, TASK-330]
owner_dev: claude-dev
owner_reviewer: claude-reviewer
branch: task/TASK-310-carteiras-ui
acceptance:
  - criterion: "Rota `/carteiras` lista wallets cadastradas com label, endereço truncado, rede e lastSyncedAt"
    verify: "npm run test -- tests/unit/features/wallets/wallet-list.test.tsx"
  - criterion: "Formulário de cadastro chama POST /api/wallets; sucesso fecha dialog e refetch invalida cache"
    verify: "npm run test -- tests/unit/features/wallets/wallet-form.test.tsx"
  - criterion: "Botão Sincronizar dispara POST /api/wallets/:id/sync e exibe estado pendente até resolver"
    verify: "npm run test -- tests/unit/features/wallets/use-sync-wallet.test.ts"
  - criterion: "Erros de validação/HTTP exibidos via `error-state` ou inline, usando mensagens de `src/lib/i18n/messages.ts`"
    verify: "npm run test -- tests/unit/features/wallets/wallet-form.test.tsx"
  - criterion: "Suite completa continua verde (`npm run test`)"
    verify: "npm run test"
deliverables:
  - src/app/(dashboard)/carteiras/page.tsx
  - src/ui/features/wallets/wallet-list.tsx
  - src/ui/features/wallets/wallet-row.tsx
  - src/ui/features/wallets/wallet-form.tsx
  - src/ui/features/wallets/use-wallets.ts
  - src/ui/features/wallets/use-create-wallet.ts
  - src/ui/features/wallets/use-sync-wallet.ts
  - src/ui/components/dialog.tsx
  - src/lib/api-client.ts
  - src/lib/i18n/messages.ts
  - tests/unit/features/wallets/wallet-list.test.tsx
  - tests/unit/features/wallets/wallet-form.test.tsx
  - tests/unit/features/wallets/use-sync-wallet.test.ts
  - tests/unit/lib/api-client.test.ts
---

# TASK-310 — Tela Carteiras

## Objetivo
Permitir que o usuário cadastre, liste e dispare sync manual das suas wallets direto pela UI, consumindo a API existente de `/api/wallets` e `/api/wallets/:id/sync`.

## Escopo
- Página `/carteiras` dentro de `(dashboard)`, com skeleton durante o fetch, empty-state quando não há wallets, e lista com `wallet-row` por item.
- `wallet-row.tsx`: label, endereço truncado (com tooltip ou copy), rede, data do último sync (ou "nunca sincronizado"), botão "Sincronizar".
- Dialog `dialog.tsx` (componente reutilizável em `src/ui/components/`) consumido por `wallet-form.tsx` para criar wallet.
- `wallet-form.tsx`: campos `label`, `address`, `network` (select BTC/ETH/BASE/ARB/SOL), validação Zod no submit, exibe erro inline se `VALIDATION_ERROR`/`INVALID_ADDRESS`/`WALLET_ALREADY_EXISTS`.
- Hooks em `src/ui/features/wallets/`:
  - `use-wallets.ts` — `useQuery` GET /api/wallets, chave `['wallets']`.
  - `use-create-wallet.ts` — `useMutation` POST /api/wallets, invalida `['wallets']`.
  - `use-sync-wallet.ts` — `useMutation` POST /api/wallets/:id/sync, invalida `['wallets']` no sucesso.
- `src/lib/api-client.ts`: wrapper `fetch` tipado que abre/valida o envelope `{ data, error, meta }` e propaga o `code` do erro. Usado por todas as features da Onda 3.
- Strings pt-BR todas em `src/lib/i18n/messages.ts` (nova seção `wallets`).

## Fora do escopo
- Editar/arquivar wallet (backlog — API ainda não suporta).
- Polling do resultado do sync (UI só dispara; usuário vê o efeito no próximo refetch da lista de transações).
- E2E Playwright (coberto em TASK-410).

## Decisões a respeitar
- Reusar `skeleton`, `empty-state`, `error-state` de TASK-300 — proibido reimplementar localmente.
- Reusar `useCurrency()` se algum valor monetário aparecer aqui (nenhum previsto, mas importar o hook mostra consistência).
- `api-client.ts` é o único ponto de `fetch` direto; hooks consomem o client, nunca `fetch` nu.
- Toda string visível ao usuário vem de `src/lib/i18n/messages.ts` (nenhum literal em JSX).
