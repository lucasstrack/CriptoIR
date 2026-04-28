# CriptoIR — Roadmap de entregas

Ondas e tasks. Detalhes de cada task ficam em `docs/tarefas/TASK-XXX.md`.

## Onda 0 — Fundação (serial, bloqueia tudo)
- **TASK-000** Scaffolding Next.js + TS + npm + ESLint + Prettier
- **TASK-001** Tailwind + shadcn/ui (tema dark padrão)
- **TASK-002** Prisma + SQLite + schema inicial + primeira migration
- **TASK-003** Vitest + Playwright + exemplos de teste rodando
- **TASK-004** Esqueleto `core/` `infra/` `ui/` `lib/` + docs/02-api.md template
- **TASK-005** Orquestrador multi-agente (scripts `orch:list|pick|review|verify`)
- **TASK-006** CI local (`npm run check` = lint + typecheck + test)

## Onda 1 — Núcleo paralelizável (após Onda 0)
- **TASK-100** CRUD de Wallets (API + UI básica) `[paralela com 110, 111, 112, 120]`
- **TASK-110** `BlockchainProvider` interface + provider BTC (mempool.space) `[paralela]`
- **TASK-111** Provider EVM (ETH/BASE/ARB via Alchemy) `[paralela]`
- **TASK-112** Provider SOL (Helius) `[paralela]`
- **TASK-120** PriceService (CoinGecko, USD+BRL) `[paralela]`
- **TASK-130** TxClassifier (enum TxType, INTERNAL entre wallets cadastradas) `[paralela com 110-120]`

## Onda 2 — Integração
- **TASK-200** SyncOrchestrator (consome providers + classifier + grava Transactions idempotente)
- **TASK-210** Endpoint `POST /api/wallets/:id/sync` + job agendado via node-cron
- **TASK-220** Endpoint `GET /api/transactions` com filtros (data, rede, cripto, carteira, tipo, paginação, sort)
- **TASK-230** Endpoints `GET /api/holdings` e `GET /api/portfolio/history`
- **TASK-240** Job semanal de `PortfolioSnapshot`

## Onda 3 — UI principal (paralela por tela)
- **TASK-300** Shell da app: layout, navbar, tema dark, toggle USD/BRL
- **TASK-310** Tela Carteiras (CRUD + botão "sincronizar")
- **TASK-320** Tela Transações (grid TanStack Table com filtros)
- **TASK-330** Tela Patrimônio (holdings + preço médio + valor atual)
- **TASK-340** Gráficos (evolução semanal, breakdown por cripto/carteira)

## Onda 4 — Qualidade e extras
- **TASK-400** Cobertura de testes de integração ≥ 80% nas rotas de API
- **TASK-410** E2E Playwright dos 3 fluxos críticos (cadastrar wallet → sync → ver tx → ver patrimônio)
- **TASK-420** README (pt-BR) + guia de contribuição
- **TASK-430** Consolidar ADRs em `docs/decisoes/`

## Onda 5 — Pós-MVP (backlog)
- Detecção específica de LP (Uniswap V2/V3, Raydium)
- Suporte a novas redes (Polygon, Optimism, Avalanche)
- Export CSV/XLSX das transações
- Modo multi-usuário (login local)

## Backlog técnico (carry-over de reviews)
- **Da TASK-240** — registrar `PortfolioSnapshot` cron no bootstrap de `src/infra/jobs/index.ts` (hoje só `sync-cron` é registrado no startup).
- **Da TASK-240** — adicionar script `snapshot` em `package.json` apontando para `scripts/portfolio-snapshot.ts` (hoje é invocável só via `npx tsx`).
- **Da TASK-310** — separar `INVALID_JSON` de `INVALID_ENVELOPE` em `api-client.ts` + nova `ErrorCode` compartilhada em `src/lib/errors.ts` (facilita observabilidade). Arquivado por exigir mudança em contrato de erros, fora do escopo da TASK-310.
- **Da TASK-320** — migrar placeholders `pageOf` (hoje via `String.replace('{page}', …)`) para ICU message format quando o sistema de i18n migrar para `next-intl`. Arquivado por depender da troca completa do módulo `src/lib/i18n/` — fora do escopo de polish pós-review.
- **Da TASK-340** — cobertura E2E (Playwright) para re-render dos gráficos ao alternar USD/BRL. Unitário cobre `toChartPoints` pura (determinismo do mapeamento) + `useMemo` com dep em `currency` — reatividade é consequência direta. Validação DOM pós-toggle pertence à suite E2E (TASK-410).
- **Da TASK-340** — `staleTime: 30_000` em `use-holdings.ts` e `use-portfolio-history.ts` é tuning inicial. Avaliar alinhar com o intervalo do sync cron (TASK-210) quando houver telemetria de cache hit/miss.
- **Do fix SOL** — `AlchemySolProvider` faz `Promise.all(getTransaction)` em até 25 sigs paralelos. Aceitável para fallback em wallets normais; em wallets ativas pode bater rate-limit do Alchemy free tier. Considerar `p-limit(5)` + retry-after se aparecer regressão. Motivo do arquivo: Helius é primário e já cobre a maioria; só rodaria com `Promise.all` se HELIUS_KEY ausente.
- **Do fix SOL** — `helius-provider.formatAmount` usa `Number.toFixed`; valores `tokenAmount` muito grandes (≳1e15) perdem precisão (Helius retorna `number`, não string). Limitação **upstream** do API enriched. Workaround só seria possível derivando de `rawContract.value` (raw uint), o que invalida o ganho de já receber unidades humanas. Arquivado por ser limite externo.
- **Do fix SOL** — Atualização de `Asset.symbol/name` no `upsertAsset` propaga últimos valores do provider. Se DAS retornar symbols inconsistentes entre syncs, o nome pode oscilar. Motivo do arquivo: comportamento aceitável (auto-cura > congelamento), risco baixo dado que metadata Helius é estável.
- **Do fix SOL** — `sol-mint-registry` é hardcoded com 8 mints populares. Motivo do arquivo: a estratégia em camadas (whitelist → cache → DAS → fallback `MINT_<short>`) já cobre mints novos via DAS; whitelist é só atalho de performance e não bloqueia novos tokens. Considerar `solana-token-list` externo se o número de syncs com mints desconhecidos for alto a ponto de impactar latência.
