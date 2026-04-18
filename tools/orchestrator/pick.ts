import { loadTasks } from './parser.ts';
import type { Task } from './types.ts';

export function chooseNextReadyTask(tasks: Task[]): Task | null {
  const doneIds = new Set(tasks.filter((task) => task.status === 'done').map((task) => task.id));

  const candidates = tasks
    .filter((task) => task.status === 'ready')
    .filter((task) => task.depends_on.every((dep) => doneIds.has(dep)))
    .sort((a, b) => a.id.localeCompare(b.id));

  return candidates[0] ?? null;
}

function printPrompt(task: Task) {
  const acceptance = task.acceptance.map((item) => `- ${item.criterion}`).join('\n');
  const deliverables = task.deliverables.map((item) => `- ${item}`).join('\n');
  const dependsOn = task.depends_on.length > 0 ? task.depends_on.join(', ') : 'nenhuma';

  console.log(`Task escolhida: ${task.id} — ${task.title}`);
  console.log(`Wave: ${task.wave}`);
  console.log(`Branch sugerida: ${task.branch}`);
  console.log(`Dependencias satisfeitas: ${dependsOn}`);
  console.log('');
  console.log('Prompt sugerido para o agente Dev:');
  console.log(`Implemente ${task.id} (${task.title}).`);
  console.log('Criterios de aceite:');
  console.log(acceptance);
  console.log('Deliverables esperados:');
  console.log(deliverables);
}

const isCli = process.argv[1]?.endsWith('pick.ts');

if (isCli) {
  const task = chooseNextReadyTask(loadTasks());

  if (!task) {
    console.log('Nenhuma task ready com dependencias concluidas.');
    process.exit(0);
  }

  printPrompt(task);
}
