---
id: TASK-430
title: ADRs retrospectivos (decisões Ondas 0–3)
status: ready
wave: 4
depends_on: []
parallel_safe_with: [TASK-400]
owner_dev:
owner_reviewer:
branch: task/TASK-430-adrs
acceptance:
  - criterion: "`docs/decisoes/README.md` existe listando todas as ADRs com título + status + data"
    verify: "test -f docs/decisoes/README.md && grep -q '0001-stack-inicial' docs/decisoes/README.md"
  - criterion: "Pelo menos 6 ADRs retrospectivos novos (0002–0007+) em `docs/decisoes/` cobrindo: envelope API, orquestrador multi-agente, toggle USD/BRL via Zustand, api-client único ponto de fetch, TanStack Table server-side, paleta CHART_COLORS"
    verify: "test $(ls docs/decisoes/000[2-9]-*.md 2>/dev/null | wc -l) -ge 6"
  - criterion: "Cada ADR segue formato Nygard: seções Contexto, Decisão, Consequências, Status, e campo Data no frontmatter"
    verify: "for f in docs/decisoes/000[2-9]-*.md; do grep -q '## Contexto' \"$f\" && grep -q '## Decisão' \"$f\" && grep -q '## Consequências' \"$f\" && grep -q '## Status' \"$f\" || exit 1; done"
  - criterion: "Suite continua verde"
    verify: "npm run test"
deliverables:
  - docs/decisoes/README.md
  - docs/decisoes/0002-envelope-api.md
  - docs/decisoes/0003-orquestrador-multi-agente.md
  - docs/decisoes/0004-toggle-usd-brl-zustand.md
  - docs/decisoes/0005-api-client-unico-ponto-fetch.md
  - docs/decisoes/0006-tanstack-table-server-side.md
  - docs/decisoes/0007-paleta-chart-colors.md
---

# TASK-430 — ADRs retrospectivos

## Objetivo
Consolidar no formato ADR (Architecture Decision Record, estilo Nygard) as decisões técnicas relevantes das Ondas 0–3 que hoje existem só em commits ou memórias do orquestrador. Retrospectivos, mas datados com base no `git log` do primeiro commit que aplicou a decisão.

## Escopo

### ADRs novos (mínimo 6)

1. **0002 — Envelope de API `{ data, error, meta }`**
   - Contexto: consistência entre 10+ rotas de API; erro precisa transportar `code` para o frontend ramificar (ex.: `WALLET_ALREADY_EXISTS`).
   - Decisão: toda rota retorna `{ data, error, meta }` via `ok()` e `err()` de `src/lib/api-response.ts`.
   - Consequências: UI depende disso; `api-client.ts` abre o envelope e lança `ApiClientError` preservando `code`.

2. **0003 — Orquestrador multi-agente local**
   - Contexto: sessão Claude isolada, tasks longas, necessidade de Dev + Reviewer.
   - Decisão: scripts `tools/orchestrator/{list,pick,verify,review}.ts` + task files em `docs/tarefas/` com frontmatter.
   - Consequências: trabalho delegável; `orch:verify` é gate objetivo; Reviewer é outra sessão (humana ou subagente).

3. **0004 — Toggle USD/BRL via Zustand (`useCurrencyStore`)**
   - Contexto: Onda 3 precisava estado global de moeda acessível por múltiplas features sem prop drilling.
   - Decisão: Zustand store simples (`src/ui/stores/currency-store.ts`) + hook `useCurrency()` em `src/ui/hooks/`.
   - Consequências: formatCurrency recebe `currency` como arg; features leem do hook; testes setam via `useCurrencyStore.setState`.

4. **0005 — `api-client.ts` como único ponto de `fetch` na UI**
   - Contexto: hooks espalhavam `fetch` nu; difícil tratar envelope + código de erro centralizado.
   - Decisão: hooks consomem `apiClient<T>()`; `fetch` direto só dentro dele.
   - Consequências: trivial interceptar no E2E (cassettes); uniforme para `ApiClientError`.

5. **0006 — TanStack Table com paginação/sort server-side**
   - Contexto: dataset de transações pode ser grande; paginação client-side puxaria tudo.
   - Decisão: `data-table.tsx` usa `manualPagination` + `manualSorting`; backend decide.
   - Consequências: componente recebe só a página corrente; pai controla state; reusável para outras telas.

6. **0007 — Paleta `CHART_COLORS` centralizada**
   - Contexto: Recharts aceita cores por fatia/série; se cada gráfico escolher, visual fica inconsistente.
   - Decisão: `CHART_COLORS` exportada de `src/ui/components/chart-container.tsx` (array HSL coerente com tema dark).
   - Consequências: linha e donut compartilham paleta; futuras visualizações consomem o mesmo array.

### Index `docs/decisoes/README.md`
Tabela com `Número | Título | Status | Data | Link`, cobrindo o 0001 existente + os 6+ novos.

## Fora do escopo
- Rewrite do `0001-stack-inicial.md` (já existe, deixar).
- ADRs de decisões futuras (Onda 4/5) — entrar quando a decisão for tomada.
- ADRs "menores" tipo formato de commit message (convenção, não decisão arquitetural).

## Decisões a respeitar
- Formato **Nygard**: `## Contexto`, `## Decisão`, `## Consequências`, `## Status`. Frontmatter mínimo: `number`, `title`, `status` (Accepted/Deprecated/Superseded), `date`.
- Data real (encontrada via `git log -S <string chave>` ou `git log --diff-filter=A -- <arquivo>`).
- Linguagem: pt-BR, igual ao resto do projeto.
- ADRs **não** devem duplicar docs existentes (`docs/01-arquitetura.md`); devem complementar com o **porquê** das decisões que lá só têm o **o quê**.
