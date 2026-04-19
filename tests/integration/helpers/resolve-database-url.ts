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

export function resolveDatabaseUrl(): string {
  const merged = {
    ...readEnvFile(path.resolve(process.cwd(), '.env')),
    ...readEnvFile(path.resolve(process.cwd(), '.env.local')),
    ...process.env,
  };

  const url = merged.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL nao encontrada em .env, .env.local ou process.env. Copie .env.example para .env.local ou exporte DATABASE_URL.',
    );
  }
  return url;
}
