/* global structuredClone */
import { test } from 'node:test';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import * as qualifier from './audio-qualification.mjs';
import { assertPreflight, requestFor, inspectWav, QualificationRunner, FileStore, validateRootPolicy, assertDirectoryChain } from './audio-qualification.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const now = Date.parse('2026-10-27T12:00:00Z');
const key = 'synthetic-test-credential-only';
const url = 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1';
function wav({ silent = false, clipped = false } = {}) {
  const b = Buffer.alloc(44 + 24000 * 2);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(b.length - 44, 40);
  for (let i = 0; i < 24000; i++) b.writeInt16LE(silent ? 0 : clipped ? 32767 : Math.round(4000 * Math.sin(2 * Math.PI * 220 * i / 24000)), 44 + i * 2);
  return b;
}
function setup() {
  let time = now;
  const writes = new Map(), calls = [];
  const scope = { gate: 'A', approval: null, budget: { pilotSpendCap: 0, inclusiveSpendCap: 0, maxCalls: 72, pilotMaxCalls: 9, maxCountedCharacters: 10000, pilotMaxCountedCharacters: 1000, maxTakesPerScript: 3, paidTierOrCreditFallback: false },
    provider: { url, region: 'eastasia', voice: 'en-US-JennyNeural', credentialProcessVariable: 'WL_QUAL_AZURE_KEY', envFileFallback: false, resourceContext: { name: 'video-sub-ai', expectedPricingTier: 'F0' } }, authority: { paidAzureTTS: false, freeTierAzureTTS: true }, storage: { root: 'C:/approved/A' } };
  const approval = { status: 'implementing', proposal_hash: '0d1907e1de7161848f4fadeaedaf88cb656dff086c4fd1119c4edbc4bc376638' };
  const evidence = { checkedAt: new Date(now).toISOString(), tier: 'F0', resource: 'video-sub-ai', region: 'eastasia', credentialOwnerConfirmed: true, educationalInternalQa: true, educationalUseReference: 'https://learn.microsoft.com/en-us/azure/education-hub/azure-dev-tools-teaching/azure-students-program', zeroSpend: true, freeQuotaEnforced: true, pronunciationMode: 'unchanged-plain-script-review-candidates', pilotReviewer: 'Actual appointed test reviewer', source: 'Synthetic test evidence only' };
  const lessons = ['MG01-L1', 'MG01-L2'].map((code, i) => ({ code, sourceSha256: 'source-' + i, scripts: [1, 2, 3].map(n => { const text = 'Hello. I am ' + ['Alpha', 'Bravo', 'Charlie'][n - 1] + (i ? '. I am from Test.' : '.'); return { slug: code.toLowerCase() + '-audio-' + n, text, scriptSha256: hash(text), words: text.split(' ').length, listeningActivities: [{ slug: 'task-' + n }] }; }) }));
  const store = { readJson: async (p, fallback) => writes.has(p) ? structuredClone(writes.get(p)) : fallback, writeJson: async (p, v) => writes.set(p, structuredClone(v)), prepareCandidate: async () => {}, writeCandidate: async (p, bytes) => { assert.ok(!writes.has(p)); writes.set(p, Buffer.from(bytes)); }, readCandidate: async p => { if (!writes.has(p)) throw Error('MISSING_CANDIDATE'); return Buffer.from(writes.get(p)); }, verifySource: async () => {}, assertSafe: async () => {}, assertAuthority: async () => {}, withLock: async f => f() };
  const clock = { now: () => time, sleep: async ms => { time += ms; } };
  const transport = async request => { calls.push({ at: time, url: request.url, ssml: request.ssml, headers: request.headers }); return { status: 200, bytes: wav(), requestId: 'synthetic-request-' + calls.length }; };
  const args = { scope, approval, evidence, key, inventory: { lessons }, store, clock, transport };
  return { ...args, args, writes, calls, runner: () => new QualificationRunner(args) };
}

