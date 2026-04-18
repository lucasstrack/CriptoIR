# CriptoIR — Catálogo de API

> **Fonte única da verdade.** Toda alteração (novo endpoint, mudança de payload, novo código de erro) exige PR que atualize este arquivo. Reviewer rejeita PRs de API que não atualizarem este catálogo.

## Convenções gerais

- Base URL local: `http://localhost:3000/api`
- Todos os endpoints retornam JSON com o envelope:

  ```json
  {
    "data": { ... } | [ ... ] | null,
    "error": { "code": "STRING_CODE", "message": "human readable" } | null,
    "meta": { "page": 1, "pageSize": 50, "total": 1234 } | null
  }
  ```
  
- Payloads de request validados com **Zod** (schemas exportados em `src/lib/zod-schemas/`).
- Valores monetários transmitidos como **string decimal** (ex: `"0.01573000"`), nunca `number`.
- Datas em **ISO 8601 UTC** (`2026-04-18T14:32:00Z`).
- Autenticação: **nenhuma na v1** (uso local single-user).

## Códigos de erro padronizados

| Código | HTTP | Significado |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Payload inválido (Zod falhou) |
| `WALLET_NOT_FOUND` | 404 | Wallet id inexistente |
| `WALLET_ALREADY_EXISTS` | 409 | Par (address, network) já cadastrado |
| `INVALID_ADDRESS` | 400 | Endereço não é válido para a rede |
| `PROVIDER_RATE_LIMITED` | 429 | Upstream limitou |
| `PROVIDER_UNAVAILABLE` | 502 | Upstream fora do ar |
| `SYNC_ALREADY_RUNNING` | 409 | Tentou disparar sync para wallet já sincronizando |
| `INTERNAL_ERROR` | 500 | Erro não categorizado |

---

## Endpoints

### `GET /api/health`

**Descricao:** verifica se a app e a camada base de API estao respondendo.

**Path params:** nenhum.

**Query params:** nenhum.

**Request body:** nenhum.

**Response 200:**
```json
{
  "data": {
    "status": "ok",
    "timestamp": "2026-04-18T14:32:00Z"
  },
  "error": null,
  "meta": null
}
```

**Erros possiveis:** `INTERNAL_ERROR`

**Task de origem:** TASK-004

---

### `GET /api/wallets`

**Descricao:** lista as wallets cadastradas e nao arquivadas.

**Path params:** nenhum.

**Query params:** nenhum.

