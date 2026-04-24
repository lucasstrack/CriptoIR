import fs from 'node:fs';
import path from 'node:path';
import { execaCommandSync } from 'execa';
import { resolveDatabaseUrl } from './resolve-database-url';

const migrationFile = path.resolve(
  process.cwd(),
  'prisma/migrations/20260418170433_init/migration.sql',
);

// Extrai o path absoluto do arquivo SQLite a partir da URL.
// Prisma interpreta paths relativos em `file:./xxx` como RELATIVOS AO
// `schema.prisma` (dentro da pasta `prisma/`) — nao ao cwd do processo.
const SCHEMA_DIR = path.resolve(process.cwd(), 'prisma');

// Aceita tanto `file:./path` (Prisma-style) quanto `file:///abs/path` (URL-style).
function databasePathFromUrl(url: string): string {
  const match = url.match(/^file:(?:\/\/)?(.*)$/);
  if (!match) {
    throw new Error(`DATABASE_URL "${url}" nao e um path SQLite (esperado prefixo "file:").`);
  }
  const raw = match[1];
  return path.isAbsolute(raw) ? raw : path.resolve(SCHEMA_DIR, raw);
}

export function ensureTestSchema() {
  const databaseUrl = resolveDatabaseUrl();
  const databaseFile = databasePathFromUrl(databaseUrl);

  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

  if (!fs.existsSync(databaseFile) || fs.statSync(databaseFile).size === 0) {
    execaCommandSync(
      `npx prisma db execute --file "${migrationFile}" --schema prisma/schema.prisma`,
      {
        cwd: process.cwd(),
        shell: true,
        env: { ...process.env, DATABASE_URL: databaseUrl },
      },
    );
  }
}