test('valid private F0 evidence permits the fixed endpoint and never an absent or fallback credential', () => {
  const f = setup(); assert.doesNotThrow(() => assertPreflight({ ...f.args, now }));
  for (const credential of ['', undefined, 'bad\r\nvalue']) assert.throws(() => assertPreflight({ ...f.args, key: credential, now }), /CREDENTIAL/u);
});
test('unapproved, S0, wrong region, endpoint redirect target, missing owner or use evidence fails before requests', async () => {
  for (const alter of [f => { f.approval.status = 'triaged'; }, f => { f.approval.proposal_hash = 'old'; }, f => { f.evidence.tier = 'S0'; }, f => { f.scope.provider.url = 'https://other.invalid'; }, f => { f.scope.provider.region = 'eastus'; }, f => { f.evidence.credentialOwnerConfirmed = false; }, f => { f.evidence.educationalInternalQa = false; }, f => { f.scope.provider.envFileFallback = true; }, f => { f.evidence.checkedAt = '2020-01-01'; }]) {
    const f = setup(); alter(f); await assert.rejects(f.runner().run({ lesson: 'MG01-L1' })); assert.equal(f.calls.length, 0);
  }
});
test('nonzero spend or paid credit fallback fails closed', async () => {
  for (const change of [f => { f.scope.budget.inclusiveSpendCap = 1; }, f => { f.scope.budget.paidTierOrCreditFallback = true; }, f => { f.evidence.zeroSpend = false; }]) {
    const f = setup(); change(f); await assert.rejects(f.runner().run({ lesson: 'MG01-L1' })); assert.equal(f.calls.length, 0);
  }
});
test('SSML escapes source without speaking markup or changing names; counts include all markup conservatively', () => {
  const r = requestFor({ text: 'Hello & <An>.' });
  assert.equal(r.ssml, '<speak version="1.0" xml:lang="en-US"><voice name="en-US-JennyNeural"><prosody rate="-15%">Hello &amp; &lt;An&gt;.</prosody></voice></speak>');
  assert.equal(r.countedCharacters, 140); assert.equal(r.requestSha256, hash(r.ssml));
});
test('pilot produces exactly three immutable unselected WAV candidates, then resumes with no new request', async () => {
  const f = setup(); const result = await f.runner().run({ lesson: 'MG01-L1' });
  assert.equal(f.calls.length, 3); assert.equal(result.candidates, 3); assert.equal(result.selected, 0); assert.equal(result.contentReady, false);
  assert.ok(f.calls.every(c => c.url === url && c.headers['Ocp-Apim-Subscription-Key'] === key));
  const receipts = f.writes.get('requests.json'); assert.deepEqual(receipts.map(r => r.status), ['COMPLETE', 'COMPLETE', 'COMPLETE']);
  assert.ok(!JSON.stringify([...f.writes]).includes(key));
  await f.runner().run({ lesson: 'MG01-L1' }); assert.equal(f.calls.length, 3);
});
test('HTTP429 persists the attempted request and halts the run with no retry even after resume', async () => {
  const f = setup(); let calls = 0; f.args.transport = async () => { calls++; return { status: 429, bytes: Buffer.from('Do not persist provider text or key'), requestId: null }; };
  await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /PROVIDER_429/u);
  assert.equal(calls, 1); assert.equal(f.writes.get('requests.json')[0].status, 'HALTED');
  await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /HALTED/u); assert.equal(calls, 1);
});
test('redirect and thrown provider errors never leak response text or credential and remain counted', async () => {
  for (const response of [async () => ({ status: 302, bytes: Buffer.from('secret'), requestId: null }), async () => { throw Error(key); }]) {
    const f = setup(); f.args.transport = response;
    await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), error => !error.message.includes(key));
    assert.equal(f.writes.get('requests.json').length, 1); assert.ok(!JSON.stringify([...f.writes]).includes(key));
  }
});
test('one request at a time with ten-second spacing and no more than six starts in rolling60sec', async () => {
  const f = setup(); await f.runner().run({ lesson: 'MG01-L1' });
  assert.deepEqual(f.calls.map(c => c.at - now), [0, 10000, 20000]);
  const runner = f.runner(); let release; const pending = new Promise(r => { release = r; });
  const g = setup(); g.args.transport = async () => { await pending; return { status: 200, bytes: wav(), requestId: null }; };
  const busy = g.runner(); const first = busy.run({ lesson: 'MG01-L1' });
  await Promise.resolve(); await assert.rejects(busy.run({ lesson: 'MG01-L1' }), /BUSY/u); release(); await first;
  assert.ok(runner);
});
test('pilot character limit and total request cap reject before the next write or call', async () => {
  const f = setup(); f.scope.budget.pilotMaxCountedCharacters = 1; await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /BUDGET/u); assert.equal(f.calls.length, 0);
  const g = setup(); await g.runner().run({ lesson: 'MG01-L1' }); approvePilot(g);
  g.scope.budget.maxCalls = 3; g.writes.get('audio-qa.json').reviews[0].verdict = 'REJECTED';
  await assert.rejects(g.runner().run({ lesson: 'MG01-L1' }), /BUDGET/u); assert.equal(g.calls.length, 3);
});
test('unresolved in-flight receipt prevents re-sending after a crash', async () => {
  const f = setup(); f.writes.set('requests.json', [{ slug: 'mg01-l1-audio-1', status: 'STARTED', startedAt: now, countedCharacters: 130 }]);
  await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /AMBIGUOUS/u); assert.equal(f.calls.length, 0);
});
test('source or path safety failure occurs before network', async () => {
  for (const method of ['assertSafe', 'verifySource']) { const f = setup(); f.store[method] = async () => { throw Error('UNSAFE'); }; await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /UNSAFE/u); assert.equal(f.calls.length, 0); }
});
test('corrupt resume bytes and swapped request or source hashes cannot qualify cached audio', async () => {
  const f = setup(); await f.runner().run({ lesson: 'MG01-L1' });
  const m = f.writes.get('asset-manifest.json'); const path = m.candidates[0].path;
  f.writes.set(path, Buffer.from('corrupt'));
  await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /CHECKSUM/u); assert.equal(f.calls.length, 3);
});
test('WAV decoder rejects zero-speech, clipping, bad format and truncation; reports measured sample duration', () => {
  const good = inspectWav(wav()); assert.equal(good.sampleRate, 24000); assert.equal(good.durationSeconds, 1); assert.equal(good.byteSize, 48044);
  for (const bytes of [wav({ silent: true }), wav({ clipped: true }), wav().subarray(0, 80), Buffer.from('RIFFtext')]) assert.throws(() => inspectWav(bytes));
});
test('all-mode and other lessons fail closed until actual pilot QA covers every selected file/hash', async () => {
  const f = setup(); await assert.rejects(f.runner().run({ all: true }), /PILOT_QA/u); assert.equal(f.calls.length, 0);
  await f.runner().run({ lesson: 'MG01-L1' });
  await assert.rejects(f.runner().run({ lesson: 'MG01-L2' }), /PILOT_QA/u); assert.equal(f.calls.length, 3);
});
test('malformed persisted cost counters cannot turn NaN into unlimited allowance', async () => {
  for (const bad of [null, -1, '100', NaN]) {
    const f = setup(); f.writes.set('requests.json', [{ lesson: 'MG01-L1', slug: 'previous', status: 'COMPLETE', startedAt: now - 100000, countedCharacters: bad }]);
    await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /STATE_INVALID/u); assert.equal(f.calls.length, 0);
  }
});
test('allowlist path resolver rejects traversal, drive overrides and prefix collisions', () => {
  const scope = { allowlist: { externalCreate: ['C:/approved/A/requests.json'] } };
  const s = new FileStore('C:/approved/A', scope, 'C:/repo');
  assert.ok(s.resolve('requests.json').endsWith('requests.json'));
  for (const name of ['../A2/requests.json', 'C:/approved/A/requests.json', '//server/share/file', '../A/requests.json', 'requests.json:stream', 'unlisted.json']) assert.throws(() => s.resolve(name), /PATH/u);
});
test('each cached request and source fingerprint is enforced, not just a playable WAV', async () => {
  for (const field of ['requestSha256', 'sourceSha256', 'scriptSha256']) {
    const f = setup(); await f.runner().run({ lesson: 'MG01-L1' }); const m = f.writes.get('asset-manifest.json'); m.candidates[0][field] = 'stale';
    await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /FINGERPRINT/u); assert.equal(f.calls.length, 3);
  }
});
test('approval/source safety is rechecked after waiting and before reserving another request', async () => {
  const f = setup(); f.clock.sleep = async () => { f.evidence.tier = 'S0'; };
  await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /F0_RESOURCE/u); assert.equal(f.calls.length, 1);
});
test('human QA with stale hashes or absent warning acceptance cannot select or unlock rollout', async () => {
  const f = setup(); await f.runner().run({ lesson: 'MG01-L1' });
  const m = f.writes.get('asset-manifest.json');
  f.writes.set('audio-qa.json', { reviews: m.candidates.map(c => ({ path: c.path, fileSha256: c.checksum, sourceSha256: c.sourceSha256, scriptSha256: c.scriptSha256, requestSha256: 'stale', reviewer: 'Human test reviewer', reviewedAt: new Date(now).toISOString(), verdict: 'PASS', acceptedWarnings: c.warnings })) });
  await assert.rejects(f.runner().run({ all: true }), /PILOT_QA/u); assert.equal(f.calls.length, 3);
});
test('revoked on-disk authority after the first completed request stops before the second start', async () => {
  const f = setup(); f.store.assertAuthority = async () => { if (f.calls.length) throw Error('AUTHORITY_REVOKED'); };
  await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /AUTHORITY_REVOKED/u); assert.equal(f.calls.length, 1);
});
test('six recent starts delay the seventh outside the entire rolling60-second window', async () => {
  const f = setup(); await f.runner().run({ lesson: 'MG01-L1' }); approvePilot(f);
  await f.runner().run({ all: true }); f.writes.get('audio-qa.json').reviews[0].verdict = 'REJECTED';
  await f.runner().run({ lesson: 'MG01-L1' }); assert.equal(f.calls[6].at - f.calls[0].at, 60001);
});

