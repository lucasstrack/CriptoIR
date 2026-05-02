import fs from 'node:fs';
import path from 'node:path';
import { execaCommand } from 'execa';
import pc from 'picocolors';
import { loadTasks } from './parser.ts';

const REVIEW_DATABASE_URL = process.env.CRIPTOIR_REVIEW_DATABASE_URL ?? 'file:./review.db';
const DEV_DB_REFERENCE = /DATABASE_URL\s*=\s*["']?file:[^"'\s]*dev\.db(?:$|[?"'\s])/;
const DEV_DB_URL = /file:[^"'\s]*dev\.db(?:$|[?"'\s])/;
const MIGRATION_FILE = path.resolve(
  process.cwd(),
  'prisma/migrations/20260418170433_init/migration.sql',
);
const SCHEMA_DIR = path.resolve(process.cwd(), 'prisma');

function referencesDevDatabase(command: string) {
  return DEV_DB_REFERENCE.test(command);
}

function databasePathFromUrl(url: string) {
  const match = url.match(/^file:(?:\/\/)?(.*)$/);
  if (!match) {
    throw new Error(`DATABASE_URL de review nao suportada: ${url}`);
  }
  const raw = match[1];
  return path.isAbsolute(raw) ? raw : path.resolve(SCHEMA_DIR, raw);
}

async function ensureReviewDatabase() {
  if (DEV_DB_URL.test(REVIEW_DATABASE_URL)) {
    throw new Error(`Banco de review nao pode apontar para dev.db: ${REVIEW_DATABASE_URL}`);
  }

  const databaseFile = databasePathFromUrl(REVIEW_DATABASE_URL);
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

  if (!fs.existsSync(databaseFile) || fs.statSync(databaseFile).size === 0) {
    await execaCommand(
      `npx prisma db execute --file "${MIGRATION_FILE}" --schema prisma/schema.prisma`,
      {
        cwd: process.cwd(),
        shell: true,
        env: { ...process.env, DATABASE_URL: REVIEW_DATABASE_URL },
      },
    );
  }
}

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

  await ensureReviewDatabase();

  let hasFailure = false;

  for (const item of task.acceptance) {
    process.stdout.write(`${item.criterion} ... `);
    try {
      if (referencesDevDatabase(item.verify)) {
        throw new Error(
          `Comando de review tenta usar dev.db: ${item.verify}. ` +
            `Use CRIPTOIR_REVIEW_DATABASE_URL ou ${REVIEW_DATABASE_URL}.`,
        );
      }
      await execaCommand(item.verify, {
        cwd: process.cwd(),
        shell: true,
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: REVIEW_DATABASE_URL },
      });
      console.log(pc.green('OK'));
    } catch (error) {
      hasFailure = true;
      console.log(pc.red('FAIL'));
      if (error instanceof Error && 'shortMessage' in error) {
        console.log(String(error.shortMessage));
      } else if (error instanceof Error) {
        console.log(error.message);
      }
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

run();
