import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { test } from 'node:test';

const cli = fileURLToPath(new URL('./mandate.mjs', import.meta.url));
const faultLoader = fileURLToPath(new URL('./test-fixtures/fault-loader.cjs', import.meta.url));
const proposal = () => ({
  title: 'Preserve selected audio voice', type: 'bug', owner: null, priority: 'P2',
  confidence: 'medium', effort: 's', impact: 3, problem: 'Selected voice is lost after navigating.',
  value: 'Learners can resume listening in their selected voice.', scope: ['web/audio'],
  dedupe_key: 'web/audio:selected-voice-navigation',
  evidence: [{ kind: 'observation', reference: 'docs/evidence.md:1', observation: 'Synthetic trace: selected voice resets on route change.' }],
  acceptance: ['Selected voice survives route changes and reload.'],
  risk: { level: 'low', breaking: false, data_change: false, external_effect: false, rollback: 'Revert the isolated UI change.' },
  backlog_reference: 'docs/IMPLEMENTATION_ROADMAP.md', plan_reference: null, sprint_reference: null,
  body: '## Analysis\n\nSynthetic evidence only; not a real WorkLingo defect.\n\n## Unknowns\n\nOther browsers are untested.',
});

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'worklingo-mandate-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs'));
  for (const name of ['evidence.md', 'IMPLEMENTATION_ROADMAP.md', 'plan.md', 'approval.md', 'checks.md']) {
    writeFileSync(join(root, 'docs', name), 'Synthetic test evidence and authorization.\n');
  }
  mkdirSync(join(root, 'mandate'));
  for (const name of ['items', 'archive', 'reports', 'templates']) mkdirSync(join(root, 'mandate', name));
  return root;
}

function run(root, command, flags = []) {
  return spawnSync(process.execPath, [cli, command, '--root', root, ...flags], { encoding: 'utf8' });
}
function faultRun(root, mode, command, flags = []) {
  return spawnSync(process.execPath, ['--require', faultLoader, cli, command, '--root', root, ...flags],
    { encoding: 'utf8', env: { ...process.env, MANDATE_TEST_FAULT: mode } });
}
function ok(result) { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); }
function input(root, data) {
  const path = join(root, 'input.json'); writeFileSync(path, JSON.stringify(data)); return path;
}
function create(root, data = proposal(), date = '2026-10-14') {
  if (!readdirSync(join(root, 'mandate')).includes('INDEX.md')) ok(run(root, 'reindex'));
  return ok(run(root, 'create', ['--input', input(root, data), '--date', date]));
}
function transition(root, id, status, details = {}) {
  return run(root, 'transition', ['--id', id, '--status', status, '--input', input(root,
    { actor: 'test-human', reason: 'Synthetic lifecycle decision.', ...details })]);
}
function file(root, folder = 'items') {
  return join(root, 'mandate', folder, readdirSync(join(root, 'mandate', folder)).find(n => n.endsWith('.md')));
}
function metadata(root, folder = 'items') {
  return JSON.parse(readFileSync(file(root, folder), 'utf8').split('---')[1]);
}
function rejected(result, message) { assert.notEqual(result.status, 0); assert.match(result.stderr, message); }
function approve(root, id) {
  ok(transition(root, id, 'triaged', { owner: 'content-owner' }));
  ok(transition(root, id, 'approved', { reference: 'docs/approval.md' }));
}

test('creates a parseable item and matching index with unique daily IDs', t => {
  const root = setup(t); const first = create(root);
  assert.equal(first.id, 'MND-20261014-001');
  assert.equal(metadata(root).status, 'captured');
  assert.match(file(root), /MND-20261014-001-bug-preserve-selected-audio-voice.md$/);
  assert.match(readFileSync(join(root, 'mandate/INDEX.md'), 'utf8'), /MND-20261014-001/);
  const other = proposal(); other.title = 'Improve course pacing'; other.dedupe_key = 'curriculum:pacing';
  assert.equal(create(root, other).id, 'MND-20261014-002'); ok(run(root, 'validate'));
});