function approvePilot(f) {
  const m = f.writes.get('asset-manifest.json');
  const reviews = m.candidates.map(c => ({ path: c.path, fileSha256: c.checksum, sourceSha256: c.sourceSha256, scriptSha256: c.scriptSha256, requestSha256: c.requestSha256, reviewer: 'Human test reviewer', reviewedAt: new Date(now).toISOString(), verdict: 'PASS', acceptedWarnings: c.warnings, warningReasons: Object.fromEntries(c.warnings.map(w => [w, 'Accepted after real test audition'])) }));
  f.writes.set('audio-qa.json', { reviews });
  f.writes.set('pronunciation-decisions.json', { verdict: 'PASS', reviewer: 'Human test reviewer', reviewedAt: new Date(now).toISOString(), pronunciationApproved: true, paceApproved: true, reason: 'Actual test audition approved names and pace', pilot: reviews.map(r => ({ path: r.path, fileSha256: r.fileSha256, sourceSha256: r.sourceSha256, scriptSha256: r.scriptSha256, requestSha256: r.requestSha256 })) });
}
test('review1 root policy requires expected owner, run marker and SID permissions, including read/delete/change-owner', () => {
  const query = { currentSid: 'S-1-5-21-123-1001', ownerSid: 'S-1-5-21-123-1001', entries: [{ sid: 'S-1-5-21-123-1001', type: 'Allow', rights: 2032127 }] };
  const marker = { runId: 'worklingo-r12b-gate-a-20261027', root: 'C:/approved/A', creatorSid: query.currentSid, ownerSid: query.ownerSid, createdFromAbsent: true };
  assert.doesNotThrow(() => validateRootPolicy(query, marker, 'C:/approved/A'));
  for (const [q, m] of [[query, null], [{ ...query, ownerSid: 'S-1-5-21-other' }, marker], [query, { ...marker, runId: 'other' }], [query, { ...marker, creatorSid: 'other' }], ...[1, 65536, 262144, 524288, 268435456].map(rights => [{ ...query, entries: [...query.entries, { sid: 'S-1-1-0', type: 'Allow', rights }] }, marker])]) assert.throws(() => validateRootPolicy(q, m, 'C:/approved/A'), /ROOT_/u);
});
test('review2 intermediate junction is rejected by read-only chain inspection before mkdir or a request', async () => {
  const calls = []; const io = { lstat: async p => ({ isDirectory: () => true, isSymbolicLink: () => p.endsWith('takes') }), realpath: async p => p, mkdir: async () => calls.push('mkdir') };
  await assert.rejects(assertDirectoryChain('C:/approved/A/takes/x', 'C:/approved/A', io), /PATH/u);
  assert.deepEqual(calls, []);
  const f = setup(); f.store.prepareCandidate = async () => { throw Error('UNSAFE_PATH'); };
  await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /UNSAFE_PATH/u); assert.equal(f.calls.length, 0);
});
test('review3 variable durable-write delays cannot compress actual transport starts below10sec', async () => {
  const f = setup(); const original = f.store.writeJson; let first = true;
  f.store.writeJson = async (p, v) => { if (p === 'requests.json' && first) { first = false; await f.clock.sleep(9000); } await original(p, v); };
  await f.runner().run({ lesson: 'MG01-L1' });
  for (let i = 1; i < f.calls.length; i++) assert.ok(f.calls[i].at - f.calls[i - 1].at >= 10000, JSON.stringify(f.calls.map(c => c.at - now)));
});
test('review4 missing established request history cannot reset budget while cached candidates remain', async () => {
  const f = setup(); await f.runner().run({ lesson: 'MG01-L1' }); f.writes.delete('requests.json');
  await assert.rejects(f.runner().run({ lesson: 'MG01-L1' }), /STATE_/u); assert.equal(f.calls.length, 3);
});
test('review5 unknown candidates, duplicate file paths or altered warnings never qualify24 bindings', async () => {
  for (const kind of ['unknown', 'duplicate-path', 'warnings']) {
    const f = setup(); await f.runner().run({ lesson: 'MG01-L1' }); const m = f.writes.get('asset-manifest.json');
    if (kind === 'unknown') m.candidates.push({ ...m.candidates[0], slug: 'unknown' });
    if (kind === 'duplicate-path') m.candidates[1].path = m.candidates[0].path;
    if (kind === 'warnings') m.candidates[0].warnings = [];
    await assert.rejects(f.runner().run({ all: true, verifyOnly: true }), /STATE_|METRIC/u); assert.equal(f.calls.length, 3);
  }
});
test('review6 a later REJECTED disposition revokes previous PASS and blocks rollout', async () => {
  const f = setup(); await f.runner().run({ lesson: 'MG01-L1' }); approvePilot(f);
  const qa = f.writes.get('audio-qa.json'); qa.reviews.push({ ...qa.reviews[0], verdict: 'REJECTED', reviewedAt: new Date(now + 1000).toISOString() });
  await assert.rejects(f.runner().run({ all: true }), /PILOT_QA/u); assert.equal(f.calls.length, 3);
});
test('review7 generic pilot PASS lacks required pronunciation/pace disposition or warning reason', async () => {
  for (const type of ['absent-decision', 'stale-decision', 'warning-reason']) {
    const f = setup(); await f.runner().run({ lesson: 'MG01-L1' }); approvePilot(f);
    if (type === 'absent-decision') f.writes.delete('pronunciation-decisions.json');
    if (type === 'stale-decision') f.writes.get('pronunciation-decisions.json').pilot[0].fileSha256 = 'stale';
    if (type === 'warning-reason') f.writes.get('audio-qa.json').reviews[0].warningReasons = {};
    await assert.rejects(f.runner().run({ all: true }), /PILOT_QA/u); assert.equal(f.calls.length, 3);
  }
});

