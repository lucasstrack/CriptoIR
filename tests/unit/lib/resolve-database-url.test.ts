import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  resolveDatabaseUrl,
  __internals,
} from '@/../tests/integration/helpers/resolve-database-url';

const { pointsToDevDb } = __internals;

describe('pointsToDevDb (guard interno)', () => {
  it.each([
    ['file:./dev.db', true],
    ['file:dev.db', true],
    ['file:/abs/path/dev.db', true],
    ['file:///abs/path/dev.db', true],
    ['file:.\\dev.db', true], // Windows
  ])('bloqueia %s', (url, expected) => {
    expect(pointsToDevDb(url)).toBe(expected);
  });

  it.each([
    ['file:./test.db', false],
    ['file:./prisma/test.db', false],
    ['file:devilish.db', false],
    ['file:./dev.db.backup', false],
    ['file:./my-dev.db', false], // no separator before dev.db
    ['file:dev.db2', false],
  ])('libera %s', (url, expected) => {
    expect(pointsToDevDb(url)).toBe(expected);
  });
});

describe('resolveDatabaseUrl (precedencia + fallback + guard)', () => {
  const originalCwd = process.cwd();
  const originalEnv = process.env.DATABASE_URL;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolvedburl-'));
    process.chdir(tempDir);
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it('fallback para file:./test.db quando nada esta configurado', () => {
    expect(resolveDatabaseUrl()).toBe('file:./test.db');
  });

  it('.env.test tem precedencia sobre process.env seguro', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env.test'),
      'DATABASE_URL="file:./test-env.db"\n',
    );
    process.env.DATABASE_URL = 'file:/tmp/ci.db';
    expect(resolveDatabaseUrl()).toBe('file:./test-env.db');
  });

  it('.env.test.local tem precedencia sobre .env.test', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env.test'),
      'DATABASE_URL="file:./test-env.db"\n',
    );
    fs.writeFileSync(
      path.join(tempDir, '.env.test.local'),
      'DATABASE_URL="file:./test-local.db"\n',
    );
    expect(resolveDatabaseUrl()).toBe('file:./test-local.db');
  });

  it('process.env seguro tem precedencia sobre fallback', () => {
    process.env.DATABASE_URL = 'file:/tmp/ci.db';
    expect(resolveDatabaseUrl()).toBe('file:/tmp/ci.db');
  });

  it('lanca se resolver para dev.db (via process.env ignorado, fallback usado)', () => {
    // process.env aponta pra dev.db → descartado; .env.test aponta pra dev.db → bloqueado.
    fs.writeFileSync(
      path.join(tempDir, '.env.test'),
      'DATABASE_URL="file:./dev.db"\n',
    );
    expect(() => resolveDatabaseUrl()).toThrow(/nao podem rodar contra/);
  });

  it('ignora process.env apontando pra dev.db e cai no fallback', () => {
    process.env.DATABASE_URL = 'file:./dev.db';
    expect(resolveDatabaseUrl()).toBe('file:./test.db');
  });
});
