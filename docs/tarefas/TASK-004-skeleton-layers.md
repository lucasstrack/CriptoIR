---
id: TASK-004
title: Esqueleto das camadas core/infra/ui/lib + API base
status: blocked
wave: 0
depends_on: [TASK-000, TASK-002]
parallel_safe_with: [TASK-001, TASK-003]
owner_dev: null
owner_reviewer: null
branch: task/TASK-004-skeleton-layers
acceptance:
  - criterion: "Pastas src/core, src/infra, src/ui, src/lib existem com README.md curto explicando responsabilidade"
    verify: "for d in core infra ui lib; do test -f src/$d/README.md || exit 1; done"
  - criterion: "src/lib/api-response.ts exporta helpers ok() e err()"
    verify: "grep -q 'export function ok' src/lib/api-response.ts && grep -q 'export function err' src/lib/api-response.ts"
  - criterion: "src/lib/errors.ts define códigos de erro padronizados (enum ou union)"
    verify: "grep -q 'WALLET_NOT_FOUND' src/lib/errors.ts"
  - criterion: "src/app/api/health/route.ts retorna { data: { status: 'ok' } }"
    verify: "npm run build"
  - criterion: "Lint/type-check do projeto verde"
    verify: "npm run lint && npx tsc --noEmit"
deliverables:
  - src/core/README.md
  - src/core/domain/.gitkeep
  - src/core/services/.gitkeep
  - src/core/use-cases/.gitkeep
  - src/infra/README.md
  - src/infra/blockchain/.gitkeep
  - src/infra/prices/.gitkeep
  - src/infra/http/.gitkeep
  - src/ui/README.md
  - src/lib/README.md
  - src/lib/api-response.ts
  - src/lib/errors.ts
  - src/lib/zod-schemas/.gitkeep
  - src/app/api/health/route.ts
  - docs/02-api.md (atualizado com endpoint GET /api/health)
---

# TASK-004 — Esqueleto de camadas

## Objetivo
Criar a topologia de pastas aprovada e um endpoint `/api/health` funcional que serve de **template canônico** para todas as rotas futuras (envelope `{ data, error, meta }`, Zod, tratamento de erros).

## Passos sugeridos
1. Criar as pastas com um `README.md` de 5-10 linhas em cada raiz explicando a regra da camada.
2. Em `src/lib/api-response.ts` exportar:
   ```ts
   export function ok<T>(data: T, meta?: Meta): Response
   export function err(code: ErrorCode, message: string, status?: number): Response
   ```
3. `src/lib/errors.ts`: enum/union `ErrorCode` com os códigos da seção de erros do docs/02-api.md.
4. `src/app/api/health/route.ts`:
   ```ts
   export async function GET() { return ok({ status: 'ok', timestamp: new Date().toISOString() }) }
   ```
5. Adicionar esse endpoint no catálogo `docs/02-api.md` usando o template.

## Observação
Esta task fecha a Onda 0. Ao concluir, a Onda 1 destrava.
