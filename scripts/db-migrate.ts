import fs from 'node:fs';
import path from 'node:path';
import { execaCommand } from 'execa';

function readEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
      }),
  );
}

function getDatabaseFile(databaseUrl: string) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(`DATABASE_URL nao suportada neste scaffold: ${databaseUrl}`);
  }

  const relativePath = databaseUrl.slice('file:'.length);
  return path.resolve(process.cwd(), 'prisma', relativePath.replace(/^\.\//, ''));
}

function getMigrationName() {
  const nameArg = process.argv.find((arg) => arg.startsWith('--name='));
  if (nameArg) {
    return nameArg.slice('--name='.length);
  }

  const nameIndex = process.argv.findIndex((arg) => arg === '--name');
  if (nameIndex >= 0) {
    return process.argv[nameIndex + 1] ?? 'init';
  }

  return 'init';
}

function getExistingMigrationDir(migrationsDir: string, migrationName: string) {
  if (!fs.existsSync(migrationsDir)) {
    return null;
  }

  const directory = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(`_${migrationName}`))
    .sort((a, b) => a.name.localeCompare(b.name))
    .at(-1);

  return directory ? path.join(migrationsDir, directory.name) : null;
}

function getDatabaseUrl() {
  const env = {
    ...readEnvFile(path.resolve(process.cwd(), '.env')),
    ...readEnvFile(path.resolve(process.cwd(), '.env.local')),
    ...process.env,
  };

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao encontrada em .env, .env.local ou ambiente.');
  }

  return databaseUrl;
}

function shouldInitializeFromScratch(databaseFile: string) {
  return !fs.existsSync(databaseFile) || fs.statSync(databaseFile).size === 0;
}

async function ensureMigrationFile(
  migrationFile: string,
  databaseUrl: string,
  databaseFile: string,
) {
  if (fs.existsSync(migrationFile) && fs.readFileSync(migrationFile, 'utf8').trim().length > 0) {
    return;
  }

  const diffCommand = shouldInitializeFromScratch(databaseFile)
    ? `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "${migrationFile}"`
    : `DATABASE_URL="${databaseUrl}" npx prisma migrate diff --from-url "${databaseUrl}" --to-schema-datamodel prisma/schema.prisma --script > "${migrationFile}"`;

  await execaCommand(diffCommand, {
    cwd: process.cwd(),
    shell: true,
  });

  if (fs.readFileSync(migrationFile, 'utf8').trim().length === 0) {
    throw new Error('Nao foi possivel gerar o SQL da migration.');
  }
}

async function executeMigration(migrationFile: string) {
  await execaCommand(
    `npx dotenv -e .env.local -- prisma db execute --file "${migrationFile}" --schema prisma/schema.prisma`,
    {
      cwd: process.cwd(),
      shell: true,
    },
  );
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const databaseFile = getDatabaseFile(databaseUrl);
  const migrationsDir = path.resolve(process.cwd(), 'prisma/migrations');
  const migrationName = getMigrationName();
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  const migrationDir =
    getExistingMigrationDir(migrationsDir, migrationName) ??
    path.join(migrationsDir, `${timestamp}_${migrationName}`);
  const migrationFile = path.join(migrationDir, 'migration.sql');
  const migrationLockFile = path.join(migrationsDir, 'migration_lock.toml');

  fs.mkdirSync(migrationsDir, { recursive: true });
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
  fs.mkdirSync(migrationDir, { recursive: true });

  if (!fs.existsSync(migrationLockFile)) {
    fs.writeFileSync(migrationLockFile, 'provider = "sqlite"\n');
  }

  await ensureMigrationFile(migrationFile, databaseUrl, databaseFile);

  if (process.argv.includes('--push')) {
    console.log(`Migration SQL pronta em ${migrationFile}`);
    return;
  }

  if (!shouldInitializeFromScratch(databaseFile)) {
    console.log(`Banco ja inicializado em ${databaseFile}. Nenhuma alteracao aplicada.`);
    return;
  }

  await executeMigration(migrationFile);
  console.log(`Migration aplicada em ${databaseFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
