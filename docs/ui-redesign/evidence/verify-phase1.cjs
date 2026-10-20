// Read-only isolation check. Snapshot is kept outside either checkout, never committed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');

const worktree = path.resolve(__dirname, '../../..');
const origin = 'D:/Projects/WorkLingo';
const snapshotPath = process.argv[2];
assert.ok(snapshotPath, 'Pass the origin snapshot path captured before worktree creation');
const baseline = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const git = (cwd, ...args) => cp.execFileSync('git', args, { cwd, encoding: 'utf8' });
assert.equal(git(worktree, 'branch', '--show-current').trim(), 'codex/worklingo-liquid-glass-redesign');
assert.equal(git(worktree, 'rev-parse', '--show-toplevel').trim(), 'D:/Projects/WorkLingo-Liquid-Glass');
assert.equal(git(origin, 'branch', '--show-current').trim(), baseline.branch);
assert.equal(git(origin, 'rev-parse', 'HEAD').trim(), baseline.head);
assert.equal(git(origin, 'rev-parse', 'refs/heads/main').trim(), baseline.main);
assert.equal(git(origin, 'status', '--porcelain=v1', '-uall'), baseline.status);
for (const [file, expected] of Object.entries(baseline.hashes)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(origin, file))).digest('hex');
  assert.equal(actual, expected, `Origin file changed: ${file}`);
}
assert.equal(git(worktree, 'diff', baseline.head, '--', 'apps/api', 'packages', 'pnpm-lock.yaml', 'package.json'), '');
const sourcePages = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
  const file = path.join(dir, item.name);
  return item.isDirectory() ? sourcePages(file) : item.name === 'page.tsx' ? [file] : [];
});
assert.equal(sourcePages(path.join(worktree, 'apps/web/src/app')).length, 34);
const result = {
  baseline: baseline.head, branch: 'codex/worklingo-liquid-glass-redesign', worktree,
  originMainUnchanged: true, originStatusUnchanged: true,
  originFilesPreserved: Object.keys(baseline.hashes).length,
  backendContractsAndDependenciesUnchanged: true, applicationRouteCount: 34,
  userDirtyApplicationSourceTransferred: false,
};
fs.writeFileSync(path.join(__dirname, 'phase1-preservation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
