# CriptoIR — Arquitetura (v1, validada 2026-04-18)

Este documento consolida a arquitetura aprovada após Q&A inicial com o usuário. Substitui o rascunho `01-proposta-arquitetura.md` (que pode ser removido após leitura).

---

## 1. Visão

Aplicação web local, single-user, open source, que consolida transações on-chain de carteiras do usuário e agrega patrimônio. Rodará em `localhost` via `npm run dev` (ou `npm start` para produção local).

---

## 2. Stack (fechado)

| Camada | Escolha |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (tema dark) |
| Data grid | TanStack Table v8 |
| Gráficos | Recharts |
| Estado servidor | TanStack Query |
| Estado cliente | Zustand |
| ORM / DB | Prisma + SQLite |
| Validação | Zod |
| Tests | Vitest (unit + integração), Playwright (e2e) |
| Lint/format | ESLint (flat) + Prettier |
| Scheduler | node-cron embutido (sync periódico) |
| Package manager | npm |

---

## 3. Providers externos

| Serviço | Provider | Chave? | Observação |
|---|---|---|---|
| BTC | mempool.space | Não | API pública |
| ETH / BASE / ARB | Alchemy | Sim (gratuita) | Guia de setup em [docs/99-setup-chaves.md](./99-setup-chaves.md) |
| SOL | Helius ou Alchemy | Sim (gratuita) | Helius segue como opção dedicada; Alchemy também pode ser usada para SOL |
| Preços | CoinGecko | Free tier (chave opcional p/ mais req) | USD e BRL |

`.env.local` (ignorado pelo git) guarda chaves; `.env.example` lista variáveis esperadas.

---

## 4. Escopo de produto

- Fiat: **USD e BRL**, toggle na UI.
- Ativos: nativas + tokens (ERC-20, SPL). **NFTs fora de escopo.**
- Pools de liquidez tratados por diff de entradas vs saídas (sem decodificação específica de LP em v1 — ver roadmap).
- Preço médio (custo): **preço de mercado no momento da tx** (v1).
- Classificação de tx (enum):
  - `TRANSFER_IN` — recebimento de fora
  - `TRANSFER_OUT` — envio para fora
  - `INTERNAL` — entre carteiras cadastradas do usuário
  - `SWAP` — troca de ativo por outro na mesma tx
  - `FEE` — componente de taxa (normalmente embutido em outra tx)
  - `LIQUIDITY_ADD` / `LIQUIDITY_REMOVE` — entrada/saída em pool
  - `STAKING_IN` / `STAKING_OUT`
  - `UNKNOWN` — fallback; exibido com alerta na UI
- Histórico de patrimônio: saldo atual + snapshots **semanais** (a partir de PriceSnapshot + holdings históricos).
- Idioma da UI: **pt-BR** apenas na v1.

---

## 5. Estrutura de pastas

```
CriptoIR/
├─ ideia.md
├─ README.md
├─ LICENSE                          # licença a decidir antes do primeiro push
├─ package.json
├─ tsconfig.json
├─ next.config.ts
├─ .env.example
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ src/
│  ├─ app/                          # UI + API (App Router)
│  │  ├─ (dashboard)/
│  │  │  ├─ carteiras/page.tsx
│  │  │  ├─ transacoes/page.tsx     # grid estilo Excel
│  │  │  └─ patrimonio/page.tsx     # agregador + gráficos
│  │  └─ api/
│  │     ├─ wallets/route.ts
│  │     ├─ wallets/[id]/sync/route.ts
│  │     ├─ transactions/route.ts
│  │     ├─ holdings/route.ts
│  │     ├─ portfolio/history/route.ts
│  │     └─ prices/route.ts
│  ├─ core/                         # domínio puro (sem Next nem Prisma)
│  │  ├─ domain/                    # Wallet, Transaction, Holding, Asset
│  │  ├─ services/                  # PortfolioService, SyncOrchestrator, PriceService, TxClassifier
│  │  └─ use-cases/
│  ├─ infra/
│  │  ├─ db/                        # PrismaClient, repositories
│  │  ├─ blockchain/
│  │  │  ├─ provider.ts             # interface BlockchainProvider
│  │  │  ├─ btc/
│  │  │  ├─ evm/                    # eth, base, arb compartilham
│  │  │  └─ sol/
│  │  ├─ prices/                    # CoinGecko client
│  │  └─ http/                      # fetch com retry/backoff
│  ├─ ui/
│  │  ├─ components/                # shadcn + componentes próprios
│  │  └─ hooks/
│  └─ lib/
│     ├─ zod-schemas/
│     └─ errors.ts
├─ tests/
│  ├─ unit/
│  └─ integration/
├─ scripts/
│  └─ portfolio-snapshot.ts         # backfill manual de PortfolioSnapshot
├─ tools/
│  └─ orchestrator/                 # orquestrador multi-agente
├─ docs/
│  ├─ 01-arquitetura.md             (este arquivo)
│  ├─ 02-api.md                     # catálogo centralizado de endpoints
│  ├─ 03-modelo-de-dados.md
│  ├─ 04-fluxo-multi-agente.md
│  ├─ 05-roadmap.md
│  ├─ 99-setup-chaves.md            # guia passo-a-passo Alchemy/Helius/CoinGecko
│  ├─ decisoes/                     # ADRs (1 arquivo por decisão)
│  └─ tarefas/                      # specs de tasks p/ orquestrador
```