const childHash = '96a4ca63b69ec052a0bf203b81773d1dc1d6256d2d1fd291deeafb007b1e45a1';
const originalScope = JSON.parse(fs.readFileSync(new URL('../../mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json', import.meta.url)));
const storageScope = JSON.parse(fs.readFileSync(new URL('../../mandate/reports/2026-10-27-beginner-gate-a-storage-scope.json', import.meta.url)));
const feature = (name, ...args) => { assert.equal(typeof qualifier[name], 'function', `${name} must implement the approved storage boundary`); return qualifier[name](...args); };
const auth = status => ({ original: setup().approval, child: { status, proposal_hash: childHash } });

test('storage authority allows setup while implementing but requires verified child and original approval for audio', () => {
  assert.doesNotThrow(() => feature('assertStorageAuthority', { ...auth('implementing'), mode: 'prepare' }));
  assert.doesNotThrow(() => feature('assertStorageAuthority', { ...auth('verified'), mode: 'produce' }));
  for (const a of [{ ...auth('implementing'), mode: 'produce' }, { ...auth('verified'), original: { ...setup().approval, status: 'triaged' }, mode: 'produce' }, { ...auth('verified'), child: { status: 'verified', proposal_hash: 'revoked' }, mode: 'produce' }, { ...auth('verified'), child: null, mode: 'prepare' }]) assert.throws(() => feature('assertStorageAuthority', a), /AUTHORITY/u);
});
test('root rebinding changes only reviewed storage paths and leaves F0 budget, content and authority intact', () => {
  const effective = feature('bindStorageScope', originalScope, storageScope);
  assert.equal(effective.storage.root, 'D:/WorkLingoQualification/r12b-20261027/A');
  assert.ok(effective.allowlist.externalCreate.includes('D:/WorkLingoQualification/r12b-20261027/A/takes/mg01-l1-audio-a/take-1.wav'));
  assert.ok(effective.allowlist.externalCreate.includes('D:/WorkLingoQualification/r12b-20261027/A/storage-probe.json'));
  assert.deepEqual(effective.provider, originalScope.provider); assert.deepEqual(effective.budget, originalScope.budget);
  assert.deepEqual(effective.authority, originalScope.authority); assert.deepEqual(effective.acceptance, originalScope.acceptance);
  assert.equal(originalScope.storage.root, 'C:/Users/ASUS/AppData/Local/WorkLingo/qualification/r12b-20261027/A');
});
test('storage rebinding rejects paid fallback, foreign root, extra path or larger shared allowance', () => {
  for (const alter of [s => { s.provider.region = 'eastus'; }, s => { s.budget.maxCalls = 73; }, s => { s.storage.root = 'D:/other'; }, s => { s.allowlist.externalCreate.push('D:/unapproved.json'); }, s => { s.allowlist.createDirectories.push('D:/Projects'); }, s => { s.authority.existingAclModify = true; }]) {
    const s = structuredClone(storageScope); alter(s); assert.throws(() => feature('bindStorageScope', originalScope, s), /STORAGE_SCOPE/u);
  }
});

