# CriptoIR — Fluxo Multi-Agente

Objetivo: permitir que múltiplas tarefas sejam desenvolvidas **em paralelo** por agentes diferentes, com revisão independente, sem atropelo.

## Papéis

| Papel | Responsabilidade |
|---|---|
| **Planner** (humano + Claude em chat) | Escreve as specs de tarefa em `docs/tarefas/TASK-XXX.md` |
| **Dev** (agente automatizado) | Pega uma task com `status: ready`, implementa, roda testes locais, commita em branch `task/TASK-XXX` |
| **Reviewer** (agente automatizado) | Checkout da branch do dev em worktree limpa, roda **todos** os testes, valida cada critério de aceite, marca `status: approved` ou `status: changes-requested` com comentários |
| **Merger** (humano) | Após aprovação do reviewer, faz merge na `main` |

## Estados de uma task

```
backlog → ready → in-progress → in-review → approved → done
                                     ↓
                                  changes-requested → ready (retrabalho)
```

## Front-matter obrigatório em cada TASK

```yaml
---
id: TASK-100
title: CRUD de Wallets (API + UI)
status: ready
wave: 1
depends_on: [TASK-000, TASK-002]
parallel_safe_with: [TASK-110, TASK-111, TASK-112, TASK-120]
owner_dev: null
owner_reviewer: null
branch: task/TASK-100-crud-wallets
acceptance:
  - criterion: "POST /api/wallets cria wallet válida e retorna 201"
    verify: "npm test -- tests/integration/wallets.test.ts -t 'POST /api/wallets'"
  - criterion: "docs/02-api.md lista POST /api/wallets"
    verify: "grep -q 'POST /api/wallets' docs/02-api.md"
deliverables:
  - src/app/api/wallets/route.ts
  - src/core/use-cases/create-wallet.ts
  - src/infra/db/wallet-repository.ts
  - tests/integration/wallets.test.ts
  - docs/02-api.md (atualizado)
---
```

## Orquestrador

Localização: `tools/orchestrator/`

Comandos:
- `npm run orch:list` — lista tasks por status
- `npm run orch:pick` — escolhe próxima task `ready` (respeita `depends_on`) e imprime o prompt pronto p/ Dev
- `npm run orch:review TASK-XXX` — gera prompt para o Reviewer com contexto da branch
- `npm run orch:verify TASK-XXX` — roda todos os comandos de `acceptance[].verify` e relata pass/fail

O orquestrador **não chama LLM diretamente** na v1. Ele prepara prompts e valida resultados. O usuário (ou um wrapper) dispara Claude Code passando o prompt. Isso mantém o fluxo transparente e depurável.

## Regras invioláveis

1. **Dev nunca mexe em tasks que não sejam as dele.** Commit tocando código fora de `deliverables` é automaticamente reprovado pelo reviewer.
2. **Reviewer sempre em worktree limpo.** Nunca reutiliza node_modules do dev.
3. **Testes são a fronteira.** Aprovação sem `orch:verify` verde é proibida.
4. **Documentação faz parte do deliverable.** `docs/02-api.md` desatualizado = reprovação.
5. **Tasks paralelas precisam declarar `parallel_safe_with`** — se duas tasks mexem no mesmo arquivo, isso precisa ficar explícito (ou separadas em ondas).

## Paralelização prática

- Onda 0 (fundação) = **serial**
- Onda 1 (providers + CRUD wallets) = **paralela** (5 tasks independentes)
- Onda 2 (integração) = **serial no grafo, mas sub-tasks paralelas**
- Onda 3 (UI) = **paralela por tela**
- Onda 4 (qualidade) = **paralela**
