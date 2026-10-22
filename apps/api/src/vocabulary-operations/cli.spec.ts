import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(path.resolve('package.json'));
const runner = require.resolve('tsx/cli');
const cli = path.resolve('src/vocabulary-operations/cli.ts');
describe('Vocabulary CLI executable boundaries', () => {
  it('refuses a non-isolated registry target without disclosing credentials', () => {
    const result = spawnSync(process.execPath, [runner, cli, 'registry', '--isolated'], { encoding: 'utf8', timeout: 15000, env: { ...process.env, TEST_DATABASE_URL: 'postgresql://secret-user:secret-password@example.test:5432/worklingo' } });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Vocabulary operation failed');
    expect(result.stderr).not.toContain('secret-password');
  }, 20000);
  it('returns an incomplete report with no writes for a missing source row', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'vocabulary-cli-'));
    try {
      const file = path.join(directory, 'manifest.json');
      writeFileSync(file, JSON.stringify({ documentSha256: 'a'.repeat(64), pageCount: 1, cefrLevel: 'A1', parserVersion: 'synthetic/1', inventory: { pages: [{ pageIndex: 0, detectedKeys: ['topic-1:1'], exceptions: [] }] }, rows: [] }));
      const result = spawnSync(process.execPath, [runner, cli, 'dry-run', file], { encoding: 'utf8', timeout: 15000 });
      expect(result.status).toBe(2);
      expect(JSON.parse(result.stdout)).toMatchObject({ status: 'INCOMPLETE', databaseWrites: 0, missingKeys: ['topic-1:1'] });
    } finally {
      const resolved = path.resolve(directory);
      if (resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith('vocabulary-cli-')) rmSync(resolved, { recursive: true });
    }
  }, 20000);
});