function setupStorage() {
  const amendment = structuredClone(storageScope), entries = new Map(), effects = []; let id = 10;
  const native = p => path.resolve(p), old = native(amendment.storage.oldLogicalRoot), root = native(amendment.storage.root), top = native('D:/WorkLingoQualification');
  const sid = amendment.storage.expectedCreatorSid;
  entries.set(native('D:/'), { dir: true, id: 1 }); entries.set(old, { dir: true, id: 2 });
  const evidence = setup().evidence;
  for (const meta of amendment.storage.oldMetadata) { const text = JSON.stringify(meta.name === 'rights-and-tariff.json' ? evidence : { status: 'NOT_RUN' }); entries.set(path.join(old, meta.name), { text, id: ++id }); meta.sha256 = hash(text); }
  const missing = () => Object.assign(Error('missing'), { code: 'ENOENT' });
  const io = {
    lstat: async p => { const e = entries.get(native(p)); if (!e) throw missing(); return { isDirectory: () => Boolean(e.dir), isFile: () => !e.dir, isSymbolicLink: () => Boolean(e.link), size: e.text?.length ?? 0, ino: BigInt(e.id), dev: 1n }; },
    realpath: async p => native(p).startsWith(old) ? native(amendment.storage.oldPhysicalRoot + native(p).slice(old.length)) : native(p),
    readdir: async p => [...entries.keys()].filter(k => path.dirname(k) === native(p)).map(k => path.basename(k)),
    readFile: async p => { const e = entries.get(native(p)); if (!e || e.dir) throw missing(); return Buffer.from(e.text); },
    writeFile: async (p, value, options) => { if (options?.flag !== 'wx' || entries.has(native(p))) throw Error('EXCLUSIVE_REQUIRED'); entries.set(native(p), { text: String(value), id: ++id }); effects.push(['write', native(p)]); },
    unlink: async p => { effects.push(['unlink', native(p)]); entries.delete(native(p)); },
  };
  const os = {
    volume: async () => ({ fileSystem: 'NTFS' }),
    queryAcl: p => ({ currentSid: sid, ownerSid: sid, protected: true, sddl: native(p) === native('D:/') ? 'unchanged-parent' : 'private', entries: [sid, 'S-1-5-18', 'S-1-5-32-544'].map(sid => ({ sid, type: 'Allow', rights: 2032127 })) }),
    createDirectory: async p => { if (entries.has(native(p))) throw Error('EXISTS'); entries.set(native(p), { dir: true, id: ++id }); effects.push(['mkdir', native(p)]); },
  };
  const options = { amendment, scope: feature('bindStorageScope', originalScope, amendment), io, os, verifyAuthority: async () => feature('assertStorageAuthority', { ...auth('implementing'), mode: 'prepare' }) };
  return { options, amendment, io, os, entries, effects, root, top, old, sid };
}
test('private setup produces bound ownership and pending QA, validates probe and never touches old/shared objects', async () => {
  const f = setupStorage(); const result = await feature('preparePrivateRoot', f.options);
  assert.equal(result.storageStatus, 'READY'); assert.equal(result.root, 'D:/WorkLingoQualification/r12b-20261027/A'); assert.equal(result.probe, 'PASS');
  const marker = JSON.parse(f.entries.get(path.join(f.root, 'run-ownership.json')).text);
  assert.equal(marker.creatorSid, f.sid); assert.equal(marker.ownerSid, f.sid); assert.equal(marker.amendmentHash, childHash); assert.equal(marker.setupComplete, true);
  assert.deepEqual(JSON.parse(f.entries.get(path.join(f.root, 'audio-qa.json')).text).reviews, []);
  assert.equal(JSON.parse(f.entries.get(path.join(f.root, 'pronunciation-decisions.json')).text).verdict, null);
  assert.ok(!f.entries.has(path.join(f.root, 'storage-probe.json')));
  assert.ok(f.effects.every(([,p]) => p === f.top || p.startsWith(f.top + path.sep)));
});
test('setup fails before creating directories for revoked authority, wrong SID, non-NTFS or unexpected old history', async () => {
  for (const type of ['authority', 'sid', 'volume', 'history']) {
    const f = setupStorage();
    if (type === 'authority') f.options.verifyAuthority = async () => { throw Error('AUTHORITY_REVOKED'); };
    if (type === 'sid') { const q = f.os.queryAcl; f.os.queryAcl = p => ({ ...q(p), currentSid: 'S-1-5-21-other' }); }
    if (type === 'volume') f.os.volume = async () => ({ fileSystem: 'FAT32' });
    if (type === 'history') f.entries.set(path.join(f.old, 'requests.json'), { text: '[]', id: 99 });
    await assert.rejects(feature('preparePrivateRoot', f.options), /AUTHORITY|SID|VOLUME|HISTORY/u); assert.equal(f.effects.length, 0);
  }
});
test('an unrelated existing root or incomplete setup is not adopted and never gets repaired', async () => {
  for (const p of ['top', 'root']) { const f = setupStorage(); f.entries.set(f[p], { dir: true, id: 99 }); await assert.rejects(feature('preparePrivateRoot', f.options), /EXISTING|INCOMPLETE/u); assert.equal(f.effects.length, 0); }
});
test('completed same-run setup can only verify and does not rewrite ownership or ACL', async () => {
  const f = setupStorage(); await feature('preparePrivateRoot', f.options); f.effects.length = 0;
  const result = await feature('preparePrivateRoot', f.options); assert.equal(result.storageStatus, 'READY'); assert.equal(f.effects.length, 0);
});
test('directory identity/reparse and broad ACL races stop setup before any private artifact write', async () => {
  for (const type of ['junction', 'identity', 'acl']) {
    const f = setupStorage(); const create = f.os.createDirectory; const stat = f.io.lstat; let seen = 0;
    f.os.createDirectory = async p => { await create(p); if (nativeEqual(p,f.top) && type === 'junction') f.entries.get(f.top).link = true; };
    if (type === 'identity') f.io.lstat = async p => { const s = await stat(p); if (nativeEqual(p,f.top) && ++seen >= 2) return { ...s, ino: 999n }; return s; };
    if (type === 'acl') { const q=f.os.queryAcl; f.os.queryAcl=p=>({ ...q(p), entries:[...q(p).entries,{sid:'S-1-1-0',type:'Allow',rights:1}] }); }
    await assert.rejects(feature('preparePrivateRoot', f.options), /PATH|IDENTITY|ACL/u); assert.ok(f.effects.every(([kind]) => kind !== 'write'));
  }
});
function nativeEqual(a,b) { return path.resolve(a) === path.resolve(b); }

