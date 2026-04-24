---
id: TASK-410
title: E2E Playwright com seed real + provider cassettes
status: ready
wave: 4
depends_on: [TASK-400]
parallel_safe_with: []
owner_dev:
owner_reviewer:
branch: task/TASK-410-e2e-playwright
acceptance:
  - criterion: "`tests/e2e/fixtures/seed.sqlite` existe e é carregado pelos specs via `DATABASE_URL` no `webServer` do Playwright"
    verify: "npm run test:e2e -- tests/e2e/flows/01-onboard-wallet.spec.ts"
  - criterion: "Cassettes de providers (`btc-mempool`, `evm-alchemy`, `sol-helius`, `prices-coingecko`) interceptam `fetch` global; zero rede real nos specs"
    verify: "npm run test:e2e -- tests/e2e/flows/"
  - criterion: "Spec onboard cobre: cadastrar wallet → trigger sync → ver transação nova em /transacoes → ver holding em /patrimonio"
    verify: "npm run test:e2e -- tests/e2e/flows/01-onboard-wallet.spec.ts"
  - criterion: "Spec toggle cobre USD↔BRL re-renderizando total-summary, holdings-table, line-chart-history e breakdown-donut com valores coerentes"
    verify: "npm run test:e2e -- tests/e2e/flows/02-toggle-currency.spec.ts"
  - criterion: "Spec transações cobre filtro por wallet + filtro por tipo + paginação server-side (navegar para página 2)"
    verify: "npm run test:e2e -- tests/e2e/flows/03-transactions-filter.spec.ts"
  - criterion: "`PortfolioSnapshot` cron registrado em `src/infra/jobs/index.ts`; script `snapshot` em `package.json` (obs TASK-240)"
    verify: "npm run snapshot -- --dry-run"
  - criterion: "`ErrorCode` `INVALID_JSON` existe em `src/lib/errors.ts` e é usado por `api-client.ts` quando resposta não é JSON (obs TASK-310)"
    verify: "npm run test -- tests/unit/lib/api-client.test.ts"
  - criterion: "`npm run test` e `npm run test:e2e` passam limpos"
    verify: "npm run test:e2e"
deliverables:
  - tests/e2e/fixtures/seed.sqlite
  - tests/e2e/fixtures/cassettes/btc-mempool.json
  - tests/e2e/fixtures/cassettes/evm-alchemy.json
  - tests/e2e/fixtures/cassettes/sol-helius.json
  - tests/e2e/fixtures/cassettes/prices-coingecko.json
  - tests/e2e/setup/record.ts
  - tests/e2e/setup/replay.ts
  - tests/e2e/setup/global-setup.ts
  - tests/e2e/flows/01-onboard-wallet.spec.ts
  - tests/e2e/flows/02-toggle-currency.spec.ts
  - tests/e2e/flows/03-transactions-filter.spec.ts
  - playwright.config.ts
  - package.json
  - package-lock.json
  - src/lib/errors.ts
  - src/lib/api-client.ts
  - src/infra/jobs/index.ts
  - scripts/portfolio-snapshot.ts
  - .env.e2e.example
---

# TASK-410 — E2E Playwright + backlogs absorvidos

## Objetivo
Cobrir os 3 fluxos críticos da app com testes end-to-end determinísticos, usando dados reais pré-sincronizados (fixture SQLite) e providers stubados via cassettes. Zero rede em cada run de CI. Absorver obs pendentes das Ondas 2/3 que destravam o E2E.

## Escopo

### Infraestrutura E2E
- Instalar `msw` (ou usar `undici` MockAgent — decisão do Dev, justificar) para interceptar `fetch` dentro do `webServer` do Next.
- `tests/e2e/setup/record.ts`: script invocado via `npm run e2e:record` que:
  1. Exige `.env.e2e.local` com chaves reais (`ALCHEMY_API_KEY`, `HELIUS_API_KEY`, etc.).
  2. Reseta `tests/e2e/fixtures/seed.sqlite` (delete + `prisma migrate deploy`).
  3. Cadastra 3 wallets de teste — endereços públicos fixos em constante (NÃO wallets de usuários arbitrários). **BTC fixado no endereço do bloco Genesis: `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`** (recipient da primeira coinbase transaction, público, histórico estável há >15 anos — fixture ideal). ETH e SOL a escolher na execução, seguindo mesmo critério (públicos, estáveis, histórico pequeno).
  4. Dispara sync real; grava cada chamada de `fetch` em `cassettes/*.json`.
  5. Dump SQLite fica committado como fixture.
