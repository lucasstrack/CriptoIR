import { describe, expect, it } from 'vitest';
import { parseTaskContent } from '@/../tools/orchestrator/parser';

describe('parseTaskContent', () => {
  it('faz parse de front matter valido', () => {
    const task = parseTaskContent(
      '/tmp/TASK-999.md',
      `---
id: TASK-999
title: Exemplo
status: ready
wave: 9
depends_on: []
parallel_safe_with: []
owner_dev: null
owner_reviewer: null
branch: task/TASK-999-exemplo
acceptance:
  - criterion: "Funciona"
    verify: "echo ok"
deliverables:
  - src/file.ts
---
`,
    );

    expect(task.id).toBe('TASK-999');
    expect(task.acceptance).toHaveLength(1);
  });
});
