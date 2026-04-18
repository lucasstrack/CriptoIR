import pc from 'picocolors';
import { loadTasks } from './parser.ts';

const tasks = loadTasks().sort((a, b) => a.wave - b.wave || a.id.localeCompare(b.id));

console.log(['ID', 'STATUS', 'WAVE', 'BRANCH', 'TITLE'].join('\t'));

for (const task of tasks) {
  const status =
    task.status === 'done'
      ? pc.green(task.status)
      : task.status === 'ready'
        ? pc.cyan(task.status)
        : task.status === 'blocked'
          ? pc.yellow(task.status)
          : pc.white(task.status);

  console.log([task.id, status, String(task.wave), task.branch, task.title].join('\t'));
}
