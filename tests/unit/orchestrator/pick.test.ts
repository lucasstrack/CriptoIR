import { describe, expect, it } from 'vitest';
import { chooseNextReadyTask } from '@/../tools/orchestrator/pick';
import type { Task } from '@/../tools/orchestrator/types';

const baseTask = {
  wave: 0,
  parallel_safe_with: [],
  owner_dev: null,
  owner_reviewer: null,
  acceptance: [],
  deliverables: [],
  filePath: '/tmp/task.md',
} satisfies Omit<Task, 'id' | 'title' | 'status' | 'depends_on' | 'branch'>;

describe('chooseNextReadyTask', () => {
  it('escolhe a menor ready com dependencias concluidas', () => {
    const tasks: Task[] = [
      {
        ...baseTask,
        id: 'TASK-000',
        title: 'Base',
        status: 'done',
        depends_on: [],
        branch: 'task/TASK-000',
      },
      {
        ...baseTask,
        id: 'TASK-200',
        title: 'Bloqueada',
        status: 'ready',
        depends_on: ['TASK-999'],
        branch: 'task/TASK-200',
      },
      {
        ...baseTask,
        id: 'TASK-100',
        title: 'Escolhida',
        status: 'ready',
        depends_on: ['TASK-000'],
        branch: 'task/TASK-100',
      },
    ];

    expect(chooseNextReadyTask(tasks)?.id).toBe('TASK-100');
  });
});
