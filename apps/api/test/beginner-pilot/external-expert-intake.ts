/** Append-only intake. Structural validation never authenticates a human or grants readiness. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
const ROOT = resolve(__dirname, '../../../..');
const QA = 'docs/qualification/beginner-r12b-expert-qa-final.json';
const ORACLE = 'docs/qualification/beginner-r12b-oracle-adjudication-final.json';
const sha = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
function canonical(v: unknown): unknown {
  return Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)])) : v;
}
const digest = (v: unknown) => sha(JSON.stringify(canonical(v)));
function need(v: unknown, code: string): asserts v { if (!v) throw Error(code); }
type Source = { sourcePath: string; sourceSha256: string; reviewedBundleSha256: string };
type QAItem = { id: string; category: string; itemSha256: string; proposedDisposition: string; context: {
  sourcePath?: string; sourceSha256?: string; reviewedBundleSha256?: string; mappings?: string[];
  relevantLessons?: { lessonCode: string; reviewedBundleSha256: string }[];
  sha256?: string; scriptSha256?: string; path?: string;
} };
type OracleItem = Source & { caseId: string; decisionSha256: string; taskSnapshotSha256: string; taskCriteriaSha256: string; responseSha256: string; lineageSha256: string; rubricCodeSha256: string };
export type ExpertTarget = { kind: 'QA' | 'ORACLE'; id: string; category: string; packetReference: string; bindings: {
  packetSha256: string; itemSha256?: string; decisionSha256?: string; sources: Source[];
  audio?: { path: string; sha256: string; scriptSha256: string };
  taskSnapshotSha256?: string; taskCriteriaSha256?: string; responseSha256?: string; lineageSha256?: string; rubricCodeSha256?: string;
}; review: null };
function pinned<T>(path: string, expected: string): T {
  const b = readFileSync(resolve(ROOT, path)); need(sha(b) === expected, 'PINNED_PACKET_DRIFT'); return JSON.parse(b.toString()) as T;
}
export function buildExpertTemplate() {
  const qa = pinned<{ items: QAItem[]; sourceBundles: (Source & { lesson: string })[]; closureSha256: string }>(QA, '9dbbd4eac3f7922d3d4d53471f636681bfa7c57ada0cb0e9a7937bdba261cd21');
  const oracle = pinned<{ decisions: OracleItem[]; freezeSha256: string }>(ORACLE, 'bdcf1aa547088fcb44c3e0ad7b729ef425d10dc5bbdf33c053d5742e678ca2ba');
  for (const s of qa.sourceBundles) need(sha(readFileSync(resolve(ROOT, s.sourcePath))) === s.sourceSha256, 'CURRENT_SOURCE_DRIFT');
  const source = (s: Source): Source => ({ sourcePath: s.sourcePath, sourceSha256: s.sourceSha256, reviewedBundleSha256: s.reviewedBundleSha256 });
  const sourcesFor = (q: QAItem): Source[] => {
    if (q.context.sourcePath) return [source(q.context as Source)];
    if (q.context.mappings) return [...new Set(q.context.mappings.map(id => qa.items.find(x => x.id === id)!.context.sourcePath))].map(p => source(qa.sourceBundles.find(s => s.sourcePath === p)!));
    return q.context.relevantLessons!.map(l => { const s = qa.sourceBundles.find(s => s.lesson === l.lessonCode); need(s && s.reviewedBundleSha256 === l.reviewedBundleSha256, 'SUPPORT_BINDING'); return source(s); });
  };
  const targets: ExpertTarget[] = qa.items.map(q => {
    const c = q.context;
    if (q.category === 'audio') need(sha(readFileSync(c.path!)) === c.sha256, 'CURRENT_AUDIO_DRIFT');
    return { kind: 'QA', id: q.id, category: q.category, packetReference: QA + '#' + q.id,
      bindings: { packetSha256: qa.closureSha256, itemSha256: q.itemSha256, sources: sourcesFor(q),
        ...(q.category === 'audio' ? { audio: { path: c.path!, sha256: c.sha256!, scriptSha256: c.scriptSha256! } } : {}) }, review: null };
  });
  targets.push(...oracle.decisions.map(o => ({ kind: 'ORACLE' as const, id: o.caseId, category: 'semantic-oracle', packetReference: ORACLE + '#' + o.caseId,
    bindings: { packetSha256: oracle.freezeSha256, decisionSha256: o.decisionSha256, sources: [source(o)], taskSnapshotSha256: o.taskSnapshotSha256,
      taskCriteriaSha256: o.taskCriteriaSha256, responseSha256: o.responseSha256, lineageSha256: o.lineageSha256, rubricCodeSha256: o.rubricCodeSha256 }, review: null })));
  need(targets.length === 210 && new Set(targets.map(t => t.kind + ':' + t.id)).size === 210, 'TARGET_COVERAGE');
  const body = { schemaVersion: 'worklingo-external-expert-template/1', reviewer: null, targets, humanVerified: 0, independentlyVerified: false, readinessChanged: false,
    limitation: 'Blank source-bound intake. Reviewer identity, qualifications, evidence authenticity and independence require external verification. No automatic human PASS or release promotion.' };
  return { ...body, templateSha256: digest(body) };
}
const text = z.string().trim().min(1).max(8000);
const reviewerSchema = z.object({ id: text, authorType: z.literal('HUMAN_SELF_ATTESTED'), qualificationReference: text,
  identityEvidenceReference: text, independenceAttestation: z.literal(true) }).strict();
const reviewSchema = z.object({ decision: z.enum(['PASS', 'REVISE', 'REJECT', 'NEEDS_EVIDENCE']), reviewedAt: z.string().datetime(),
  method: z.enum(['ACTUAL_AUDIO_LISTENING', 'SOURCE_TEXT_REVIEW', 'ASR_ONLY']), evidenceReferences: z.array(z.object({ reference: text, sha256: z.string().regex(/^[a-f0-9]{64}$/u) }).strict()).min(1).max(40),
  rationale: text, confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']), limitations: z.array(text).min(1).max(40), correction: text.nullable(),
  comparisonToAI: z.enum(['AGREE', 'DISAGREE', 'PARTIAL', 'NOT_COMPARED']), disagreementRationale: text.nullable() }).strict();
const submissionSchema = z.object({ schemaVersion: z.literal('worklingo-external-expert-intake/1'), templateSha256: z.string(),
  reviewer: z.unknown(), reviews: z.array(z.object({ kind: z.enum(['QA', 'ORACLE']), id: z.string(), bindings: z.unknown(), review: z.unknown() }).strict()).max(210) }).strict();
export function validateExpertSubmission(input: unknown) {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) throw Error('SUBMISSION_SCHEMA' + (parsed.error.issues.some(i => i.code === 'unrecognized_keys') ? ':UNEXPECTED_FIELD' : ''));
  const s = parsed.data, template = buildExpertTemplate(); need(s.templateSha256 === template.templateSha256, 'TEMPLATE_BINDING');
  const reviewer = reviewerSchema.safeParse(s.reviewer);
  need(reviewer.success && !/(?:\bAI\b|WORKLINGO-AI|GPT|CLAUDE|GEMINI|LLAMA|QWEN)/iu.test(reviewer.data.id), 'REVIEWER_PROVENANCE');
  need(s.reviews.length > 0, 'REVIEWS_REQUIRED'); const seen = new Set<string>(); let qa = 0, oracle = 0;
  for (const row of s.reviews) {
    const key = row.kind + ':' + row.id; need(!seen.has(key), 'DUPLICATE_TARGET'); seen.add(key);
    const target = template.targets.find(t => t.kind === row.kind && t.id === row.id); need(target, 'UNKNOWN_TARGET');
    need(digest(row.bindings) === digest(target.bindings), 'TARGET_BINDING');
    const parsedReview = reviewSchema.safeParse(row.review); need(parsedReview.success, 'REVIEW_EVIDENCE'); const review = parsedReview.data;
    need(Date.parse(review.reviewedAt) <= Date.now(), 'REVIEW_EVIDENCE');
    if (target.category === 'audio' && review.decision === 'PASS') need(review.method === 'ACTUAL_AUDIO_LISTENING', 'AUDIO_LISTENING_REQUIRED');
    if (review.comparisonToAI === 'DISAGREE' || review.comparisonToAI === 'PARTIAL') need(review.disagreementRationale, 'DISAGREEMENT_RATIONALE');
    if (review.decision === 'REVISE' || review.decision === 'REJECT') need(review.correction, 'CORRECTION_REQUIRED');
    if (row.kind === 'QA') qa++; else oracle++;
  }
  return { schemaVersion: 'worklingo-external-expert-validation/1', submissionSha256: digest(s), templateSha256: template.templateSha256,
    acceptedSubmissions: s.reviews.length, structurallyAcceptedQA: qa, structurallyAcceptedOracle: oracle, pendingQA: 82 - qa, pendingOracle: 128 - oracle,
    reviewerIdentityStatus: 'SELF_ATTESTED_UNVERIFIED', independentlyVerified: false, humanExpertVerified: 0, readinessChanged: false, status: 'NEEDS_EVIDENCE' };
}
export function renderExpertInstructions(template = buildExpertTemplate()) {
  return `# External expert review intake\n\nStatus: NEEDS_EVIDENCE. Actual expert decisions: 0/82 QA and 0/128 oracle.\n\nTemplate SHA256: ${template.templateSha256}\n\nReview only targets assigned by the owner. The existing source-bound QA HTML and oracle JSON hold full context; this compact sidecar preserves their exact hashes. Keep the original packets unchanged. For each reviewed target copy kind, id and bindings into a submission with schemaVersion worklingo-external-expert-intake/1 and this templateSha256.\n\nSupply reviewer id, authorType HUMAN_SELF_ATTESTED, qualificationReference, identityEvidenceReference and independenceAttestation true. Keep identity documents and raw review evidence in an owner-controlled private location; submit opaque references and SHA256, never raw identity documents or learner data. Do not commit completed private submissions.\n\nEach review requires decision PASS/REVISE/REJECT/NEEDS_EVIDENCE, actual UTC reviewedAt, method ACTUAL_AUDIO_LISTENING/SOURCE_TEXT_REVIEW/ASR_ONLY, evidenceReferences [{reference,sha256}], rationale, confidence HIGH/MEDIUM/LOW, nonempty limitations, correction (required for REVISE/REJECT, otherwise null), comparisonToAI AGREE/DISAGREE/PARTIAL/NOT_COMPARED, and disagreementRationale (required for DISAGREE/PARTIAL, otherwise null). An audio PASS requires listening to the exact WAV. ASR cannot certify phonetics.\n\nRun: pnpm --filter @worklingo/api exec tsx test/beginner-pilot/external-expert-intake.ts --validate-stdin < private-submission.json\n\nThe validator returns counts and hashes only. Structural acceptance cannot authenticate identity, qualifications, independence, signatures or the referenced evidence. Independently verified human count remains zero and readiness cannot change here. Confirm those facts with the appointed expert through the owner before any separate qualification decision.\n`;
}
if (require.main === module) {
  if (process.argv.length === 3 && process.argv[2] === '--build-template') {
    const t = buildExpertTemplate();
    writeFileSync(resolve(ROOT, 'docs/qualification/beginner-r12b-external-review-template.json'), JSON.stringify(t, null, 2) + '\n');
    writeFileSync(resolve(ROOT, 'docs/qualification/beginner-r12b-external-review-template.md'), renderExpertInstructions(t));
    console.log(JSON.stringify({ targets: t.targets.length, templateSha256: t.templateSha256, humanVerified: 0 }));
  } else if (process.argv.length === 3 && process.argv[2] === '--validate-stdin') {
    const b = readFileSync(0); need(b.length <= 4 * 1024 * 1024, 'SUBMISSION_SIZE'); console.log(JSON.stringify(validateExpertSubmission(JSON.parse(b.toString()))));
  } else throw Error('BUILD_TEMPLATE_OR_VALIDATE_STDIN_ONLY');
}