**Princípio:** `core/` não depende de Next nem Prisma. `infra/` implementa e é injetada. Facilita testes unitários e troca de providers.

Na Onda 1, o contrato comum de redes vive em `src/infra/blockchain/provider.ts`, com transacoes normalizadas em `src/core/domain/normalized-transaction.ts`.

Na Onda 2, o `SyncOrchestrator` (`src/core/services/sync-orchestrator.ts`) consome um `BlockchainProvider` resolvido pelo `ProviderRegistry` (`src/infra/blockchain/provider-registry.ts`), classifica cada transação com o `TxClassifier` e delega a persistência ao `TransactionRepository` (`src/infra/db/transaction-repository.ts`), que mantém a idempotência via índice único `(walletId, txHash, direction)` e faz upsert de `Asset` on-demand. O ciclo de vida (`SyncLog`, atualização de `lastSyncedAt`/`lastSyncedCursor`, tratamento de erro) vive no caso de uso `SyncWalletUseCase` (`src/core/use-cases/sync-wallet.ts`).

Ainda na Onda 2, o job `PortfolioSnapshot` (`src/infra/jobs/portfolio-snapshot-cron.ts`) roda semanalmente (domingo 00:00 UTC) via `node-cron`, com expressão default `0 0 * * 0` e override opcional por env `SNAPSHOT_CRON_EXPR`. O cron apenas agenda; a lógica vive no `RecordPortfolioSnapshotUseCase` (`src/core/use-cases/record-portfolio-snapshot.ts`), que recalcula holdings na `weekStart`, resolve preços e persiste em `PortfolioSnapshot` de forma idempotente via upsert pelo índice único em `weekStart`. Para backfill de semanas passadas, o script manual `scripts/portfolio-snapshot.ts` aceita `--week=YYYY-MM-DD` e reusa o mesmo use-case com preços históricos (`PriceSnapshot` mais recente `<= weekStart`).

---

## 6. Princípios de sincronização

1. Cada `Wallet` tem um cursor (`lastSyncedBlock` ou `lastSyncedSignature` para SOL).
2. Sync incremental: só busca a partir do cursor.
3. Dedup por `(network, txHash, walletId, direction)` — unique index.
4. Confirmações mínimas antes de persistir: BTC ≥ 6, EVM ≥ 12, SOL finalized.
5. Rate-limit/backoff por provider (tabela de config em `src/infra/http/`).
6. Classificação de tipo acontece pós-fetch, num `TxClassifier` isolado (testável sem rede).
7. Re-processamento de classificação é barato (não reconsulta rede) — se mudarmos regras, basta re-rodar sobre o payload cru armazenado.

---

## 7. Fluxo multi-agente (orquestrador)

Detalhado em [04-fluxo-multi-agente.md](./04-fluxo-multi-agente.md). Resumo:

- Specs de tarefa ficam em `docs/tarefas/TASK-XXX.md` com front-matter (status, dependências, critérios de aceite).
- Scripts `tools/orchestrator/*.ts` listam tasks, escolhem a próxima pronta, preparam contexto de review e rodam verificações de aceite.
- Após commit do dev, dispara agente `reviewer` num checkout limpo.
- Reviewer escreve resultado no front-matter (`status: approved | changes-requested`) e, se aprovado, marca como `done`.

---

## 8. API-first

- Catálogo único em [02-api.md](./02-api.md). Toda mudança de endpoint exige PR que altere este arquivo — check do reviewer.
- Respostas padrão: `{ data, error?, meta? }`.
- Erros com códigos estáveis: `WALLET_NOT_FOUND`, `PROVIDER_RATE_LIMITED`, `INVALID_ADDRESS`, ...
- Schemas Zod exportados para uso no client (tipagem end-to-end).

---

## 9. Roadmap

Ver [05-roadmap.md](./05-roadmap.md).

---

## 10. Status da fundação

A Onda 0 foi concluída com scaffold, base visual, schema Prisma, testes iniciais, endpoint de health, orquestrador local e scripts de validação.

A Onda 1 entregou os providers BTC/EVM/SOL, `PriceService`, `TxClassifier` e o CRUD inicial de `Wallet`.

A Onda 2 começou com o `SyncOrchestrator` idempotente (TASK-200): encadeia provider + classifier + persistência transacional por lote, sem endpoint HTTP nem job agendado (delegados a TASK-210). A onda encerra com TASK-220 (listagem paginada de transações), TASK-230 (holdings + portfolio history) e TASK-240 (job semanal de PortfolioSnapshot + script manual de backfill).
