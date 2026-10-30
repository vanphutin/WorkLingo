import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function api() {
  assert.ok(existsSync(resolve(__dirname, 'external-expert-intake.ts')), 'external expert intake implementation required');
  return import('./external-expert-intake.js');
}
async function fixture(kind: 'QA' | 'ORACLE' = 'QA') {
  const m = await api(), template = m.buildExpertTemplate();
  const target = template.targets.find(t => t.kind === kind)!;
  return { m, template, submission: {
    schemaVersion: 'worklingo-external-expert-intake/1', templateSha256: template.templateSha256,
    reviewer: { id: 'SYNTHETIC-TEST-REVIEWER', authorType: 'HUMAN_SELF_ATTESTED', qualificationReference: 'TEST-ONLY-NO-EXPERT', identityEvidenceReference: 'TEST-ONLY-NO-IDENTITY', independenceAttestation: true },
    reviews: [{ kind: target.kind, id: target.id, bindings: structuredClone(target.bindings), review: {
      decision: 'PASS', reviewedAt: '2026-10-29T00:00:00.000Z', method: kind === 'QA' ? 'ACTUAL_AUDIO_LISTENING' : 'SOURCE_TEXT_REVIEW',
      evidenceReferences: [{ reference: 'urn:synthetic-test:evidence', sha256: 'a'.repeat(64) }],
      rationale: 'Synthetic validator fixture only; never a real expert judgment.', confidence: 'MEDIUM', limitations: ['TEST_ONLY'],
      correction: null, comparisonToAI: 'AGREE', disagreementRationale: null,
    } }],
  } };
}
test('blank packet covers 82 QA and 128 oracle targets without human attestations', async () => {
  const { buildExpertTemplate, validateExpertSubmission } = await api(); const t = buildExpertTemplate();
  assert.equal(t.targets.filter(x => x.kind === 'QA').length, 82);
  assert.equal(t.targets.filter(x => x.kind === 'ORACLE').length, 128);
  assert.equal(new Set(t.targets.map(x => x.kind + ':' + x.id)).size, 210);
  assert.equal(t.reviewer, null); assert.ok(t.targets.every(x => x.review === null));
  assert.equal(t.humanVerified, 0); assert.equal(t.readinessChanged, false);
  assert.equal(t.targets[0]!.id, 'mg01-l1-audio-a');
  assert.equal(t.targets[0]!.bindings.audio!.sha256, '8ae3e7b2cabe427763bd1fc521a03e12666895f640045429aa25491bb77a7d72');
  assert.equal(t.targets[0]!.bindings.sources[0]!.sourceSha256, 'da7a962a6f49c5a37a8e6abf94f57d320095749807aee7b8087bbcea7e6834a7');
  assert.throws(() => validateExpertSubmission(t), /SUBMISSION_SCHEMA/);
});
test('structurally accepted review retains unverified identity and never closes readiness', async () => {
  const { m, submission } = await fixture(); const r = m.validateExpertSubmission(submission);
  assert.equal(r.acceptedSubmissions, 1); assert.equal(r.pendingQA, 81); assert.equal(r.pendingOracle, 128);
  assert.equal(r.independentlyVerified, false); assert.equal(r.humanExpertVerified, 0);
  assert.equal(r.readinessChanged, false); assert.equal(r.status, 'NEEDS_EVIDENCE');
  assert.equal(r.reviewerIdentityStatus, 'SELF_ATTESTED_UNVERIFIED');
});
test('oracle intake binds exact task rubric response lineage and packet', async () => {
  const { m, submission } = await fixture('ORACLE');
  assert.equal(m.validateExpertSubmission(submission).pendingOracle, 127);
  for (const key of ['decisionSha256', 'taskSnapshotSha256', 'taskCriteriaSha256', 'responseSha256', 'lineageSha256', 'rubricCodeSha256']) {
    const copy = structuredClone(submission); (copy.reviews[0]!.bindings as Record<string, unknown>)[key] = '0'.repeat(64);
    assert.throws(() => m.validateExpertSubmission(copy), /TARGET_BINDING/);
  }
});
test('rejects stale template, audio, source and reviewed bundle bindings', async () => {
  const { m, submission } = await fixture();
  const stale = structuredClone(submission); stale.templateSha256 = '0'.repeat(64);
  assert.throws(() => m.validateExpertSubmission(stale), /TEMPLATE_BINDING/);
  for (const key of ['sourceSha256', 'reviewedBundleSha256']) {
    const c = structuredClone(submission); c.reviews[0]!.bindings.sources[0]![key as 'sourceSha256'] = '0'.repeat(64);
    assert.throws(() => m.validateExpertSubmission(c), /TARGET_BINDING/);
  }
  const c = structuredClone(submission); c.reviews[0]!.bindings.audio!.scriptSha256 = '0'.repeat(64);
  assert.throws(() => m.validateExpertSubmission(c), /TARGET_BINDING/);
});
test('rejects duplicate unknown and absent review targets', async () => {
  const { m, submission } = await fixture();
  const c = structuredClone(submission); c.reviews.push(c.reviews[0]!);
  assert.throws(() => m.validateExpertSubmission(c), /DUPLICATE_TARGET/);
  const u = structuredClone(submission); u.reviews[0]!.id = 'invented';
  assert.throws(() => m.validateExpertSubmission(u), /UNKNOWN_TARGET/);
  assert.throws(() => m.validateExpertSubmission({ ...submission, reviews: [] }), /REVIEWS_REQUIRED/);
});
test('rejects AI identity relabeling and unsupported human signature assertions', async () => {
  const { m, submission } = await fixture();
  for (const id of ['WORKLINGO-AI-REVIEWER-001', 'ai-reviewer', 'GPT-6']) {
    assert.throws(() => m.validateExpertSubmission({ ...submission, reviewer: { ...submission.reviewer, id } }), /REVIEWER_PROVENANCE/);
  }
  assert.throws(() => m.validateExpertSubmission({ ...submission, humanSigned: true }), /UNEXPECTED_FIELD/);
  assert.throws(() => m.validateExpertSubmission({ ...submission, reviewer: { ...submission.reviewer, authorType: 'AI' } }), /REVIEWER_PROVENANCE/);
});
test('requires reviewer references, actual time, rationale, confidence and hashed evidence', async () => {
  const { m, submission } = await fixture();
  for (const key of ['qualificationReference', 'identityEvidenceReference']) {
    const c = structuredClone(submission); c.reviewer[key as 'qualificationReference'] = '';
    assert.throws(() => m.validateExpertSubmission(c), /REVIEWER_PROVENANCE/);
  }
  for (const patch of [{ reviewedAt: '2099-01-01T00:00:00.000Z' }, { evidenceReferences: [] }, { evidenceReferences: [{ reference: 'ref', sha256: 'bad' }] }, { rationale: '' }, { confidence: 'CERTAIN' }]) {
    const c = structuredClone(submission); Object.assign(c.reviews[0]!.review, patch);
    assert.throws(() => m.validateExpertSubmission(c), /REVIEW_EVIDENCE/);
  }
});
test('ASR-only audio cannot become auditory PASS and disagreements require rationale', async () => {
  const { m, submission } = await fixture();
  const c = structuredClone(submission); c.reviews[0]!.review.method = 'ASR_ONLY';
  assert.throws(() => m.validateExpertSubmission(c), /AUDIO_LISTENING_REQUIRED/);
  c.reviews[0]!.review.decision = 'NEEDS_EVIDENCE'; assert.equal(m.validateExpertSubmission(c).humanExpertVerified, 0);
  const d = structuredClone(submission); d.reviews[0]!.review.comparisonToAI = 'DISAGREE';
  assert.throws(() => m.validateExpertSubmission(d), /DISAGREEMENT_RATIONALE/);
  const r = structuredClone(submission); r.reviews[0]!.review.decision = 'REVISE';
  assert.throws(() => m.validateExpertSubmission(r), /CORRECTION_REQUIRED/);
});
