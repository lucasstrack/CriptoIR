# CriptoIR — Modelo de dados

Schema Prisma/SQLite. Este documento acompanha `prisma/schema.prisma` e explica **por que** cada tabela e campo existem. Alterações no schema exigem atualização deste arquivo.

## Entidades

### `Wallet`
Endereço on-chain cadastrado pelo usuário.

| Campo | Tipo | Observação |
|---|---|---|
| id | cuid PK | |
| label | string | Nome amigável dado pelo usuário |
| address | string | Endereço on-chain (case-sensitive p/ SOL; lowercase p/ EVM) |
| network | enum `Network` | BTC, ETH, BASE, ARB, SOL |
| createdAt | DateTime | |
| lastSyncedAt | DateTime? | Última vez que sync rodou |
| lastSyncedCursor | string? | Block height (BTC/EVM) ou signature (SOL) do último bloco confirmado processado |
| archivedAt | DateTime? | Soft delete (permite preservar histórico) |

**Índices:** único em `(network, address)`.

---

### `Asset`
Ativo (moeda nativa ou token).

| Campo | Tipo | Observação |
|---|---|---|
| id | cuid PK | |
| symbol | string | BTC, ETH, USDC, SOL, ... |
| name | string | Nome legível |
| network | enum `Network` | Rede onde o ativo existe (tokens duplicam por rede) |
| contractAddress | string? | Null para nativas |
| decimals | int | |
| coingeckoId | string? | p/ busca de preço |

**Índices:** único em `(network, contractAddress)` (com `contractAddress = null` p/ nativas).

---

### `Transaction`
Transação on-chain relevante para uma `Wallet`.

| Campo | Tipo | Observação |
|---|---|---|
| id | cuid PK | |
| walletId | FK Wallet | |
| network | enum `Network` | Denormalizado p/ filtros |
| txHash | string | Hash/signature da tx na rede |
| blockNumber | bigint | Altura do bloco (slot p/ SOL) |
| timestamp | DateTime | UTC |
| direction | enum `Direction` | IN, OUT, INTERNAL (próprio envia p/ próprio mas outra wallet cadastrada), SELF (mesmo endereço, ex: unstake) |
| type | enum `TxType` | TRANSFER_IN, TRANSFER_OUT, INTERNAL, SWAP, FEE, LIQUIDITY_ADD, LIQUIDITY_REMOVE, STAKING_IN, STAKING_OUT, UNKNOWN |
| counterparty | string? | Endereço do outro lado (null em SWAP) |
| assetId | FK Asset | |
| amount | string (decimal) | Sempre positivo; sinal vem de `direction` |
| feeAmount | string? | |
| feeAssetId | FK Asset? | Normalmente o nativo da rede |
| status | enum `TxStatus` | CONFIRMED, PENDING, FAILED |
| rawPayload | string (JSON serializado) | Resposta bruta do provider; permite reprocessar classificação |
| classificationVersion | int | Versão do classifier que gerou `type` |
| createdAt | DateTime | |

**Índices:**
- Único em `(walletId, txHash, direction)` (uma tx pode gerar linhas IN e OUT p/ a mesma wallet em casos internos)
- `(walletId, timestamp)` p/ listagem/filtro
- `(network, txHash)` p/ dedup cross-wallet

---

### `PriceSnapshot`
Preço de um asset em um ponto do tempo.

| Campo | Tipo | Observação |
|---|---|---|
| id | cuid PK | |
| assetId | FK Asset | |
| date | DateTime | Resolução diária (UTC 00:00) para histórico; intraday para preço atual |
| priceUsd | string (decimal) | |
| priceBrl | string (decimal) | |
| source | string | "coingecko" (p/ futuros múltiplos providers) |

**Índices:** único em `(assetId, date, source)`.

---

### `PortfolioSnapshot`
Snapshot semanal do patrimônio total (pré-computado p/ gráfico).

| Campo | Tipo | Observação |
|---|---|---|
| id | cuid PK | |
| weekStart | DateTime | Domingo 00:00 UTC |
| totalUsd | string | |
| totalBrl | string | |
| breakdown | string (JSON serializado) | `[{ assetId, amount, valueUsd, valueBrl }, ...]` |

**Índice:** único em `weekStart`.

---

### `SyncLog`
Auditoria de execuções de sync.

| Campo | Tipo | Observação |
|---|---|---|
| id | cuid PK | |
| walletId | FK Wallet | |
| startedAt | DateTime | |
| finishedAt | DateTime? | |
| txCount | int | Novas tx persistidas |
| error | string? | Mensagem se falhou |

---

## Enums

- `Network`: `BTC`, `ETH`, `BASE`, `ARB`, `SOL`
- `Direction`: `IN`, `OUT`, `INTERNAL`, `SELF`
- `TxType`: `TRANSFER_IN`, `TRANSFER_OUT`, `INTERNAL`, `SWAP`, `FEE`, `LIQUIDITY_ADD`, `LIQUIDITY_REMOVE`, `STAKING_IN`, `STAKING_OUT`, `UNKNOWN`
- `TxStatus`: `CONFIRMED`, `PENDING`, `FAILED`
