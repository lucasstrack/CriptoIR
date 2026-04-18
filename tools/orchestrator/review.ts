import { execaSync } from 'execa';
import { loadTasks } from './parser.ts';

function getDiff(branch: string) {
  try {
    return execaSync('git', ['diff', '--stat', 'main...', branch], {
      cwd: process.cwd(),
    }).stdout;
  } catch {
    return execaSync('git', ['diff', '--stat', 'HEAD~1..HEAD'], {
      cwd: process.cwd(),
    }).stdout;
  }
}

const taskId = process.argv[2];

if (!taskId) {
  console.error('Uso: npm run orch:review -- TASK-XXX');
  process.exit(1);
}

const task = loadTasks().find((item) => item.id === taskId);

if (!task) {
  console.error(`Task nao encontrada: ${taskId}`);
  process.exit(1);
}

console.log(`Reviewer prompt para ${task.id} — ${task.title}`);
console.log('');
console.log('Validar criterios de aceite:');
for (const item of task.acceptance) {
  console.log(`- ${item.criterion}`);
}
console.log('');
console.log('Comandos de verificacao:');
for (const item of task.acceptance) {
  console.log(`- ${item.verify}`);
}
console.log('');
console.log('Diff resumido:');
console.log(getDiff(task.branch));