test('rejects exact duplicates across categories without changing files', t => {
  const root = setup(t); create(root); const before = readFileSync(join(root, 'mandate/INDEX.md'), 'utf8');
  const duplicate = proposal(); duplicate.type = 'performance'; duplicate.title = 'Audio slowdown';
  rejected(run(root, 'create', ['--input', input(root, duplicate)]), /duplicate/i);
  assert.equal(readdirSync(join(root, 'mandate/items')).length, 1);
  assert.equal(readFileSync(join(root, 'mandate/INDEX.md'), 'utf8'), before);
});

test('find returns token-similar candidates and exact normalized title duplicates are blocked', t => {
  const root = setup(t); create(root);
  assert.equal(ok(run(root, 'find', ['--query', 'selected voice audio'])).candidates[0].id, 'MND-20261014-001');
  const p = proposal(); p.title = ' PRESERVE   SELECTED AUDIO VOICE '; p.dedupe_key = 'different:key';
  rejected(run(root, 'create', ['--input', input(root, p)]), /duplicate/i);
});

test('rejects missing evidence, empty value and unknown metadata', t => {
  const root = setup(t); ok(run(root, 'reindex'));
  for (const change of [{ evidence: [] }, { value: '   ' }, { invented: 'field' }]) {
    rejected(run(root, 'create', ['--input', input(root, { ...proposal(), ...change })]), /evidence|value|unknown/i);
  }
  assert.equal(readdirSync(join(root, 'mandate/items')).length, 0);
});

test('rejects missing evidence references and unsafe path escapes', t => {
  const root = setup(t); ok(run(root, 'reindex'));
  for (const reference of ['docs/missing.md', '../outside.md', 'docs/evidence.md:99']) {
    const p = proposal(); p.evidence[0].reference = reference;
    rejected(run(root, 'create', ['--input', input(root, p)]), /reference|path|line/i);
  }
});

test('requires owner, human approval reference and execution plan before implementation', t => {
  const root = setup(t); const p = proposal(); const { id } = create(root, p);
  rejected(transition(root, id, 'implementing'), /transition|approval/i);
  rejected(transition(root, id, 'triaged'), /owner/i);
  ok(transition(root, id, 'triaged', { owner: 'human-owner' }));
  rejected(transition(root, id, 'approved'), /reference/i);
  ok(transition(root, id, 'approved', { reference: 'docs/approval.md' }));
  rejected(transition(root, id, 'implementing'), /plan/i);
});

test('full lifecycle records verification and archives with consistent index', t => {
  const root = setup(t); const p = proposal(); p.plan_reference = 'docs/plan.md';
  const { id } = create(root, p); approve(root, id);
  ok(transition(root, id, 'implementing'));
  rejected(transition(root, id, 'verified'), /checks/i);
  rejected(transition(root, id, 'verified', { checks: [{ command: 'node test', result: 'failed', reference: 'docs/checks.md' }] }), /passed|result/i);
  ok(transition(root, id, 'verified', { checks: [{ command: 'node test', result: 'passed', reference: 'docs/checks.md' }] }));
  ok(transition(root, id, 'archived'));
  assert.equal(readdirSync(join(root, 'mandate/items')).length, 0);
  assert.equal(metadata(root, 'archive').history.at(-1).from, 'verified');
  assert.match(readFileSync(join(root, 'mandate/INDEX.md'), 'utf8'), /archive\/MND/);
  ok(run(root, 'validate'));
  rejected(run(root, 'create', ['--input', input(root, p)]), /duplicate/i);
});

test('archived rejected proposals retain outcome and IDs are never reused', t => {
  const root = setup(t); const { id } = create(root); ok(transition(root, id, 'triaged', { owner: 'owner' }));
  ok(transition(root, id, 'rejected')); ok(transition(root, id, 'archived'));
  assert.equal(metadata(root, 'archive').history.at(-1).from, 'rejected');
  const p = proposal(); p.title = 'Improve pacing'; p.dedupe_key = 'other:key';
  assert.equal(create(root, p).id, 'MND-20261014-002');
});

