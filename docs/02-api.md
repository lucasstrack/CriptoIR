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
