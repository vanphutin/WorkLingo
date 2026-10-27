/* global structuredClone */
import { test } from 'node:test';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
