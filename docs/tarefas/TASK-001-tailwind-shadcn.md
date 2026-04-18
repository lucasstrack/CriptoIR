---
id: TASK-001
title: Tailwind CSS + shadcn/ui com tema dark padrão
status: done
wave: 0
depends_on: [TASK-000]
parallel_safe_with: [TASK-002, TASK-003]
owner_dev: codex (2026-04-18)
owner_reviewer: codex (2026-04-18)
branch: task/TASK-001-tailwind-shadcn
acceptance:
  - criterion: "tailwindcss instalado e postcss.config.* presente"
    verify: "node -e \"if(!require('./package.json').devDependencies.tailwindcss) process.exit(1)\""
  - criterion: "tailwind.config.* e globals.css com @tailwind base/components/utilities"
    verify: "grep -q '@tailwind base' src/app/globals.css && grep -q '@tailwind components' src/app/globals.css"
  - criterion: "components.json do shadcn existe e aponta para src/ui/components"
    verify: "node -e \"const c=require('./components.json'); if(!c.aliases || !c.aliases.components.includes('ui/components')) process.exit(1)\""
  - criterion: "Ao menos 3 componentes shadcn instalados (button, card, input)"
    verify: "test -f src/ui/components/button.tsx && test -f src/ui/components/card.tsx && test -f src/ui/components/input.tsx"
  - criterion: "Página inicial usa tema dark por padrão (html tag tem class 'dark' ou schema dark habilitado no CSS)"
    verify: "grep -RE 'dark' src/app/layout.tsx | head -n1"
  - criterion: "npm run build passa"
    verify: "npm run build"
deliverables:
  - tailwind.config.ts
  - postcss.config.mjs
  - components.json
  - src/app/globals.css (com diretivas Tailwind + variáveis CSS do shadcn)
  - src/app/layout.tsx (tema dark aplicado)
  - src/ui/components/button.tsx
  - src/ui/components/card.tsx
  - src/ui/components/input.tsx
  - src/lib/utils.ts (cn helper do shadcn)
---

# TASK-001 — Tailwind + shadcn/ui

## Objetivo
Adicionar Tailwind CSS e inicializar shadcn/ui com **tema dark como padrão**. Não há UI funcional ainda — apenas a base visual pronta para consumo pelas tasks de UI das Ondas seguintes.

## Passos sugeridos
1. Instalar Tailwind conforme guia oficial Next.js 15 App Router.
2. Rodar `npx shadcn@latest init`; configurar:
   - Style: `new-york` (aceitável `default` também)
   - Base color: `zinc` ou `slate`
   - CSS variables: **yes**
   - Components path: `@/ui/components`
   - Utils path: `@/lib/utils`
3. Instalar 3 primitivos: `npx shadcn@latest add button card input`.
4. No `src/app/layout.tsx`, adicionar `className="dark"` na tag `<html>` para travar tema dark v1 (toggle claro/escuro pode vir depois se desejado).
5. Atualizar `src/app/page.tsx` para exibir um `<Card>` com `<Button>` de exemplo, confirmando visual.

## Observação
Não mexer em nada fora de: `src/app/{layout,page,globals.css}`, `src/ui/**`, `src/lib/utils.ts`, raiz (configs).
