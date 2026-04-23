---
id: TASK-420
title: README pós-MVP + CONTRIBUTING
status: ready
wave: 4
depends_on: [TASK-400, TASK-410, TASK-430]
parallel_safe_with: []
owner_dev:
owner_reviewer:
branch: task/TASK-420-readme
acceptance:
  - criterion: "README.md descreve estado pós-Onda 3 (5 telas + API + jobs) com seções Overview, Stack, Quick start, Scripts, Arquitetura, Workflow"
    verify: "grep -q 'Quick start' README.md && grep -q 'Arquitetura' README.md && grep -q 'Workflow' README.md"
  - criterion: "README remove referência a 'Onda 0 concluída' e reflete ondas 0–3 fechadas + Onda 4 em andamento"
    verify: "! grep -q 'Onda 0 concluída' README.md"
  - criterion: "CONTRIBUTING.md existe com fluxo multi-agente (Dev → Reviewer → merge) e comandos `orch:list|pick|verify|review`"
    verify: "grep -q 'orch:list' CONTRIBUTING.md && grep -q 'Reviewer' CONTRIBUTING.md"
  - criterion: "README menciona `.env.example` + `.env.e2e.example` com apontamento de quais chaves são obrigatórias vs opcionais"
    verify: "grep -q '.env.example' README.md && grep -q '.env.e2e.example' README.md"
  - criterion: "CONTRIBUTING explica como regravar cassettes E2E (`npm run e2e:record`) e quando fazer isso"
    verify: "grep -q 'e2e:record' CONTRIBUTING.md"
  - criterion: "Suite continua verde"
    verify: "npm run test"
deliverables:
  - README.md
  - CONTRIBUTING.md
---

# TASK-420 — README + CONTRIBUTING

## Objetivo
Documentar o projeto pós-MVP para que outra pessoa consiga rodar local em <15min e contribuir seguindo o fluxo multi-agente.

## Escopo

### README.md (reescrita)
- **Overview** (2 parágrafos): o que é, pra quem, por que local/single-user.
- **Stack** (tabela): Next 16, React 19, Tailwind v3, Prisma + SQLite, TanStack Table, Recharts, Vitest, Playwright.
- **Quick start**: requisitos (Node 20+), `npm install`, `cp .env.example .env.local`, `npm run db:migrate`, `npm run dev`.
- **Scripts** (tabela): `dev`, `build`, `test`, `test:coverage`, `test:e2e`, `check`, `orch:*`, `snapshot`, `e2e:record`.
- **Arquitetura** (breve): link para `docs/01-arquitetura.md`. Listar camadas (`core/infra/lib/ui`) em uma linha cada.
- **Estado atual**: ondas 0–3 fechadas, Onda 4 em andamento (link pro roadmap).
- **Variáveis de ambiente**: tabela de chaves, qual é obrigatória (`DATABASE_URL`), quais opcionais (providers), e quais só são necessárias para regravar cassettes E2E (`ALCHEMY_API_KEY` etc. em `.env.e2e.local`).

### CONTRIBUTING.md (novo)
- **Fluxo multi-agente**: bullets simples (criar task file → `orch:pick` → Dev implementa → `orch:verify` → commit `feat(onda-N): TASK-XXX ...` → Reviewer → approved → merge `--no-ff` → chore done).
- **Convenções**: strings de UI em `src/lib/i18n/messages.ts`; `api-client` único ponto de fetch; reusar componentes compartilhados; TypeScript strict.
- **Testes**: como escrever unit vs integration vs E2E; fluxo de regravar cassettes (`npm run e2e:record` exige chaves em `.env.e2e.local`, roda quando schema de provider mudar).
- **ADRs**: quando criar, formato em `docs/decisoes/`.

## Fora do escopo
- Screenshots (deixa para quando UI estabilizar mais).
- Tradução para inglês (projeto é pt-BR internamente).
- CLA / licença (já existe `LICENSE` no repo).

## Decisões a respeitar
- README em **pt-BR** (consistente com o resto do projeto).
- CONTRIBUTING também em pt-BR.
- Nenhum link para URL externa inventada — só links relativos (`docs/...`) ou URLs que já estão no projeto.
- Código em blocos com linguagem explícita (```bash, ```ts) — Prettier está desabilitado em `docs/` então markdown precisa estar manualmente bem formatado.
