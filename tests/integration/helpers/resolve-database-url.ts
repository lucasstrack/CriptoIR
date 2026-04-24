import fs from 'node:fs';
import path from 'node:path';

function readEnvFile(filePath: string): Record<string, string> {
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

// Testes de integracao truncam tabelas em `beforeEach`. Se rodarem contra o DB
// de dev (`./dev.db`), todos os dados reais somem. Este helper FORCA um DB
// dedicado de testes com a seguinte precedencia:
//
//  1) `.env.test.local` (nao versionado, para overrides locais)
//  2) `.env.test` (versionado; default do projeto = `file:./test.db`)
//  3) `process.env.DATABASE_URL` se apontar para algo explicitamente != dev.db
//     (ex.: CI setando `file:/tmp/ci.db`)
//  4) Fallback automatico `file:./test.db`
//
// Se a URL resolvida apontar para `dev.db`, falhamos rapido — em vez de
// destruir dados reais do usuario que rodou `npm run test` sem pensar.
//
// Matching: strip do prefixo `file:` e `//` opcional, depois procura por
// `dev.db` com delimitadores antes (inicio, `/`, ou `\`). Assim cobre
// `file:./dev.db`, `file:dev.db`, `file:///abs/dev.db`, Windows `file:.\dev.db`,
// e nao casa falsos positivos como `devilish.db` ou `dev.db.backup`.
const DEV_DB_PATTERN = /(?:^|[\/\\])dev\.db(?:$|\?)/;

function stripFilePrefix(url: string): string {
  return url.replace(/^file:(?:\/\/)?/, '');
}

function pointsToDevDb(url: string): boolean {
  const stripped = stripFilePrefix(url);
  // Se nao tem separador de path, compara direto (cobre `file:dev.db`).
  if (!stripped.includes('/') && !stripped.includes('\\')) {
    return stripped === 'dev.db' || stripped.startsWith('dev.db?');
  }
  return DEV_DB_PATTERN.test(stripped);
}

export function resolveDatabaseUrl(): string {
  const envTestLocal = readEnvFile(path.resolve(process.cwd(), '.env.test.local'));
  const envTest = readEnvFile(path.resolve(process.cwd(), '.env.test'));

  const fromTestEnv = envTestLocal.DATABASE_URL ?? envTest.DATABASE_URL;
  const fromProcess = process.env.DATABASE_URL;
  const processIsSafe = fromProcess !== undefined && !pointsToDevDb(fromProcess);

  const resolved =
    fromTestEnv ??
    (processIsSafe ? fromProcess : undefined) ??
    'file:./test.db';

  if (pointsToDevDb(resolved)) {
    throw new Error(
      `Testes de integracao nao podem rodar contra "${resolved}" (DB de dev). ` +
        `Crie .env.test com DATABASE_URL="file:./test.db" ou exporte ` +
        `DATABASE_URL explicitamente antes do comando de teste.`,
    );
  }

  return resolved;
}

// Export para testes unitarios do guard.
export const __internals = { pointsToDevDb };
