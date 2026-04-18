---
id: TASK-005
title: Orquestrador multi-agente (scripts de list/pick/review/verify)
status: blocked
wave: 0
depends_on: [TASK-000]
parallel_safe_with: [TASK-001, TASK-002, TASK-003]
owner_dev: null
owner_reviewer: null
branch: task/TASK-005-orchestrator
acceptance:
  - criterion: "npm run orch:list imprime tabela de tasks com status"
    verify: "npm run orch:list"
  - criterion: "npm run orch:pick respeita depends_on (não sugere task com dep não 'done')"
    verify: "npm run orch:pick --silent | grep -q 'TASK-'"
  - criterion: "npm run orch:verify TASK-000 roda os comandos do front-matter e retorna exit 0 quando todos passam"
    verify: "npm run orch:verify -- TASK-000"
  - criterion: "Orquestrador lê front-matter YAML em docs/tarefas/*.md sem quebrar"
    verify: "npm run orch:list"
  - criterion: "Testes unitários do parser de front-matter passam"
    verify: "npm run test -- tests/unit/orchestrator"
deliverables:
  - tools/orchestrator/index.ts
  - tools/orchestrator/parser.ts
  - tools/orchestrator/verify.ts
  - tools/orchestrator/pick.ts
  - tools/orchestrator/list.ts
  - tools/orchestrator/review.ts
  - tools/orchestrator/types.ts
  - package.json (scripts orch:*)
  - tests/unit/orchestrator/parser.test.ts
  - tests/unit/orchestrator/pick.test.ts
---

# TASK-005 — Orquestrador multi-agente

## Objetivo
Implementar as ferramentas de linha de comando que percorrem `docs/tarefas/`, entendem dependências e critérios de aceite, e ajudam na orquestração dev/reviewer. **Sem chamadas a LLM** — o orquestrador só prepara contexto e valida.

## Componentes

### `orch:list`
Imprime tabela com `id`, `title`, `status`, `wave`, `depends_on` de todas as tasks. Ordena por wave e id.

### `orch:pick`
Seleciona a próxima task `status: ready` cujas `depends_on` estejam todas `done`. Em caso de múltiplas, prefere menor `id`. Imprime:
- resumo da task
- um **prompt sugerido** para o agente Dev (incluindo critérios de aceite e deliverables)

### `orch:review TASK-XXX`
Imprime um **prompt sugerido** para o agente Reviewer:
- diff da branch da task contra `main`
- critérios de aceite pendentes
- lista de comandos `verify` a serem rodados

### `orch:verify TASK-XXX`
Roda cada `acceptance[].verify` como subprocess em sequência. Imprime verde/vermelho. Retorna exit code 0 só se **todos** passarem.

### Parser (`parser.ts`)
- Usa `gray-matter` para extrair front-matter YAML.
- Valida com Zod:
  - `id` match `/^TASK-\d{3}$/`
  - `status` em {`backlog`,`ready`,`in-progress`,`in-review`,`approved`,`done`,`changes-requested`,`blocked`}
  - `acceptance` array com `criterion` (string) e `verify` (string)
  - `deliverables` array de paths
  - `depends_on` / `parallel_safe_with` arrays de ids válidos
- Referências a tasks inexistentes em `depends_on` → erro fatal.

## Stack
- `tsx` (executa TS direto) — `npm i -D tsx`
- `gray-matter` — parse YAML front-matter
- `zod` — validação
- `picocolors` — cores no terminal
- `execa` — rodar subprocessos

## Scripts no package.json
```json
{
  "orch:list": "tsx tools/orchestrator/list.ts",
  "orch:pick": "tsx tools/orchestrator/pick.ts",
  "orch:review": "tsx tools/orchestrator/review.ts",
  "orch:verify": "tsx tools/orchestrator/verify.ts"
}
```
