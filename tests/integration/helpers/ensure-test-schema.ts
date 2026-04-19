import fs from 'node:fs';
import path from 'node:path';
import { execaCommandSync } from 'execa';
import { resolveDatabaseUrl } from './resolve-database-url';

const migrationFile = path.resolve(
  process.cwd(),
  'prisma/migrations/20260418170433_init/migration.sql',
);
const databaseFile = path.resolve(process.cwd(), 'prisma/dev.db');

export function ensureTestSchema() {
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

  if (!fs.existsSync(databaseFile) || fs.statSync(databaseFile).size === 0) {
    execaCommandSync(
      `npx prisma db execute --file "${migrationFile}" --schema prisma/schema.prisma`,
      {
        cwd: process.cwd(),
        shell: true,
        env: { ...process.env, DATABASE_URL: resolveDatabaseUrl() },
      },
    );
  }
}