**Request body:** nenhum.

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm9wallet123",
      "label": "Carteira principal",
      "address": "0xabcdefabcdefabcdefabcdefabcdefabcdef1234",
      "network": "ETH",
      "createdAt": "2026-04-18T14:32:00.000Z",
      "lastSyncedAt": null,
      "lastSyncedCursor": null
    }
  ],
  "error": null,
  "meta": null
}
```

**Erros possiveis:** `INTERNAL_ERROR`

**Task de origem:** TASK-100

---

### `POST /api/wallets`

**Descricao:** cadastra uma nova wallet do usuario.

**Path params:** nenhum.

**Query params:** nenhum.

**Request body:**
```json
{
  "label": "Carteira principal",
  "address": "0xAbCDEFabcdefABCDEFabcdefABCDEFabcdef1234",
  "network": "ETH"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "cm9wallet123",
    "label": "Carteira principal",
    "address": "0xabcdefabcdefabcdefabcdefabcdefabcdef1234",
    "network": "ETH",
    "createdAt": "2026-04-18T14:32:00.000Z",
    "lastSyncedAt": null,
    "lastSyncedCursor": null
  },
  "error": null,
  "meta": null
}
```

**Erros possiveis:** `VALIDATION_ERROR`, `INVALID_ADDRESS`, `WALLET_ALREADY_EXISTS`, `INTERNAL_ERROR`

**Task de origem:** TASK-100

---

### `POST /api/wallets/:id/sync`

**Descricao:** dispara sincronizacao da wallet em background (provider + classifier + persistencia). Resposta retorna imediatamente com `syncLogId`; o resultado final e observavel via `SyncLog` e proximas consultas a `GET /api/transactions`.

**Path params:** `id: string (cuid)` — id da wallet.

**Query params:** nenhum.

**Request body:** nenhum.

**Response 202:**
```json
{
  "data": {
    "syncLogId": "cm9synclog123"
  },
  "error": null,
  "meta": null
}
```

**Erros possiveis:** `WALLET_NOT_FOUND`, `SYNC_ALREADY_RUNNING`, `INTERNAL_ERROR`

**Agendamento automatico:** job `node-cron` roda o mesmo caso de uso para todas as wallets nao arquivadas no intervalo `SYNC_CRON_EXPR` (padrao `*/30 * * * *`). Wallets ja em sincronizacao sao puladas.

**Task de origem:** TASK-210

---

### `GET /api/transactions`

**Descricao:** lista transacoes persistidas com filtros, paginacao e ordenacao. Cada item embute `asset`, `feeAsset` e `wallet` com o minimo necessario para a grid renderizar sem round-trip.

**Path params:** nenhum.

**Query params:**

- `dateFrom` (opcional, `string ISO 8601 UTC`) — inclusivo, filtra `timestamp >= dateFrom`.
- `dateTo` (opcional, `string ISO 8601 UTC`) — inclusivo, filtra `timestamp <= dateTo`.
- `network` (opcional, `"BTC" | "ETH" | "BASE" | "ARB" | "SOL"`).
- `assetSymbol` (opcional, `string`) — match exato no `Asset.symbol`.
- `walletId` (opcional, `string cuid`).
- `type` (opcional, `TxType`) — um de `TRANSFER_IN | TRANSFER_OUT | INTERNAL | SWAP | FEE | LIQUIDITY_ADD | LIQUIDITY_REMOVE | STAKING_IN | STAKING_OUT | UNKNOWN`.
- `page` (opcional, `number`, default `1`, minimo `1`).
- `pageSize` (opcional, `number`, default `50`, teto `200`).
- `sort` (opcional, `"timestamp:asc" | "timestamp:desc"`, default `"timestamp:desc"`).

**Request body:** nenhum.

**Response 200:**

```json
{
  "data": [
    {
      "id": "cm9tx123",
      "walletId": "cm9wallet123",
      "network": "ETH",
      "txHash": "0xabc...",
      "blockNumber": "19283746",
      "timestamp": "2026-04-18T14:32:00.000Z",
      "direction": "IN",
      "type": "TRANSFER_IN",
      "counterparty": "0xdead...",
      "amount": "1.500000000000000000",
      "feeAmount": null,
      "status": "CONFIRMED",
      "asset": {
        "id": "cm9asset123",
        "symbol": "ETH",
        "name": "ETH",
        "network": "ETH",
        "contractAddress": null,
        "decimals": 18
      },
      "feeAsset": null,
      "wallet": {
        "id": "cm9wallet123",
        "label": "Carteira principal",
        "address": "0xabcdef...",
        "network": "ETH"
      }
    }
  ],
  "error": null,
  "meta": { "page": 1, "pageSize": 50, "total": 1234 }
}
```

**Erros possiveis:** `VALIDATION_ERROR`, `INTERNAL_ERROR`

**Task de origem:** TASK-220

---

> O catalogo sera expandido nas proximas tasks da Onda 1+.
> Formato padrao de cada entrada abaixo.

### Template (copie ao adicionar endpoint)

#### `{MÉTODO} {path}`

**Descrição:** uma linha do que faz.

**Path params:** `id: string (cuid)` — ...

**Query params:**
- `foo` (opcional, `string`) — ...

**Request body:**
```json
{ "address": "0x...", "network": "ETH", "label": "Minha hot wallet" }
```

**Response 200:**
```json
{ "data": { "id": "...", "address": "...", "network": "ETH", "label": "..." }, "error": null, "meta": null }
```

**Erros possíveis:** `VALIDATION_ERROR`, `WALLET_ALREADY_EXISTS`

**Task de origem:** TASK-100
