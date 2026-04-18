import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';
import { taskStatusValues, type Task } from './types.ts';

const taskIdSchema = z.string().regex(/^TASK-\d{3}$/);

function normalizeListItem(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, itemValue]) => `${key}: ${String(itemValue)}`)
      .join(', ');
  }

  return String(value);
}

const frontMatterSchema = z.object({
  id: taskIdSchema,
  title: z.string().min(1),
  status: z.enum(taskStatusValues),
  wave: z.number().int().nonnegative(),
  depends_on: z.array(taskIdSchema),
  parallel_safe_with: z.array(taskIdSchema),
  owner_dev: z.string().nullable(),
  owner_reviewer: z.string().nullable(),
  branch: z.string().min(1),
  acceptance: z.array(
    z.object({
      criterion: z.string().min(1),
      verify: z.string().min(1),
    }),
  ),
  deliverables: z.array(z.unknown()).transform((items) => items.map(normalizeListItem)),
  notes: z.string().optional(),
});

export function parseTaskContent(filePath: string, fileContent: string): Task {
  const parsed = matter(fileContent);
  const data = frontMatterSchema.parse(parsed.data);

  return {
    ...data,
    filePath,
  };
}

export function loadTasks(tasksDir = path.resolve(process.cwd(), 'docs/tarefas')): Task[] {
  const files = fs
    .readdirSync(tasksDir)
    .filter((file) => file.endsWith('.md'))
    .sort();

  const tasks = files.map((file) => {
    const filePath = path.join(tasksDir, file);
    return parseTaskContent(filePath, fs.readFileSync(filePath, 'utf8'));
  });

  const knownIds = new Set(tasks.map((task) => task.id));
  for (const task of tasks) {
    for (const dep of [...task.depends_on, ...task.parallel_safe_with]) {
      if (!knownIds.has(dep)) {
        throw new Error(`${task.id} referencia task inexistente: ${dep}`);
      }
    }
  }

  return tasks;
}
