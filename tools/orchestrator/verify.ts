import { execaCommand } from 'execa';
import pc from 'picocolors';
import { loadTasks } from './parser.ts';

async function run() {
  const taskId = process.argv[2];

  if (!taskId) {
    console.error('Uso: npm run orch:verify -- TASK-XXX');
    process.exit(1);
  }

  const task = loadTasks().find((item) => item.id === taskId);

  if (!task) {
    console.error(`Task nao encontrada: ${taskId}`);
    process.exit(1);
  }

  let hasFailure = false;

  for (const item of task.acceptance) {
    process.stdout.write(`${item.criterion} ... `);
    try {
      await execaCommand(item.verify, {
        cwd: process.cwd(),
        shell: true,
        stdio: 'pipe',
      });
      console.log(pc.green('OK'));
    } catch (error) {
      hasFailure = true;
      console.log(pc.red('FAIL'));
      if (error instanceof Error && 'shortMessage' in error) {
        console.log(String(error.shortMessage));
      }
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

run();
