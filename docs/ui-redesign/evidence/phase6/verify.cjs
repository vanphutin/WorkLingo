// Read-only final seal + source/preservation verifier; --require-clean is the handoff gate.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const git = (cwd, ...args) => cp.execFileSync('git', args, { cwd, encoding: 'utf8' });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const trackedEvidence = new Set(git(root, 'ls-files', '-z', '--', 'docs/ui-redesign/evidence/phase6').split('\0').filter(Boolean));
for (const [file, digest] of Object.entries(manifest.sourceSHA256)) assert.equal(hash(path.join(root, file)), digest, 'Source changed: ' + file);
for (const [file, digest] of Object.entries(manifest.documentSHA256)) assert.equal(hash(path.join(__dirname, '../..', file)), digest, 'Document changed: ' + file);
for (const [file, digest] of Object.entries(manifest.artifactSHA256)) {
  assert.equal(hash(path.join(__dirname, file)), digest, 'Evidence changed: ' + file);
  assert.ok(trackedEvidence.has('docs/ui-redesign/evidence/phase6/' + file), 'Evidence omitted from Git: ' + file);
}
const historical = JSON.parse(fs.readFileSync(path.join(__dirname, '../phase5/manifest.json'), 'utf8'));
for (const [file, digest] of Object.entries(historical.artifactSHA256)) assert.equal(hash(path.join(__dirname, '../phase5', file)), digest, 'Historical evidence changed: ' + file);
assert.equal(git(root, 'branch', '--show-current').trim(), 'codex/worklingo-liquid-glass-redesign');
assert.equal(git(root, 'rev-parse', '--show-toplevel').trim(), 'D:/Projects/WorkLingo-Liquid-Glass');
assert.equal(git(root, 'rev-parse', 'main').trim(), manifest.baselineMain);
assert.equal(git(root, 'diff', manifest.baselineMain, 'HEAD', '--', 'apps/api', 'packages', 'pnpm-lock.yaml', 'package.json', 'apps/web/package.json', 'apps/web/next.config.ts', 'apps/web/src/lib/api'), '');
const original = 'D:/Projects/WorkLingo';
const snapshot = JSON.parse(fs.readFileSync(path.join(process.env.TEMP, 'worklingo-liquid-glass-origin-20261019.json'), 'utf8'));
assert.equal(git(original, 'branch', '--show-current').trim(), snapshot.branch);
assert.equal(git(original, 'rev-parse', 'HEAD').trim(), snapshot.head);
assert.equal(git(original, 'status', '--porcelain=v1', '-uall'), snapshot.status);
for (const [file, digest] of Object.entries(snapshot.hashes)) assert.equal(hash(path.join(original, file)), digest, 'Original changed: ' + file);
const clean = git(root, 'status', '--porcelain=v1', '-uall').trim() === '';
if (process.argv.includes('--require-clean')) assert.equal(clean, true, 'Worktree must be clean');
console.log(JSON.stringify({ finalHead: git(root, 'rev-parse', 'HEAD').trim(), codeHead: manifest.codeHead, productHead: manifest.productHead, sources: Object.keys(manifest.sourceSHA256).length, artifacts: Object.keys(manifest.artifactSHA256).length, originalFilesPreserved: Object.keys(snapshot.hashes).length, mainUnchanged: true, originalStatusUnchanged: true, workingTreeClean: clean, readiness: manifest.readiness, result: 'PASS' }));
