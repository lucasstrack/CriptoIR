---
id: TASK-000
title: Scaffolding Next.js + TS + ESLint + Prettier
status: ready
wave: 0
depends_on: []
parallel_safe_with: []
owner_dev: null
owner_reviewer: null
branch: task/TASK-000-scaffold-next
acceptance:
  - criterion: "package.json existe com next, react, typescript em dependencies/devDependencies"
    verify: "node -e \"const p=require('./package.json'); if(!p.dependencies.next||!p.dependencies.react||!p.devDependencies.typescript) process.exit(1)\""
  - criterion: "tsconfig.json válido com strict: true"
    verify: "node -e \"const t=require('./tsconfig.json'); if(!t.compilerOptions.strict) process.exit(1)\""
  - criterion: "npm run lint executa sem erros"
    verify: "npm run lint"
  - criterion: "npm run build gera build sem erros"
    verify: "npm run build"
  - criterion: ".prettierrc existe e é válido JSON"
    verify: "node -e \"JSON.parse(require('fs').readFileSync('.prettierrc','utf8'))\""
deliverables:
  - package.json
  - package-lock.json
  - tsconfig.json
  - next.config.ts
  - .eslintrc.json (ou eslint.config.mjs)
  - .prettierrc
  - .prettierignore
  - src/app/layout.tsx
  - src/app/page.tsx (hello world temporário)
  - src/app/globals.css (vazio por ora; estilos vêm em TASK-001)
---

# TASK-000 — Scaffold inicial Next.js + TypeScript

## Objetivo
Criar o esqueleto da aplicação Next.js com TypeScript estrito, ESLint e Prettier configurados. Nenhum estilo ou DB ainda — só o mínimo que compila, linta e renderiza uma página vazia.

## Passos sugeridos
1. `npx create-next-app@latest . --typescript --eslint --app --src-dir --no-tailwind --use-npm --import-alias "@/*"`
   (o `--no-tailwind` é proposital; Tailwind é adicionado em TASK-001)
2. Ativar `"strict": true` em `tsconfig.json` se não estiver.
3. Adicionar Prettier: `npm i -D prettier eslint-config-prettier`
4. Criar `.prettierrc` com config mínima (semi: true, singleQuote: true, trailingComma: "all", printWidth: 100).
5. Criar `.prettierignore` (node_modules, .next, build).
6. Ajustar ESLint para estender `prettier` e desligar regras conflitantes.
7. Substituir `src/app/page.tsx` por um hello world simples: `<main><h1>CriptoIR</h1></main>`.
8. Rodar todos os critérios de aceite localmente.

## Fora do escopo
- Tailwind, shadcn (TASK-001)
- Prisma (TASK-002)
- Testes (TASK-003)
- Estrutura core/infra/ui/lib (TASK-004)

## Observação
Esta é a única task serial "bloqueadora total". Todas as outras dependem direta ou indiretamente dela.
