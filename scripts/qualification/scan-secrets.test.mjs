import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';

const source = fileURLToPath(new URL('./scan-secrets.ps1', import.meta.url));

function scan(file, contents) {
  const root = mkdtempSync(path.join(tmpdir(), 'worklingo-secret-scan-'));
  assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep));
  try {
    const directory = path.join(root, 'scripts', 'qualification');
    mkdirSync(directory, { recursive: true });
    copyFileSync(source, path.join(directory, 'scan-secrets.ps1'));
    writeFileSync(path.join(root, file), contents);
    for (const args of [['init', '--quiet'], ['add', '--', file, 'scripts/qualification/scan-secrets.ps1']]) {
      const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    }
    return spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
      path.join(directory, 'scan-secrets.ps1')], { cwd: root, encoding: 'utf8', timeout: 15_000 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('a clean tracked repository including the scanner passes', () => {
  const result = scan('app.ts', 'export const answer = 42;\n');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Tracked-file secret scan passed/u);
});

for (const kind of ['', 'RSA ', 'EC ', 'OPENSSH ', 'ENCRYPTED ']) {
  test(`rejects a tracked ${kind || 'PKCS8 '}private key header`, () => {
    const header = ['-----BEGIN ', kind, 'PRIVATE KEY-----'].join('');
    const result = scan('fixture.pem', `${header}\nsynthetic-test-data\n`);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /private-key material was found/u);
    assert.ok(!result.stderr.includes(header));
  });
}

test('rejects a tracked environment file', () => {
  const result = scan('.env.local', 'FIXTURE_ONLY=example\n');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /non-example environment file is tracked/u);
});

test('permits the tracked example environment file', () => {
  const result = scan('.env.example', 'FIXTURE_ONLY=example\n');
  assert.equal(result.status, 0, result.stderr);
});
