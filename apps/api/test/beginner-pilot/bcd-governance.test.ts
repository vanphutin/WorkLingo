import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const root = resolve(__dirname, '../../../..'), base = 'b08e96c2e12079d07d58b13b691a70f6f1627636';
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 }).toString();
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const sha = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
test('005 authority exactly binds current finite delta and frozen approval', async () => {
  const scopePath = 'mandate/reports/2026-10-30-r12b-bcd-scope.json', scope = JSON.parse(read(scopePath));
  assert.equal(sha(read(scopePath)), 'b0ec96a587ac11f974348fb78fe1134cace129230a0d2181cc90083277f31a02');
  assert.equal(scope.baseline.head, base); assert.equal(scope.budget.additionalUSD, '0'); assert.equal(scope.budget.inkPoints, '1.5');
  assert.equal(scope.authority.remoteInference, false); assert.equal(scope.authority.credentialsOrEnv, false); assert.equal(scope.authority.realParticipants, false);
  const itemPath = scope.allowlist.cliBookkeeping.find((p: string) => p.startsWith('mandate/items/'));
  const parts = read(itemPath).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u)!; const item = JSON.parse(parts[1]!);
  const model = await import(pathToFileURL(resolve(root, '.agents/skills/mandate-steward/scripts/model.mjs')).href);
  assert.equal(item.approval.proposal_hash, '1b98d311054acd364a2cc56c47de35662c514bb56b17737122bf753675e46bd4');
  assert.equal(model.proposalHash(item, parts[2]), item.approval.proposal_hash);
  assert.ok(['implementing', 'verified'].includes(item.status));
  const allowed = new Set([...scope.allowlist.modify, ...scope.allowlist.create, ...scope.allowlist.cliBookkeeping]);
  const changed = [...git('diff', '--name-only', base).trim().split('\n'), ...git('ls-files', '--others', '--exclude-standard').trim().split('\n')].filter(Boolean);
  for (const p of changed) assert.ok(allowed.has(p), 'OUTSIDE_SCOPE:' + p);
  const existing = new Set(git('ls-tree', '-r', '--name-only', base).trim().split('\n'));
  const mutable = new Set([...scope.allowlist.modify, ...scope.allowlist.cliBookkeeping]);
  for (const p of changed.filter(p => existing.has(p) && !mutable.has(p))) {
    assert.equal(read(p).replace(/\r\n/gu, '\n'), git('show', base + ':' + p).replace(/\r\n/gu, '\n'), 'PROTECTED_BASELINE:' + p);
  }
});
test('004 historical authority remains exact at its closure epoch', () => {
  const scope = JSON.parse(read('mandate/reports/2026-10-30-r12b-evidence-closure-scope.json'));
  const allowed = new Set([...scope.allowlist.modify, ...scope.allowlist.create, ...scope.allowlist.cliBookkeeping]);
  for (const p of git('diff', '--name-only', scope.baseline.head, base).trim().split('\n').filter(Boolean)) assert.ok(allowed.has(p), 'HISTORICAL_004_SCOPE:' + p);
  assert.equal(git('rev-list', '--count', 'main..' + base).trim(), '103');
  const qa = JSON.parse(read('docs/qualification/beginner-r12b-expert-qa-final.json'));
  const oracle = JSON.parse(read('docs/qualification/beginner-r12b-oracle-adjudication-final.json'));
  assert.equal(qa.items.length, 82); assert.equal(qa.counts.humanExpertVerified, 0); assert.equal(qa.counts.phoneticVerified, 0);
  assert.equal(oracle.decisions.length, 128); assert.equal(oracle.schedule.length, 160); assert.equal(oracle.liveOracleReady, false);
  assert.equal(sha(read('docs/qualification/beginner-r12b-expert-qa-final.json')), '9dbbd4eac3f7922d3d4d53471f636681bfa7c57ada0cb0e9a7937bdba261cd21');
  assert.equal(sha(read('docs/qualification/beginner-r12b-oracle-adjudication-final.json')), 'bdcf1aa547088fcb44c3e0ad7b729ef425d10dc5bbdf33c053d5742e678ca2ba');
});
test('final BCD evidence index binds every artifact without inventing external readiness', () => {
  const index = JSON.parse(read('docs/qualification/beginner-r12b-bcd-evidence-index.json'));
  assert.equal(index.schemaVersion, 'worklingo-r12b-bcd-evidence-index/1'); assert.equal(index.releasePermitted, false);
  assert.equal(index.external.humanExpertVerified, 0); assert.equal(index.external.realLearnerObservations, 0);
  assert.equal(index.external.discoveryStarts, 0); assert.equal(index.external.additionalUSD, '0'); assert.equal(index.external.inkPointsSpent, '0');
  assert.equal(index.qaItems.length, 82); assert.equal(new Set(index.qaItems.map((i: { id: string }) => i.id)).size, 82);
  assert.equal(index.lessons.length, 8); assert.equal(index.releaseGates.length, 15);
  for (const a of index.artifacts) assert.equal(sha(readFileSync(resolve(root, a.path))), a.sha256, 'ARTIFACT_DRIFT:' + a.path);
  const baseline = JSON.parse(read('docs/qualification/beginner-r12b-lesson-qualification-final.json'));
  for (const l of index.lessons) {
    const old = baseline.lessons.find((x: { lesson: string }) => x.lesson === l.lesson);
    assert.deepEqual(l.sourceBundle, old.sourceBundle); assert.equal(l.realLearnerObservations, 0); assert.equal(l.humanExpertVerified, 0);
    assert.equal(sha(readFileSync(resolve(root, l.sourceBundle.sourcePath))), l.sourceBundle.sourceSha256);
  }
});
