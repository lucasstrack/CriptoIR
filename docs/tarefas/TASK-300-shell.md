---
id: TASK-300
title: Shell da app (layout, navbar, toggle USD/BRL, providers)
status: ready
wave: 3
depends_on: [TASK-230]
parallel_safe_with: []
owner_dev: claude-dev-agent
owner_reviewer:
branch: task/TASK-300-shell
acceptance:
  - criterion: "Rota raiz `/` redireciona permanentemente para `/patrimonio`"
    verify: "npm run test -- tests/unit/app/root-redirect.test.ts"
  - criterion: "`(dashboard)/layout.tsx` renderiza navbar com links Patrimônio, Carteiras, Transações e toggle USD/BRL visível"
    verify: "npm run test -- tests/unit/ui/app-navbar.test.tsx"
  - criterion: "Toggle USD/BRL alterna o estado global e persiste em localStorage entre montagens"
    verify: "npm run test -- tests/unit/ui/currency-store.test.ts"
  - criterion: "`format-currency` formata BigInt/decimal string em USD e BRL corretamente, respeitando pt-BR"
    verify: "npm run test -- tests/unit/lib/format-currency.test.ts"
  - criterion: "`t(key)` retorna a string correspondente em pt-BR; chave inexistente dispara erro de tipo em build"
    verify: "npm run test -- tests/unit/lib/i18n.test.ts"
  - criterion: "TanStack Query disponível via `QueryProvider` client component montado no root layout"
    verify: "npm run test -- tests/unit/ui/query-provider.test.tsx"
  - criterion: "Suite completa continua verde (`npm run test`)"
    verify: "npm run test"
deliverables:
  - src/app/layout.tsx
  - src/app/page.tsx
  - src/app/(dashboard)/layout.tsx
  - src/ui/providers/query-provider.tsx
  - src/ui/components/app-navbar.tsx
  - src/ui/components/currency-toggle.tsx
  - src/ui/components/skeleton.tsx
  - src/ui/components/empty-state.tsx
  - src/ui/components/error-state.tsx
  - src/ui/stores/currency-store.ts
  - src/ui/hooks/use-currency.ts
  - src/lib/format-currency.ts
  - src/lib/i18n/messages.ts
  - src/lib/i18n/index.ts
  - tests/unit/app/root-redirect.test.ts
  - tests/unit/ui/app-navbar.test.tsx
  - tests/unit/ui/currency-store.test.ts
  - tests/unit/ui/query-provider.test.tsx
  - tests/unit/lib/format-currency.test.ts
  - tests/unit/lib/i18n.test.ts
  - package.json
  - docs/01-arquitetura.md
---

# TASK-300 — Shell da app

## Objetivo
Entregar a casca de UI compartilhada por toda a Onda 3: layout com navbar, providers globais (TanStack Query, toggle USD/BRL via Zustand), componentes reutilizáveis de estado (skeleton/empty/error) e infra de mensagens centralizadas para pt-BR com caminho pronto para i18n futuro.

## Escopo
- App Router: rota `/` → redirect permanente para `/patrimonio`. Landing atual (`src/app/page.tsx`) é substituída.
- Grupo `(dashboard)` com `layout.tsx` contendo navbar e container centralizado.
- Navbar reusável em `src/ui/components/app-navbar.tsx` com links para Patrimônio, Carteiras, Transações e toggle USD/BRL.
- Toggle USD/BRL: store Zustand em `src/ui/stores/currency-store.ts` com persistência em `localStorage` (chave `criptoir:currency`). Hook `useCurrency()` exporta `{ currency, setCurrency, toggle }`.
- `QueryProvider` client component em `src/ui/providers/query-provider.tsx`; `src/app/layout.tsx` o envolve em volta de `{children}`.
- Helpers reutilizáveis:
  - `src/lib/format-currency.ts` formata string decimal em BRL/USD usando `Intl.NumberFormat` com locale `pt-BR`.
  - `src/ui/components/skeleton.tsx`, `empty-state.tsx`, `error-state.tsx` — primitivas visuais padronizadas para todas as telas.
- i18n-ready:
  - `src/lib/i18n/messages.ts` exporta objeto `ptBR` com todas as strings da Onda 3 (nav, toggle, vazios, erros).
  - `src/lib/i18n/index.ts` exporta `t(key: keyof typeof ptBR): string` tipado — troca para next-intl/react-intl no futuro troca só o helper.
  - Nenhum componente literal fora desse arquivo.
- Instalação: `zustand`, `@tanstack/react-query`.
- Atualizar `docs/01-arquitetura.md` seção 5 (estrutura de pastas) com `src/ui/providers/`, `src/ui/stores/`, `src/lib/i18n/` e seção 10 mencionando TASK-300.

## Fora do escopo
- Infra completa de i18n com troca de idioma em runtime (só a estrutura para facilitar a troca futura).
- Autenticação (v1 é single-user local).
- Theming runtime (dark fica forçado como hoje).
- Conteúdo real de cada tela — Patrimônio, Carteiras, Transações ficam com placeholder "em construção" até 310/320/330 ligarem.

## Decisões a respeitar
- `/` redireciona para `/patrimonio` (home de valor, não de carteiras).
- Toggle USD/BRL é **global** e consumido por todas as telas via `useCurrency()` — nada de prop drilling.
- Nenhuma string pt-BR pode viver fora de `src/lib/i18n/messages.ts`. Literais em JSX/componentes são reprovados no review.
- Primitivos `skeleton`/`empty-state`/`error-state` são a única forma de renderizar esses estados nas próximas tasks — 310/320/330/340 **devem** consumi-los.
- `QueryProvider` usa `staleTime: 60_000` por padrão (preços não precisam de refresh agressivo).

## Progresso
- [ ] instalar zustand e @tanstack/react-query
- [ ] infra i18n (messages + helper t(key))
- [ ] format-currency helper + testes
- [ ] currency-store (zustand persist) + hook + testes
- [ ] query-provider + teste smoke
- [ ] primitivas skeleton/empty-state/error-state
- [ ] currency-toggle + app-navbar + teste
- [ ] dashboard layout + páginas placeholder
- [ ] root layout com QueryProvider + redirect / → /patrimonio + teste
- [ ] docs/01-arquitetura.md atualizado
- [ ] verify TASK-300 verde