test('approved scope is immutable and explicit update revokes its approval', t => {
  const root = setup(t); const { id } = create(root); approve(root, id);
  const p = proposal(); p.value = 'New expanded scope and benefit.';
  ok(run(root, 'update', ['--id', id, '--input', input(root, p)]));
  assert.equal(metadata(root).status, 'captured'); assert.equal(metadata(root).approval, null);
  rejected(transition(root, id, 'implementing'), /transition|approval/i);
});

test('detects hand-edited approved body even when index still matches', t => {
  const root = setup(t); const { id } = create(root); approve(root, id);
  writeFileSync(file(root), readFileSync(file(root), 'utf8') + '\nChanged implementation scope.\n');
  rejected(run(root, 'validate'), /approval|hash/i);
  rejected(transition(root, id, 'implementing'), /approval|hash/i);
});

test('stale INDEX is detected and only explicit reindex repairs it', t => {
  const root = setup(t); create(root); writeFileSync(join(root, 'mandate/INDEX.md'), 'stale');
  rejected(run(root, 'validate'), /INDEX/i);
  rejected(transition(root, 'MND-20261014-001', 'triaged', { owner: 'owner' }), /INDEX/i);
  ok(run(root, 'reindex')); ok(run(root, 'validate'));
});

test('invalid dates and malformed frontmatter fail clearly', t => {
  const root = setup(t); ok(run(root, 'reindex'));
  rejected(run(root, 'create', ['--input', input(root, proposal()), '--date', '2026-02-30']), /date/i);
  create(root); writeFileSync(file(root), '---\nid: bad-yaml\n---\nBody');
  rejected(run(root, 'validate'), /JSON|frontmatter/i);
});

test('reference directories cannot masquerade as evidence files', t => {
  const root = setup(t); ok(run(root, 'reindex'));
  const p = proposal(); p.evidence[0].reference = 'docs';
  rejected(run(root, 'create', ['--input', input(root, p)]), /reference|file/i);
});

test('history cannot reset an implementing scope by hand', t => {
  const root = setup(t); const p = proposal(); p.plan_reference = 'docs/plan.md';
  const { id } = create(root, p); approve(root, id); ok(transition(root, id, 'implementing'));
  const source = readFileSync(file(root), 'utf8'); const item = metadata(root);
  item.status = 'captured'; item.approval = null;
  item.history.push({ at: new Date().toISOString(), actor: 'editor', from: 'implementing', to: 'captured',
    reason: 'Unapproved scope reset', event: 'update', reference: null });
  writeFileSync(file(root), `---\n${JSON.stringify(item, null, 2)}\n---\n${source.split('---').slice(2).join('---')}`);
  rejected(run(root, 'reindex'), /history|frozen/i);
});

test('exclusive lock fails closed and does not alter proposals', t => {
  const root = setup(t); create(root); mkdirSync(join(root, 'mandate/.lock'));
  rejected(run(root, 'create', ['--input', input(root, proposal())]), /lock/i);
  assert.equal(readdirSync(join(root, 'mandate/items')).length, 1);
});