function authorityFixture() {
  const repository = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const files = new Map(), names = fs.readdirSync(path.join(repository,'mandate/items')).filter(n => /^MND-20261027-00[25]-/u.test(n));
  const paths = ['mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json','mandate/reports/2026-10-27-beginner-gate-a-storage-scope.json',...originalScope.frozenArtifacts.map(f=>f.path),...storageScope.frozenArtifacts.map(f=>f.path),...storageScope.baseline.protectedFiles.map(f=>f.path),...names.map(n=>'mandate/items/'+n)];
  for (const p of paths) files.set(path.resolve(repository,p), fs.readFileSync(path.resolve(repository,p)));
  const editItem = (prefix, alter) => { const p=path.join(repository,'mandate/items',names.find(n=>n.startsWith(prefix))),raw=files.get(p).toString(),m=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u),item=JSON.parse(m[1]); alter(item); files.set(p,Buffer.from('---\n'+JSON.stringify(item)+'\n---\n'+m[2])); };
  editItem('MND-20261027-005',item=>{item.status='verified';});
  const io={readFile:async(p,encoding)=>{const bytes=files.get(path.resolve(p)); if(!bytes)throw Error('MISSING_FIXTURE');return encoding?bytes.toString():bytes;},readdir:async()=>names};
  const runGit=args=>({status:0,stdout:args[0]==='branch'?'codex/foundation-basic-readiness\n':''});
  return {repository,files,editItem,io,runGit,effective:feature('bindStorageScope',originalScope,storageScope)};
}
test('runtime validates both frozen mandates and permits the exact effective root after child verification', async () => {
  const f=authorityFixture(); const result=await feature('readAuthority',f.repository,f.effective,'produce',{io:f.io,runGit:f.runGit});
  assert.equal(result.proposal_hash,'0d1907e1de7161848f4fadeaedaf88cb656dff086c4fd1119c4edbc4bc376638'); assert.equal(result.storageApproval.proposal_hash,childHash);
});
test('runtime refuses revoked approvals, changed frozen/protected bytes, ancestry and altered effective budgets', async () => {
  for(const type of ['original','child','frozen','source','ancestry','effective']){
    const f=authorityFixture();
    if(type==='original')f.editItem('MND-20261027-002',item=>{item.approval=null;});
    if(type==='child')f.editItem('MND-20261027-005',item=>{item.status='implementing';});
    if(type==='frozen')f.files.set(path.join(f.repository,storageScope.frozenArtifacts[0].path),Buffer.from('changed'));
    if(type==='source')f.files.set(path.join(f.repository,'content/beginner/pilot/mg01-l1.lesson.txt'),Buffer.from('changed'));
    if(type==='ancestry')f.runGit=()=>({status:1,stdout:''});
    if(type==='effective')f.effective.budget.maxCalls=73;
    await assert.rejects(feature('readAuthority',f.repository,f.effective,'produce',{io:f.io,runGit:f.runGit}),/AUTHORITY|FROZEN|PROTECTED|ANCESTRY|SCOPE/u);
  }
});
test('concurrent content or authority revocation halts setup without writing private metadata', async () => {
  for(const type of ['content','revocation']){
    const f=setupStorage(),create=f.os.createDirectory;let checks=0;
    if(type==='content')f.os.createDirectory=async p=>{await create(p);f.entries.set(path.join(path.resolve(p),'unexpected.txt'),{text:'concurrent',id:999});};
    if(type==='revocation')f.options.verifyAuthority=async()=>{if(++checks>2)throw Error('AUTHORITY_REVOKED');};
    await assert.rejects(feature('preparePrivateRoot',f.options),/IDENTITY|AUTHORITY/u);assert.ok(f.effects.every(([kind])=>kind!=='write'));
  }
});
test('unrelated env-like values cannot supply a missing process-only credential', () => {
  const f=setup();
  assert.throws(()=>assertPreflight({...f.args,key:undefined,MICROSOFT_SPEECH_KEY:key,DATABASE_URL:'synthetic://unapproved',now}),/CREDENTIAL_REQUIRED/u);
});
test('review storage1 later creation cannot hide content or replacement in an earlier checked directory', async () => {
  for(const type of ['content','replace']){
    const f=setupStorage(),create=f.os.createDirectory;
    f.os.createDirectory=async p=>{await create(p);if(path.basename(p)==='mg01-l1-audio-b'){
      if(type==='content')f.entries.set(path.join(f.root,'unexpected.txt'),{text:'injected',id:999});
      else f.entries.get(path.join(f.root,'takes','mg01-l1-audio-a')).id=999;
    }};
    await assert.rejects(feature('preparePrivateRoot',f.options),/TREE|IDENTITY/u);
    assert.ok(!f.entries.has(path.join(f.root,'run-ownership.json')));
  }
});
test('review storage2 production rejects replaced take directory before prepare or write despite matching ACL', async () => {
  for(const operation of ['prepare','write']){
    const f=setupStorage();await feature('preparePrivateRoot',f.options);
    const store=new FileStore(f.amendment.storage.root,f.options.scope,'C:/repo',f.amendment,{io:f.io,queryAcl:f.os.queryAcl});
    f.entries.get(path.join(f.root,'takes','mg01-l1-audio-a')).id=999;
    const pending=operation==='prepare'?store.prepareCandidate('takes/mg01-l1-audio-a/take-1.wav'):store.writeCandidate('takes/mg01-l1-audio-a/take-1.wav',wav());
    await assert.rejects(pending,/STORAGE_IDENTITY/u);assert.ok(!f.entries.has(path.join(f.root,'takes','mg01-l1-audio-a','take-1.wav')));
  }
});
test('review storage3 linked or replaced ownership marker never qualifies setup resume', async () => {
  for(const type of ['link','replace']){
    const f=setupStorage();await feature('preparePrivateRoot',f.options);const marker=path.join(f.root,'run-ownership.json');
    if(type==='link')f.entries.get(marker).link=true;
    else {const query=f.os.queryAcl;let changed=false;f.os.queryAcl=p=>{if(!changed&&nativeEqual(p,f.top)){f.entries.get(marker).id=999;changed=true;}return query(p);};}
    await assert.rejects(feature('preparePrivateRoot',f.options),/STATE_FILE|MARKER|IDENTITY/u);
  }
});
test('Windows helper isolates native 5.1 module lookup from inherited Core module paths without changing parent env', () => {
  const env={SystemRoot:'C:\\Windows',PSModulePath:'C:\\Core7\\Modules',PATH:'synthetic-path'};
  const spawn=(_binary,_args,options)=>({status:options.env?.PSModulePath==='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'?0:1,stdout:'ACL_OK',stderr:''});
  assert.equal(feature('powershell','read-only synthetic ACL probe',{spawn,env}),'ACL_OK');
  assert.equal(env.PSModulePath,'C:\\Core7\\Modules');assert.equal(env.PATH,'synthetic-path');
});