- `tests/e2e/setup/replay.ts`: lido pelo Next no modo `FETCH_MOCK_MODE=cassettes`. Intercepta `fetch` e responde com match por URL+method.
- `playwright.config.ts`: `webServer` inicia Next com `DATABASE_URL=file:./tests/e2e/fixtures/seed.sqlite` e `FETCH_MOCK_MODE=cassettes`.
- `global-setup.ts`: copia `seed.sqlite` para um tempfile por worker, pra specs rodarem isolados.

### Specs
- `01-onboard-wallet.spec.ts`: cadastra wallet via UI → click "Sincronizar" → aguarda lastSync mudar → navega `/transacoes` e vê hash nova → navega `/patrimonio` e vê asset no total.
- `02-toggle-currency.spec.ts`: carrega `/patrimonio` em USD → captura valores de total e top holding → clica toggle BRL → asserta que valores mudaram E que o eixo do gráfico de linha mostra "R$" → idem para donut.
- `03-transactions-filter.spec.ts`: carrega `/transacoes` → aplica filtro rede=BTC → conta linhas → adiciona filtro tipo=TRANSFER_IN → conta linhas → navega para página 2 via botão "Próxima" → asserta URL de fetch teve `page=2`.

### Backlogs absorvidos

**Da TASK-240** (cron + script snapshot):
- Registrar `PortfolioSnapshot` cron em `src/infra/jobs/index.ts` no bootstrap. Usar mesmo padrão do `sync-cron`.
- Adicionar script `snapshot` em `package.json` apontando para `scripts/portfolio-snapshot.ts`. Suportar flag `--dry-run` (não grava).

**Da TASK-310** (INVALID_JSON):
- Criar `ErrorCode` `'INVALID_JSON'` em `src/lib/errors.ts` (ponto de verdade compartilhado backend+frontend).
- `api-client.ts`: trocar `throw new ApiClientError(..., 'INVALID_ENVELOPE', ...)` do caso "não é JSON válido" para usar `'INVALID_JSON'`. Manter `'INVALID_ENVELOPE'` para payload válido mas sem forma `{ data, error, meta }`.
- Atualizar `tests/unit/lib/api-client.test.ts` para validar a distinção.

**Da TASK-340** (toggle USD/BRL E2E) — coberto pelo spec `02-toggle-currency.spec.ts`.

## Fora do escopo
- Cobertura E2E de casos de erro (rotas 5xx) — ficam em follow-up.
- Testes visuais / screenshot diff.
- Mobile viewport (responsividade deixada pra quando houver uso mobile real).
- Regravação automática de cassettes em CI (é manual, on-demand).

## Decisões a respeitar
- **Wallets no fixture são públicas + de teste**, escolhidas para ter histórico pequeno (<50 tx) e tipos variados (transfer, swap). Documentar escolha no `record.ts`.
- Cassettes **versionados no git** (aceitamos o custo de alguns MB). Se passarem de 10 MB, paginar por fixture.
- `FETCH_MOCK_MODE` é lido pelo **próprio `apiClient` e pelos providers**; não instrumentar `global.fetch` em produção.
- Se `FETCH_MOCK_MODE=cassettes` e cassette não tiver match → **falha rápida** com mensagem clara (URL + method). Nunca fallback para rede real.
- `.env.e2e.local` **nunca** commitado. `.env.e2e.example` lista as chaves necessárias pra regravar.
- Playwright roda em modo **serial** (1 worker) — os specs mutam o DB via UI. Paralelismo vira Nice-to-Have em follow-up.
- Obs pendentes do Reviewer TASK-330 (`staleTime`) **ficam no backlog** — esta task não mexe em `use-holdings`.