test('register directory symlinks cannot redirect writes', t => {
  const root = setup(t); ok(run(root, 'reindex'));
  const outside = mkdtempSync(join(tmpdir(), 'mandate-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  rmSync(join(root, 'mandate/items'), { recursive: true });
  symlinkSync(outside, join(root, 'mandate/items'), 'junction');
  rejected(run(root, 'create', ['--input', input(root, proposal())]), /symlink|path/i);
  assert.equal(readdirSync(outside).length, 0);
});

test('concurrent creation cannot allocate duplicate IDs or corrupt INDEX', async t => {
  const root = setup(t); ok(run(root, 'reindex'));
  const inputs = ['first', 'second'].map((label) => {
    const p = proposal(); p.title = `Unique ${label} issue`; p.dedupe_key = `unique:${label}`;
    const path = join(root, `${label}.json`); writeFileSync(path, JSON.stringify(p)); return path;
  });
  const results = await Promise.all(inputs.map(path => new Promise(resolve => {
    const child = spawn(process.execPath, [cli, 'create', '--root', root, '--date', '2026-10-14', '--input', path]);
    let err = ''; child.stderr.on('data', c => { err += c; }); child.on('close', status => resolve({ status, err }));
  })));
  assert.ok(results.some(r => r.status === 0));
  assert.ok(results.every(r => r.status === 0 || /lock/i.test(r.err)));
  const ids = readdirSync(join(root, 'mandate/items')).map(n => n.slice(0, 16));
  assert.equal(new Set(ids).size, ids.length); ok(run(root, 'validate'));
});

test('partial creation never exposes an incomplete item at its final filename', t => {
  const root = setup(t); ok(run(root, 'reindex'));
  rejected(faultRun(root, 'partial-create', 'create', ['--input', input(root, proposal())]), /ENOSPC/i);
  assert.equal(readdirSync(join(root, 'mandate/items')).filter(n => n.endsWith('.md')).length, 0);
  ok(run(root, 'validate'));
  assert.equal(create(root).id, 'MND-20261014-001');
});

test('archive partial-write failure preserves source and can finish through explicit recovery', t => {
  const root = setup(t); const { id } = create(root); ok(transition(root, id, 'triaged', { owner: 'owner' }));
  ok(transition(root, id, 'rejected'));
  const decision = input(root, { actor: 'owner', reason: 'Retain rejection history.' });
  rejected(faultRun(root, 'partial-archive', 'transition', ['--id', id, '--status', 'archived', '--input', decision]), /ENOSPC/i);
  assert.equal(metadata(root).status, 'rejected');
  assert.equal(readdirSync(join(root, 'mandate/archive')).filter(n => n.endsWith('.md')).length, 0);
  assert.equal(ok(run(root, 'recover')).recovered, id);
  assert.equal(metadata(root, 'archive').status, 'archived'); ok(run(root, 'validate'));
});

for (const mode of ['exit-after-publish', 'exit-after-source-remove']) {
  test(`explicit recovery is idempotent after interrupted archive: ${mode}`, t => {
    const root = setup(t); const { id } = create(root); ok(transition(root, id, 'triaged', { owner: 'owner' }));
    ok(transition(root, id, 'rejected'));
    const decision = input(root, { actor: 'owner', reason: 'Retain rejection history.' });
    const failed = faultRun(root, mode, 'transition', ['--id', id, '--status', 'archived', '--input', decision]);
    assert.ok([87, 88].includes(failed.status), failed.stderr);
    // Child is known to have exited. Remove only its exact register lock for this synthetic fixture.
    rmSync(join(root, 'mandate/.lock'), { recursive: true });
    rejected(run(root, 'validate'), /pending|recover/i);
    rejected(run(root, 'reindex'), /pending|recover/i);
    assert.equal(ok(run(root, 'recover')).recovered, id);
    assert.equal(ok(run(root, 'recover')).recovered, null);
    assert.equal(readdirSync(join(root, 'mandate/items')).filter(n => n.endsWith('.md')).length, 0);
    assert.equal(metadata(root, 'archive').status, 'archived'); ok(run(root, 'validate'));
  });
}

test('recovery rejects escaping journal paths and preserves changed source evidence', t => {
  const root = setup(t); const { id } = create(root); ok(transition(root, id, 'triaged', { owner: 'owner' }));
  ok(transition(root, id, 'rejected'));
  rejected(faultRun(root, 'partial-archive', 'transition', ['--id', id, '--status', 'archived',
    '--input', input(root, { actor: 'owner', reason: 'Archive this rejected proposal.' })]), /ENOSPC/i);
  const journalPath = join(root, 'mandate/.pending.json');
  const original = readFileSync(journalPath, 'utf8'); const journal = JSON.parse(original);
  journal.source = '../docs/evidence.md'; writeFileSync(journalPath, JSON.stringify(journal));
  rejected(run(root, 'recover'), /path/i);
  assert.equal(readFileSync(join(root, 'docs/evidence.md'), 'utf8'), 'Synthetic test evidence and authorization.\n');
  writeFileSync(journalPath, original);
  const source = file(root); const changed = readFileSync(source, 'utf8') + '\nNew evidence from another editor.\n';
  writeFileSync(source, changed);
  rejected(run(root, 'recover'), /source changed/i);
  assert.equal(readFileSync(source, 'utf8'), changed);
});
