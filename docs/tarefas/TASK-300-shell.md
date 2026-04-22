---
id: TASK-300
title: Shell da app (layout, navbar, toggle USD/BRL, providers)
status: ready
wave: 3
depends_on: [TASK-230]
parallel_safe_with: []
owner_dev: claude-dev-agent
owner_reviewer: claude-reviewer-agent
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
  - src/app/(dashboard)/carteiras/page.tsx
  - src/app/(dashboard)/patrimonio/page.tsx
  - src/app/(dashboard)/transacoes/page.tsx
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
  - package-lock.json
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
- [x] instalar zustand e @tanstack/react-query
- [x] infra i18n (messages + helper t(key))
- [x] format-currency helper + testes
- [x] currency-store (zustand persist) + hook + testes
- [x] query-provider + teste smoke
- [x] primitivas skeleton/empty-state/error-state
- [x] currency-toggle + app-navbar + teste
- [x] dashboard layout + páginas placeholder
- [x] root layout com QueryProvider + redirect / → /patrimonio + teste
- [x] docs/01-arquitetura.md atualizado
- [x] verify TASK-300 verde

## Review — changes requested

Testes rodados no worktree limpo (`DATABASE_URL="file:./dev.db"` exportado para integração): **26 arquivos, 95 testes — todos verdes**. `npm run lint` e `npm run typecheck` também passaram. `orch:verify TASK-300` todos OK. O erro de tipo em `t('chave.inexistente')` foi validado manualmente (TS2345). Apesar disso, duas regras invioláveis/de spec estão violadas — por isso `changes-requested`.

### Bloqueantes

1. **Arquivos fora de `deliverables` — viola Regra 1 do fluxo (`docs/04-fluxo-multi-agente.md:63`: "Commit tocando código fora de `deliverables` é automaticamente reprovado pelo reviewer").**
   Arquivos criados/modificados que não estão na lista `deliverables` do front-matter:
   - `src/app/(dashboard)/carteiras/page.tsx`
   - `src/app/(dashboard)/patrimonio/page.tsx`
   - `src/app/(dashboard)/transacoes/page.tsx`
   - `package-lock.json` (gerado por `npm install` de `zustand` e `@tanstack/react-query`)

   **Correção esperada:** adicionar esses quatro caminhos à lista `deliverables` no front-matter desta task. As páginas placeholder estão corretas em conteúdo (consomem `EmptyState` + `t(key)`) e o `package-lock.json` é consequência esperada do `Escopo > Instalação`; o problema é só a omissão na declaração.

2. **String pt-BR literal fora de `src/lib/i18n/messages.ts` — viola "Decisões a respeitar" (`docs/tarefas/TASK-300-shell.md:81`) e a regra do prompt de review.**
   `src/ui/components/app-navbar.tsx:37` tem `<nav aria-label="Principal">`. `aria-label` é exposto a leitores de tela (conteúdo visível ao usuário) e está hardcoded em pt-BR fora do dicionário.

   **Correção esperada:** adicionar uma chave ao dicionário (ex.: `'nav.aria.primary': 'Navegação principal'`) e trocar para `aria-label={t('nav.aria.primary')}`.

### Não-bloqueantes (backlog, corrigir se quiser junto)

- `[backlog]` `src/ui/components/skeleton.tsx` e `empty-state.tsx` usam classes `bg-muted`, `bg-card`, `text-muted-foreground`, `border-border`, `text-destructive` etc. que não estão declaradas em `globals.css` nem na config do Tailwind versionada. A renderização atual funciona visualmente porque cai em defaults do Tailwind v4, mas o contrato de tema fica implícito — vale formalizar os tokens de design (variáveis CSS + `@theme`) para as tasks 310/320/330 não herdarem um shell com tema "fantasma".
- `[backlog]` `tests/unit/ui/currency-store.test.ts:38` usa `await Promise.resolve()` como tick para persistência; hoje funciona, mas se o middleware mudar para async real (ex.: IndexedDB adapter) o teste pode ficar flaky — vale considerar `await useCurrencyStore.persist.hasHydrated()` ou um utilitário dedicado.
- `[backlog]` `src/app/page.tsx` retorna `never` e chama `permanentRedirect` — correto, mas vale um `// eslint-disable-next-line` explícito ou um comentário maior explicando o porquê para quem for mexer depois (o `never` confunde).
- `[backlog]` `CurrencyToggle` duplica markup entre USD/BRL. Não é incorreto, mas conforme mais moedas forem suportadas (ou o par virar 3+ opções) vale extrair para um array + map como `AppNavbar` já faz.

### Pontos positivos

- Primitivas `Skeleton`/`EmptyState`/`ErrorState` desenhadas como genéricas de verdade: nada de cópia hardcoded, props tipados com interfaces claras, `data-slot` para estilização externa.
- `QueryProvider` instancia o client uma única vez via `useState(() => new QueryClient(...))` — atende o critério "não recriar por render".
- `currency-store` trata SSR com storage no-op, evitando o `window is not defined` clássico do zustand persist em Next.
- Testes do `currency-store` isolam com `window.localStorage.clear()` + `setState` reset — cobrem persistência, hidratação, toggle e `setCurrency` sem vazamento entre casos.
- `formatCurrency` preserva precisão para `bigint` e string decimal sem converter para `number`, com sanitização regex e fallback `'-'` em vez de `NaN` na tela.
- `t(key)` tipado via `MessageKey`: confirmado que `tsc --noEmit` falha em chave inexistente (TS2345).
- `docs/01-arquitetura.md` seção 5 cita `src/ui/providers/`, `src/ui/stores/`, `src/lib/i18n/` e seção 10 detalha a TASK-300 corretamente.
