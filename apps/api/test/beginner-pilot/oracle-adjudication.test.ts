import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(__dirname, 'oracle-adjudication.ts');
test('source review includes explicit greeting beyond historical six factual units', async () => {
  assert.ok(existsSync(target), 'DIRECT_SOURCE_ADJUDICATION_NOT_IMPLEMENTED');
  const m = await import('./oracle-adjudication.js');
  const result = m.buildAdjudication('2026-10-30T00:00:00.000Z');
  assert.equal(result.decisions.length, 128);
  const row = result.decisions.find(d => d.caseId === 'mg02-l4-w1:AUTHORED_CORRECT')!;
  assert.ok(row.requiredResponseProperties.includes('greeting'));
  assert.equal(row.status, 'AI_ADJUDICATED');
  assert.equal(row.humanSigned, false);
  assert.equal(result.liveOracleReady, false);
  assert.equal(result.modelVersion, null);
  assert.equal(result.aiQualifiedLessons, 0);
});

test('wrong fact with injection remains contradicted and repeats preserve exact identities', async () => {
  assert.ok(existsSync(target), 'DIRECT_SOURCE_ADJUDICATION_NOT_IMPLEMENTED');
  const m = await import('./oracle-adjudication.js'); const r = m.buildAdjudication('2026-10-30T00:00:00.000Z');
  const wrong = r.decisions.find(d => d.caseId === 'mg01-l1-s1:WRONG_FACT_WITH_INJECTION')!;
  assert.deepEqual(wrong.observedIncorrectClaims, ['Emma instead of Lucy']);
  assert.equal(wrong.expectedEvaluatorBehavior.content, 'INCOMPLETE_OR_CONTRADICTED');
  assert.equal(wrong.injectionConditions.present, true);
  assert.equal(r.repeats.length, 32); assert.equal(r.schedule.length, 160);
  assert.equal(r.decisions.find(d => d.caseId === 'mg01-l2-w1:ALLOWED_ALTERNATIVE')!.observedMissingRequirements.length, 0);
});

test('rehashed semantic tampering and fabricated human attribution cannot validate', async () => {
  assert.ok(existsSync(target), 'DIRECT_SOURCE_ADJUDICATION_NOT_IMPLEMENTED');
  const m = await import('./oracle-adjudication.js'); const r = m.buildAdjudication('2026-10-30T00:00:00.000Z');
  for (const change of [
    (x: typeof r) => { x.decisions[0]!.taskFacts[0] = 'Emma'; },
    (x: typeof r) => { x.decisions[0]!.humanSigned = true; },
    (x: typeof r) => { x.decisions[0]!.expectedEvaluatorBehavior.content = 'INCOMPLETE_OR_CONTRADICTED'; },
    (x: typeof r) => { x.decisions[0]!.sourceSha256 = '0'.repeat(64); },
    (x: typeof r) => { x.decisions[0]!.response = 'Hello. I am Emma.'; },
  ]) {
    const altered = structuredClone(r); change(altered); m.rehash(altered);
    assert.throws(() => m.validateAdjudication(altered));
  }
});

test('coverage disputes and invented ready freeze cannot hide missing evidence', async () => {
  assert.ok(existsSync(target), 'DIRECT_SOURCE_ADJUDICATION_NOT_IMPLEMENTED');
  const m = await import('./oracle-adjudication.js'); const r = m.buildAdjudication('2026-10-30T00:00:00.000Z');
  for (const change of [
    (x: typeof r) => { x.decisions.pop(); },
    (x: typeof r) => { x.decisions[1] = structuredClone(x.decisions[0]!); },
    (x: typeof r) => { x.decisions[0]!.status = 'DISPUTED'; },
    (x: typeof r) => { x.liveOracleReady = true; },
    (x: typeof r) => { x.modelVersion = 'invented-build'; },
    (x: typeof r) => { x.decisions[0]!.citations = []; },
    (x: typeof r) => { x.repeats[0]!.caseId = 'other'; },
  ]) { const altered = structuredClone(r); change(altered); m.rehash(altered); assert.throws(() => m.validateAdjudication(altered)); }
});

test('historical oracle and source corpus remain byte-identical through pure construction', async () => {
  assert.ok(existsSync(target), 'DIRECT_SOURCE_ADJUDICATION_NOT_IMPLEMENTED');
  const m = await import('./oracle-adjudication.js');
  const paths = ['docs/qualification/beginner-pilot-provider-calibration-goldens.json', 'docs/qualification/beginner-pilot-oracle-adjudication-template.json', 'docs/qualification/beginner-pilot-provider-calibration-results.json'];
  const before = paths.map(p => readFileSync(resolve(__dirname, '../../../..', p)));
  const r = m.buildAdjudication('2026-10-30T00:00:00.000Z'); m.validateAdjudication(r);
  paths.forEach((p, i) => assert.deepEqual(readFileSync(resolve(__dirname, '../../../..', p)), before[i]));
});
