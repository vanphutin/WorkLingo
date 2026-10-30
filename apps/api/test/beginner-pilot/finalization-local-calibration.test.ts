import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from './finalization-local-calibration.js';
test('new pilot identity is required and old ledger/retries/remote URL are denied before inference', () => {
  assert.doesNotThrow(() => api.validateProtocol({ identity: 'WL-R12B-LOCAL-QWEN06-CONSTRAINED-002', count: 20, retries: 0, inflight: 1, timeoutMs: 120000, outputCap: 2048, endpoint: 'http://127.0.0.1:33441/v1/chat/completions' }));
  for (const patch of [{ identity: 'WL-R12B-LOCAL-QWEN06-Q8-B12000-NOTHINK-001' }, { count: 21 }, { retries: 1 }, { inflight: 2 }, { timeoutMs: 120001 }, { outputCap: 4096 }, { endpoint: 'https://example.com' }]) assert.throws(() => api.validateProtocol({ identity: 'WL-R12B-LOCAL-QWEN06-CONSTRAINED-002', count: 20, retries: 0, inflight: 1, timeoutMs: 120000, outputCap: 2048, endpoint: 'http://127.0.0.1:33441/v1/chat/completions', ...patch }));
});
test('strict replay accounts all20 original local failures without upgrading historical evidence', () => {
  const replay = api.replayHistorical();
  assert.equal(replay.rows.length, 20);
  assert.ok(replay.rows.every(r => r.disposition === 'REJECTED_UNCHANGED_JSON_CONTRACT'));
  assert.equal(replay.discoveryActualStarts, 0);
  assert.equal(replay.originalEvidenceChanged, false);
});
test('new execution records raw identity failures without retrying or rewriting response evidence', async () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ observationId: 'case' + i, caseId: 'case' + i, repeatOf: null, phase: 'pilot' }));
  const raw = { model: 'wrong-model', choices: [{ finish_reason: 'stop', message: { content: '{}' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } };
  const result = await api.executeConstrained(rows, async () => raw, () => {});
  assert.equal(result.length, 20);
  assert.ok(result.every(r => r.status === 'ERROR' && JSON.stringify(r.raw) === JSON.stringify(raw)));
});
test('schema-valid responses require exact observed identity and token counts before scoring', async () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ observationId: 'case' + i, caseId: 'case' + i, repeatOf: null, phase: 'pilot' }));
  const evaluation = { scores: { taskCompletion: 1, meaningAndLogic: 1, targetLanguage: 1, clarity: 1 }, feedback: { summary: 'Tốt', strengths: [], improvements: [], correctedExample: null } };
  const good = { model: 'worklingo-qwen3-0.6b-q8_0-23749fef', system_fingerprint: 'b12000-68d20b884', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(evaluation) } }], usage: { prompt_tokens: 569, completion_tokens: 200 } };
  const expected = new Map(rows.map(r => [r.observationId, 569]));
  const complete = await api.executeConstrained(rows, async () => good, () => {}, expected);
  assert.ok(complete.every(r => r.status === 'COMPLETE'));
  const invalid = await api.executeConstrained(rows, async () => ({ ...good, choices: [...good.choices, ...good.choices] }), () => {}, expected);
  assert.ok(invalid.every(r => r.status === 'ERROR' && r.evaluation === null));
  const mismatch = await api.executeConstrained(rows, async () => good, () => {}, new Map(rows.map(r => [r.observationId, 570])));
  assert.ok(mismatch.every(r => r.status === 'ERROR'));
});
