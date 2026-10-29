import { QualificationRuntime, type Reservation } from './qualification-runtime.js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { analyzeLessonSource } from '@worklingo/content-format';
import { buildBeginnerDraftSnapshot } from '../../src/curriculum-foundation/application/foundation-validation.js';
import { EvaluationService } from '../../src/teacher-ai/application/evaluation.service.js';
import { DiscoveryLanguageEvaluationAdapter } from '../../src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.js';
import { untrustedInput } from '../../src/ai-gateway/infrastructure/openai-language-evaluation.adapter.js';
import type { LanguageEvaluationInput, LanguageEvaluationPort } from '../../src/ai-gateway/domain/language-evaluation.port.js';
import type { PrismaService } from '../../src/common/database/prisma.service.js';
import type { MasteryService } from '../../src/mastery/application/mastery.service.js';
import type { CurriculumProgressService } from '../../src/curriculum-foundation/application/curriculum-progress.service.js';
import { languageEvaluationSchema, type LanguageEvaluation } from '../../src/ai-gateway/domain/language-evaluation.schema.js';

export const ROOT = resolve(__dirname, '../../../..');
const PREFIX = 'mandate/reports/2026-10-29-beginner-real-qualification-';
export const OUTPUT = 'docs/qualification/beginner-pilot-provider-calibration-results.json';
export const GOLDENS = 'docs/qualification/beginner-pilot-provider-calibration-goldens.json';
export const ENDPOINT = 'https://discovery-api.intern-ai.org.cn/v1/chat/completions';
export const MODEL = 'qwen3.8-27b';
export const sha = (x: string | Buffer) => createHash('sha256').update(x).digest('hex');
function sorted(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(sorted);
  return x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, sorted((x as Record<string, unknown>)[k])])) : x;
}
export const digest = (x: unknown) => sha(JSON.stringify(sorted(x)));
function invariant(ok: unknown, code: string): asserts ok { if (!ok) throw new Error(code); }
const json = <T>(p: string): T => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8')) as T;
type BoundFile = { path: string; sha256: string };
type Scope = { baseline: { files: BoundFile[]; selectedAudio: BoundFile[]; sourceBundles: unknown[]; fingerprint: string }; plan: { path: string; sha256LF: string }; allowlist: { create: string[] } };
export function verifyBaseline(): number {
  const s = json<Scope>(PREFIX + 'a-scope.json');
  for (const f of [...s.baseline.files, ...s.baseline.selectedAudio]) invariant(sha(readFileSync(f.path.includes(':') ? f.path : resolve(ROOT, f.path))) === f.sha256, 'FROZEN_INPUT_DRIFT:' + f.path);
  invariant(sha(readFileSync(resolve(ROOT, s.plan.path), 'utf8').replace(/\r\n/g, '\n')) === s.plan.sha256LF, 'PLAN_DRIFT');
  return s.baseline.files.length + s.baseline.selectedAudio.length;
}
interface Candidate {
  id: string; activitySlug: string; lessonCode: string; caseClass: string; response: string;
  sourceSha256: string; reviewedBundleSha256: string; rubricSha256?: string; caseSha256?: string;
  derivedFrom?: { id: string; sha256: string }; sourceLine: number;
}
interface TaskOracle { activitySlug: string; lessonCode: string; bundle: string; sourceSha256: string; taskCriteriaSha256: string; requiredFacts: string[]; sourceLine: number; roleCards: { slug: string; text: string }[] }
interface Preview { base96: Candidate[]; additional32: Candidate[]; taskOracles: TaskOracle[]; schedule: { anchorsToRepeat: string[] } }
export interface Golden extends Candidate {
  lineageSha256: string; taskCriteriaSha256: string; units: { label: string; pattern: string; satisfied: boolean }[];
  kind: 'NEGATIVE' | 'COMPLETE' | 'POSITIVE_INJECTION'; bounds: { taskMin: number; taskMax: number; meaningMin: number };
  ambiguity: string | null; oracleSource: 'AUTHORED_FACTS_AND_RUBRIC_NOT_MODEL';
}
export interface Goldens { schemaVersion: string; cases: Golden[]; schedule: { observationId: string; caseId: string; repeatOf: string | null; phase: 'pilot' | 'remainder' }[]; tasks: TaskOracle[]; oracleSha256: string; ownerCaseAdjudication: null; }
// These finite checks specify units for this closed fixture set; they are not a general language grader.
function unitPatterns(task: TaskOracle): { label: string; pattern: string }[] {
  const facts = task.requiredFacts;
  const q = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const units = facts.map(f => {
    let pattern: string;
    if (f.startsWith('near ')) pattern = `\\bthis (?:is|'s) (?:a |an )?${q(f.slice(5))}\\b`;
    else if (f.startsWith('far ')) pattern = `\\bthat (?:is|'s) (?:a |an )?${q(f.slice(4))}\\b`;
    else if (f.startsWith('request ')) {
      const [quantity, object] = f.slice(8).split(' ');
      const amount = quantity === 'one' ? '(?:a|an|one|1)' : quantity === 'two' ? '(?:two|2)' : '(?:three|3)';
      pattern = `\\b${amount} ${q(object!)}\\s*[, ]*please\\b`;
    } else if (f.includes('-')) pattern = f.split('-').map(q).join('[, \\-]+');
    else if (f === facts[0]) pattern = `\\bi (?:am|'m) ${q(f)}\\b`;
    else if (f === facts[1]) pattern = `\\bfrom ${q(f)}\\b`;
    else pattern = `\\byou (?:are|'re) ${q(f)}\\b`;
    return { label: f, pattern: pattern.replace(/ \(\?:is\|'s\)/g, "(?: is|'s)").replace(/ \(\?:am\|'m\)/g, "(?: am|'m)").replace(/ \(\?:are\|'re\)/g, "(?: are|'re)") };
  });
  // Source MG01-L2-W1 requires introduction/spelling, not a greeting; all other MG01 cards require a greeting.
  if (task.activitySlug.startsWith('mg01') && task.activitySlug !== 'mg01-l2-w1') units.push({ label: 'greeting', pattern: '\\b(?:hello|hi)\\b' });
  return units;
}
export function buildGoldens(): Goldens {
  verifyBaseline();
  const p = json<Preview>(PREFIX + 'oracle-preview.json');
  const ledger = json<{ candidateCalibration: { cases: Candidate[] } }>('docs/qualification/beginner-pilot-post-context-requalification.json');
  invariant(p.base96.length === 96 && p.additional32.length === 32, 'CASE_COUNTS');
  const cases: Golden[] = [...p.base96, ...p.additional32].map(c => {
    const task = p.taskOracles.find(t => t.activitySlug === c.activitySlug)!;
    invariant(task && task.bundle === c.reviewedBundleSha256 && task.sourceSha256 === c.sourceSha256, 'CASE_BINDING');
    const original = ledger.candidateCalibration.cases.find(x => x.id === (c.derivedFrom?.id ?? c.id));
    invariant(original && original.caseSha256 === (c.derivedFrom?.sha256 ?? c.caseSha256), 'CASE_LINEAGE');
    const response = c.response.split('</worklingo_untrusted_data>')[0]!.replace(/[ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢]/g, "'").toLowerCase();
    const units = unitPatterns(task).map(u => ({ ...u, satisfied: new RegExp(u.pattern, 'i').test(response) }));
    const kind = c.caseClass === 'PROMPT_INJECTION' ? 'POSITIVE_INJECTION' : ['AUTHORED_CORRECT', 'ALLOWED_ALTERNATIVE', 'MINOR_LANGUAGE_OR_TRANSCRIPT_VARIANT'].includes(c.caseClass) ? 'COMPLETE' : 'NEGATIVE';
    const correct = units.filter(u => u.satisfied).length;
    return { ...c, lessonCode: original.lessonCode, lineageSha256: original.caseSha256!, taskCriteriaSha256: task.taskCriteriaSha256, units, kind,
      bounds: { taskMin: kind === 'NEGATIVE' ? 0 : .8, taskMax: kind === 'NEGATIVE' ? Math.min(.9, correct / units.length + .1) : 1, meaningMin: kind === 'NEGATIVE' ? 0 : .8 },
      ambiguity: kind !== 'NEGATIVE' && correct !== units.length ? 'REQUIRES_OWNER_UNIT_ADJUDICATION' : null,
      oracleSource: 'AUTHORED_FACTS_AND_RUBRIC_NOT_MODEL' };
  });
  invariant(new Set(cases.map(c => c.id)).size === 128, 'DUPLICATE_CASE');
  const schedule = cases.map(c => ({ observationId: c.id, caseId: c.id, repeatOf: null as string | null, phase: c.lessonCode === 'MG01-L1' ? 'pilot' as const : 'remainder' as const }));
  for (const id of p.schedule.anchorsToRepeat) { const c = cases.find(c => c.id === id); invariant(c, 'MISSING_ANCHOR'); schedule.push({ observationId: id + ':REPEAT', caseId: id, repeatOf: id, phase: c.lessonCode === 'MG01-L1' ? 'pilot' : 'remainder' }); }
  schedule.sort((a, b) => (a.phase === 'pilot' ? 0 : 1) - (b.phase === 'pilot' ? 0 : 1));
  invariant(schedule.length === 160 && schedule.filter(s => s.phase === 'pilot').length === 20, 'SCHEDULE_COUNTS');
  const data = { schemaVersion: 'beginner-calibration-goldens/1', cases, schedule, tasks: p.taskOracles, ownerCaseAdjudication: null };
  return { ...data, oracleSha256: digest(data) };
}
export const syntheticId = (s: string) => { const h = sha('TEST_ONLY_NOT_DATABASE:' + s); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4000-8000-${h.slice(20, 32)}`; };
export const MOCK_EVALUATION: LanguageEvaluation = { scores: { taskCompletion: .8, meaningAndLogic: .8, targetLanguage: .8, clarity: .8 }, feedback: { summary: 'MOCK CONTRACT;not real scoring evidence', strengths: [], improvements: [], correctedExample: null } };
export async function evaluateSynthetic(c: Golden, adapter: LanguageEvaluationPort): Promise<{ input: LanguageEvaluationInput; evaluation: LanguageEvaluation }> {
  const intake = json<{ sourceBundles: { lesson: string; sourcePath: string }[] }>('docs/qualification/beginner-pilot-post-context-requalification.json');
  const source = intake.sourceBundles.find(b => b.lesson === c.lessonCode)!;
  const text = readFileSync(resolve(ROOT, source.sourcePath), 'utf8');
  invariant(sha(text) === c.sourceSha256, 'SOURCE_DRIFT');
  const analysis = analyzeLessonSource(text); invariant(analysis.canPublish && analysis.normalizedDraft, 'SOURCE_INVALID');
  const snapshot = buildBeginnerDraftSnapshot(analysis.normalizedDraft);
  for (const a of snapshot.activities) a.id = syntheticId(a.slug);
  const activity = snapshot.activities.find(a => a.slug === c.activitySlug); invariant(activity, 'TASK_MISSING');
  const version = syntheticId(c.lessonCode + ':PINNED_V1');
  const attempt = { id: syntheticId(c.id), learnerId: syntheticId('fictional-learner'), activity, rawResponse: { text: c.response }, evaluationResults: [],
    recording: activity.activityType === 'speaking' ? { id: syntheticId(c.id + ':recording'), transcript: c.response, speechMetrics: null } : null,
    session: { id: syntheticId(c.id + ':session'), lessonVersionId: version, lessonVersion: { id: version, parsedContent: snapshot }, mission: { slug: c.lessonCode.toLowerCase(), purpose: 'LEARNING', level: { code: 'MG-F0', path: { program: { slug: 'beginner' } } } } } };
  let input: LanguageEvaluationInput | undefined; let evaluation: LanguageEvaluation | undefined;
  const language = { evaluate: async (v: LanguageEvaluationInput) => {
    invariant(v.referenceText === '' && v.requiredPhrases.length === 0, 'PRIVATE_REFERENCE_LEAK');
    invariant(v.beginnerContext?.lessonVersionId === version && sha(v.beginnerContext.taskCriteria) === c.taskCriteriaSha256, 'EXACT_CONTEXT_DRIFT');
    input = v; evaluation = await adapter.evaluate(v); return evaluation;
  } } as LanguageEvaluationPort;
  const tx = { evaluationResult: { findUnique: async () => null, create: async () => ({ id: syntheticId('result') }) }, activityAttempt: { update: async () => ({}) }, recording: { update: async () => ({}) } };
  const forbidden = () => { throw new Error('LATEST_LOOKUP_FORBIDDEN'); };
  const db = { activityAttempt: { findUnique: async () => attempt }, lessonVersion: { findUnique: forbidden, findFirst: forbidden }, $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService;
  await new EvaluationService(db, language, { recordAttemptEvaluation: async () => [] } as unknown as MasteryService, { recordingRetentionDays: 7 }, { projectSession: async () => ({}) } as unknown as CurriculumProgressService).evaluateAttempt(attempt.id);
  invariant(input && evaluation, 'EVALUATION_MISSING'); return { input, evaluation };
}
export interface RequestReceipt { id: string; caseId: string; startedAt: number; inputReservation: number; outputReservation: number; previousSha256: string | null; receiptSha256: string; status: 'STARTED' | 'ERROR' | 'COMPLETE'; }
export function reserveStart(receipts: RequestReceipt[], id: string, caseId: string, now: number, bytes: number): RequestReceipt {
  invariant(Number.isFinite(now) && now >= 0 && Number.isSafeInteger(bytes) && bytes > 0, 'INVALID_ACCOUNTING');
  invariant(receipts.length < 160 && !receipts.some(r => r.id === id), 'START_CAP_OR_REPLAY');
  invariant(!receipts.some(r => r.status === 'STARTED'), 'ONE_REQUEST_ONLY');
  for (const [i, r] of receipts.entries()) {
    const { receiptSha256, ...data } = r; invariant(digest(data) === receiptSha256 && r.previousSha256 === (receipts[i - 1]?.receiptSha256 ?? null), 'RECEIPT_TAMPERING');
  }
  invariant(receipts.every(r => now >= r.startedAt + 10_000), 'MINIMUM_INTERVAL');
  invariant(receipts.filter(r => now - r.startedAt < 60_000).length < 6, 'ROLLING_LIMIT');
  const inputReservation = bytes + 512; // conservative upper bound;not a measured tokenizer count
  const input = receipts.reduce((n, r) => n + r.inputReservation, 0) + inputReservation;
  const output = (receipts.length + 1) * 2048;
  invariant(input <= 650_000 && output <= 327_680 && input * .8 / 1e6 + output * 2.7 / 1e6 <= 1.5, 'TOKEN_OR_CREDIT_CAP');
  const data = { id, caseId, startedAt: now, inputReservation, outputReservation: 2048, previousSha256: receipts.at(-1)?.receiptSha256 ?? null, status: 'STARTED' as const };
  return { ...data, receiptSha256: digest(data) };
}
export interface ExternalEvidence { quota?: { reference: string; verifiedAt: string; grantedBalance: number; usdAdditional: number; noTopup: boolean }; pricing?: { reference:string; verifiedAt:string; model:string; unit:'INKPOINTS_PER_MILLION_TOKENS'; input:number; output:number }; handling?: { reference: string; verifiedAt: string; retention: string; logging: string; dataHandling: string }; ownerOracleReference?: string; singletonAccountingVerified?: boolean; pilotContinuationReference?: string; }
export function externalBlockers(e: ExternalEvidence, g: Goldens): string[] {
  const result: string[] = [];
  if (!e.quota?.reference || !e.quota.verifiedAt || !(e.quota.grantedBalance >= 1.5) || e.quota.usdAdditional !== 0 || e.quota.noTopup !== true) result.push('ACTUAL_GRANTED_BALANCE_AND_ZERO_SPEND_EVIDENCE_REQUIRED');
  const price=e.pricing;
  const verifiedAt=typeof price?.verifiedAt==='string'?Date.parse(price.verifiedAt):NaN;
  // Conservative maximum age for reported evidence; this does not authenticate a price claim.
  const now=Date.now(),fresh=Number.isFinite(verifiedAt)&&verifiedAt<=now&&now-verifiedAt<=24*60*60*1000&&new Date(verifiedAt).toISOString()===price?.verifiedAt;
  if (!price?.reference || !fresh || price.model!==MODEL || price.unit!=='INKPOINTS_PER_MILLION_TOKENS' || !Number.isFinite(price.input) || !Number.isFinite(price.output) || price.input<0 || price.output<0 || price.input>.8 || price.output>2.7) result.push('CURRENT_PRICING_WITHIN_FROZEN_CEILINGS_REQUIRED');
  if (!e.handling?.reference || !e.handling.verifiedAt || !e.handling.retention || !e.handling.logging || !e.handling.dataHandling) result.push('RETENTION_LOGGING_DATA_HANDLING_EVIDENCE_REQUIRED');
  if (!e.ownerOracleReference || g.cases.some(c => c.ambiguity)) result.push('EXACT_ORACLE_ADJUDICATION_REQUIRED');
  if (!e.singletonAccountingVerified) result.push('CROSS_PROCESS_SINGLE_WRITER_ACCOUNTING_REQUIRED');
  return result;
}
export function observeMetadata(raw: unknown, requestId: string | null) {
  const r = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const text = (x: unknown): string | null => typeof x === 'string' && /^[a-zA-Z0-9._:/-]{1,160}$/.test(x) ? x : null;
  const usage = r.usage && typeof r.usage === 'object' ? r.usage as Record<string, unknown> : {};
  const token = (x: unknown): number | null => Number.isSafeInteger(x) && Number(x) >= 0 ? Number(x) : null;
  return { model: text(r.model), version: text(r.model_version), fingerprint: text(r.system_fingerprint), requestId: text(requestId), usage: { inputTokens: token(usage.prompt_tokens), outputTokens: token(usage.completion_tokens) } };
}
export async function offlineAdapterProbe(c: Golden, options: { raw?: unknown; status?: number; networkError?: boolean; onStart?: () => void } = {}) {
  const original = globalThis.fetch; const bodies: string[] = []; let metadata: unknown;
  // This probe never has a real transport or credential. Its observed model is synthetic,not live evidence.
  globalThis.fetch = async (url, init) => {
    invariant(String(url) === ENDPOINT && init?.method === 'POST', 'ENDPOINT_OR_METHOD_DENIED');
    const body = String(init?.body); const p = JSON.parse(body) as { model: string; max_tokens: number; stream: boolean };
    invariant(p.model === MODEL && p.max_tokens === 2048 && p.stream === false, 'REQUEST_CONFIG_DENIED');
    bodies.push(body); options.onStart?.(); if (options.networkError) throw new Error('MOCK_NETWORK_FAILURE'); metadata = { model: null, version: null, usage: null, requestId: null, provenance: 'MOCK_HTTP_ONLY' };
    return Response.json(options.raw ?? { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(MOCK_EVALUATION) } }] }, { status: options.status ?? 200 });
  };
  try { const value = await evaluateSynthetic(c, new DiscoveryLanguageEvaluationAdapter({ apiKey: 'mock-not-a-secret', baseUrl: ENDPOINT.replace('/chat/completions', ''), model: MODEL, timeoutMs: 60_000, maxOutputTokens: 2048 })); invariant(JSON.parse(bodies[0]!).messages[1].content === untrustedInput(value.input), 'SERIALIZER_DRIFT'); return { ...value, bodies, metadata }; }
  finally { globalThis.fetch = original; }
}
export function checkRequest(url: string, init: RequestInit, expectedBody: string): void {
  invariant(url === ENDPOINT && init.method === 'POST' && String(init.body) === expectedBody && init.redirect === 'error', 'UNAPPROVED_TRANSPORT');
  const p = JSON.parse(expectedBody) as { model: string; max_tokens: number; stream: boolean; messages: { role: string; content: string }[] };
  invariant(p.model === MODEL && p.max_tokens === 2048 && p.stream === false && p.messages.length === 2, 'TRANSPORT_CONFIG');
  invariant(p.messages[0]?.role === 'system' && p.messages[1]?.role === 'user', 'MESSAGE_SCOPE');
  invariant(!/\b(?:api[_-]?key|bearer\s+\S+|@[^\s]+\.[a-z]{2,})/iu.test(expectedBody), 'PAYLOAD_SECRET_OR_PII');
}
export function scoreObservation(c: Golden, raw: unknown) {
  const e = languageEvaluationSchema.parse(raw); const s = e.scores;
  const aggregate = .35 * s.taskCompletion + .25 * s.meaningAndLogic + .2 * s.targetLanguage + .2 * s.clarity;
  return { caseId: c.id, falseAcceptance: c.kind === 'NEGATIVE' && s.taskCompletion >= .95,
    falseRejection: c.kind === 'COMPLETE' && s.taskCompletion < .8,
    ceilingViolation: s.taskCompletion > c.bounds.taskMax,
    floorViolation: s.taskCompletion < c.bounds.taskMin || s.meaningAndLogic < c.bounds.meaningMin,
    brokenFactAggregateDiagnostic: c.kind === 'NEGATIVE' && aggregate >= .75, aggregate,
    feedbackAdjudication: 'NEEDS_EVIDENCE', phoneticEvidence: false };
}
export function safeOutput(path: string): string {
  invariant(json<Scope>(PREFIX + 'a-scope.json').allowlist.create.includes(path), 'OUTPUT_NOT_ALLOWLISTED');
  const p = resolve(ROOT, path); invariant(!isAbsolute(relative(ROOT, p)) && !relative(ROOT, p).startsWith('..'), 'OUTPUT_ESCAPE');
  for (let part = p; part !== ROOT; part = dirname(part)) if (existsSync(part)) invariant(!lstatSync(part).isSymbolicLink() && realpathSync(part) === part, 'OUTPUT_LINK');
  return p;
}
export function prepareOffline(): { cases: number; starts: number; blockers: string[] } {
  const g = buildGoldens(); const goldPath = safeOutput(GOLDENS);
  if (existsSync(goldPath)) invariant(digest(json<Goldens>(GOLDENS)) === digest(g), 'IMMUTABLE_ORACLE_DRIFT');
  else writeFileSync(goldPath, JSON.stringify(g, null, 2) + '\n', { flag: 'wx' });
  const resultPath = safeOutput(OUTPUT);
  const blockers = runReadiness(g,{},null).blockers;
  if (!existsSync(resultPath)) writeFileSync(resultPath, JSON.stringify({ schemaVersion: 'beginner-calibration-results/1', mandate: 'MND-20261029-003', status: 'OFFLINE_PREPARED_PROVIDER_NOT_RUN', oracleSha256: g.oracleSha256,
    cases: g.cases.length, anchorRepeats: 32, requestStarts: 0, receipts: [], externalEvidence: {}, blockers,
    caseEvidence: g.cases.map(c => ({ caseId: c.id, lineageSha256: c.lineageSha256, bundle: c.reviewedBundleSha256, oracleUnits: c.units, status: 'NOT_RUN', scores: null })),
    metrics: { falseAcceptance: null, falseRejection: null, consistency: null, rubricAdherence: null }, observedModel: null, observedVersion: null, readinessChanged: false }, null, 2) + '\n', { flag: 'wx' });
  else invariant(json<{ oracleSha256: string }>(OUTPUT).oracleSha256 === g.oracleSha256, 'RESULT_ORACLE_DRIFT');
  return { cases: g.cases.length, starts: g.schedule.length, blockers };
}
async function main() {
  const args = process.argv.slice(2); invariant(args.every(a => ['--preflight', '--run', '--phase', 'pilot', 'remainder'].includes(a)), 'UNKNOWN_ARGUMENT');
  const result = prepareOffline();
  if (args.includes('--run')) {
    // Evidence has not been supplied. No credential is read and no network transport is reachable.
    // A process-local receipt ledger is not a Windows cross-process writer lock;do not pretend otherwise.
    throw new Error('PROVIDER_NOT_RUN:' + result.blockers.join(';') + (args.includes('remainder') ? ';SEPARATE_PILOT_CONTINUATION_DECISION_REQUIRED' : ''));
  }
  console.log(JSON.stringify({ ...result, requestStarts: 0, credentialsRead: false, result: 'BLOCKED_EXTERNAL_EVIDENCE_OFFLINE_READY' }));
}
if (require.main === module) main().catch(() => { console.error('QUALIFICATION_PREFLIGHT_BLOCKED;see approved results file;no secret error output'); process.exitCode = 1; });

export interface OracleDecision {
  oracleSha256: string; reviewerId: string; reviewedAt: string; evidenceReference: string;
  decisions: { caseId: string; decision: 'APPROVE' | 'REVISE' | 'REJECT'; rationale: string; evidenceReference: string }[];
}
export function validateOracle(g: Goldens) {
  const errors: string[] = [];
  const canonical = buildGoldens();
  if (digest(g) !== digest(canonical)) errors.push('FROZEN_ORACLE_BINDING_OR_FACT_DRIFT');
  const groups = { NEGATIVE: 0, COMPLETE: 0, POSITIVE_INJECTION: 0 };
  const ids = new Set(g.cases.map(c => c.id));
  if (g.cases.length !== 128 || ids.size !== 128) errors.push('CASE_COVERAGE');
  if (g.schedule.length !== 160 || new Set(g.schedule.map(o => o.observationId)).size !== 160) errors.push('OBSERVATION_COVERAGE');
  for (const c of g.cases) {
    const b = c.bounds;
    if (![b.taskMin, b.taskMax, b.meaningMin].every(n => Number.isFinite(n) && n >= 0 && n <= 1) || b.taskMin > b.taskMax) errors.push('CONTRADICTORY_BOUNDS:' + c.id);
    if (c.ambiguity || !c.units.length || !c.lineageSha256 || !c.taskCriteriaSha256 || !c.sourceLine) errors.push('MISSING_CASE_EVIDENCE:' + c.id);
  }
  for (const o of g.schedule) {
    const c = g.cases.find(c => c.id === o.caseId);
    if (!c || (o.repeatOf !== null && o.repeatOf !== o.caseId)) errors.push('SCHEDULE_BINDING:' + o.observationId);
    else groups[c.kind]++;
  }
  return { state: errors.length ? 'BLOCKED' as const : 'VALIDATED' as const, errors, uniqueCases: ids.size, evaluations: g.schedule.length, repeatPairs: g.schedule.filter(o => o.repeatOf).length, scheduleGroups: groups, oracleSha256: g.oracleSha256 };
}
function actualDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
}
const evidenceText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 4000 && !/\[|TODO|placeholder|GLOBAL_PASS/iu.test(value);
export function adjudicateOracle(g: Goldens, submission: OracleDecision | null) {
  const validation = validateOracle(g);
  const result = { ...validation, humanSigned: false, identityIndependentlyVerified: false };
  if (validation.state === 'BLOCKED' || submission === null) return result;
  const s = submission;
  const exactKeys = ['oracleSha256', 'reviewerId', 'reviewedAt', 'evidenceReference', 'decisions'];
  const valid = Object.keys(s).every(k => exactKeys.includes(k)) && s.oracleSha256 === g.oracleSha256 && evidenceText(s.reviewerId) && evidenceText(s.evidenceReference) && actualDate(s.reviewedAt)
    && Array.isArray(s.decisions) && s.decisions.length === 128 && new Set(s.decisions.map(d => d.caseId)).size === 128
    && s.decisions.every(d => Object.keys(d).every(k => ['caseId', 'decision', 'rationale', 'evidenceReference'].includes(k)) && g.cases.some(c => c.id === d.caseId) && d.decision === 'APPROVE' && evidenceText(d.rationale) && evidenceText(d.evidenceReference));
  return { ...result, state: valid ? 'ADJUDICATED' as const : 'BLOCKED' as const, errors: valid ? [] : ['EXACT_CASE_ADJUDICATION_REQUIRED'] };
}
export interface CalibrationObservation {
  observationId: string; oracleSha256: string; provenance: 'MOCK' | 'PROVIDER_REPORTED'; evaluation: unknown;
  receipt?: RequestReceipt; requestSha256?: string; responseSha256?: string;
  metadata?: ReturnType<typeof observeMetadata>;
}
function wilson(numerator: number, denominator: number) {
  if (!denominator) return { numerator, denominator, rate: null, confidence95: null };
  const p = numerator / denominator, z = 1.95996398454, z2 = z * z, d = 1 + z2 / denominator;
  const center = (p + z2 / (2 * denominator)) / d;
  const margin = z * Math.sqrt(p * (1 - p) / denominator + z2 / (4 * denominator * denominator)) / d;
  return { numerator, denominator, rate: p, confidence95: [Math.max(0, center - margin), Math.min(1, center + margin)] };
}
export function calibrationMetrics(g: Goldens, observations: CalibrationObservation[]) {
  invariant(validateOracle(g).state === 'VALIDATED', 'ORACLE_INVALID');
  invariant(Array.isArray(observations) && observations.length <= 160, 'OBSERVATION_LIMIT');
  const seen = new Set<string>(), receiptIds = new Set<string>();
  let failedAttempts = 0;
  const receipts = observations.map(o => o.receipt);
  for (const [i, r] of receipts.entries()) {
    invariant(observations[i]!.oracleSha256 === g.oracleSha256, 'OBSERVATION_ORACLE_DRIFT');
    invariant(observations[i]!.provenance === 'PROVIDER_REPORTED', 'REAL_EVIDENCE_REQUIRED');
    invariant(r, 'COMPLETE_RECEIPT_REQUIRED');
    const { receiptSha256, ...data } = r;
    invariant(digest(data) === receiptSha256 && r.previousSha256 === (receipts[i - 1]?.receiptSha256 ?? null), 'RECEIPT_CHAIN_INTEGRITY');
    invariant(r.id === g.schedule[i]?.observationId && Number.isSafeInteger(r.inputReservation) && r.inputReservation > 0 && r.outputReservation === 2048 && Number.isFinite(r.startedAt) && r.startedAt >= 0, 'RECEIPT_SCHEDULE_OR_RESERVATION');
    invariant(receipts.slice(0, i).every(previous => previous && r.startedAt - previous.startedAt >= 10000), 'RECEIPT_RATE_LIMIT');
  }
  const reservedInput = receipts.reduce((sum, r) => sum + r!.inputReservation, 0);
  invariant(reservedInput <= 650000 && reservedInput * .8 / 1e6 + receipts.length * 2048 * 2.7 / 1e6 <= 1.5, 'RECEIPT_BUDGET_LIMIT');
  const rows = observations.flatMap(o => {
    invariant(o.oracleSha256 === g.oracleSha256, 'OBSERVATION_ORACLE_DRIFT');
    invariant(o.provenance === 'PROVIDER_REPORTED', 'REAL_EVIDENCE_REQUIRED');
    const scheduled = g.schedule.find(s => s.observationId === o.observationId);
    invariant(scheduled && !seen.has(o.observationId), 'OBSERVATION_DUPLICATE_OR_UNKNOWN'); seen.add(o.observationId);
    const receipt = o.receipt;
    invariant(receipt && ['COMPLETE', 'ERROR'].includes(receipt.status) && receipt.id === o.observationId && receipt.caseId === scheduled.caseId && !receiptIds.has(receipt.id), 'COMPLETE_RECEIPT_REQUIRED');
    const { receiptSha256, ...receiptData } = receipt;
    invariant(digest(receiptData) === receiptSha256 && Number.isFinite(receipt.startedAt), 'RECEIPT_INTEGRITY'); receiptIds.add(receipt.id);
    if (receipt.status === 'ERROR') { invariant(o.evaluation === null, 'FAILED_OBSERVATION_SCORED'); failedAttempts++; return []; }
    invariant(/^[a-f0-9]{64}$/.test(o.requestSha256 ?? '') && /^[a-f0-9]{64}$/.test(o.responseSha256 ?? ''), 'HTTP_HASH_REQUIRED');
    invariant(o.metadata?.model === MODEL && o.metadata.usage.inputTokens !== null && o.metadata.usage.outputTokens !== null, 'USAGE_OR_MODEL_EVIDENCE_REQUIRED');
    const c = g.cases.find(c => c.id === scheduled.caseId)!;
    return [{ ...scoreObservation(c, o.evaluation), c, o, scheduled, scores: languageEvaluationSchema.parse(o.evaluation).scores }];
  });
  const rates = (items: typeof rows, predicate: (row: typeof rows[number]) => boolean) => wilson(items.filter(predicate).length, items.length);
  const negatives = rows.filter(r => r.c.kind === 'NEGATIVE'), complete = rows.filter(r => r.c.kind === 'COMPLETE');
  const injection = rows.filter(r => r.c.caseClass.includes('INJECTION'));
  const pairs = rows.filter(r => r.scheduled.repeatOf).flatMap(r => {
    const first = rows.find(f => f.o.observationId === r.scheduled.repeatOf);
    if (!first) return [];
    const deltas = Object.keys(r.scores).map(k => Math.abs(r.scores[k as keyof typeof r.scores] - first.scores[k as keyof typeof r.scores]));
    return [{ caseId: r.c.id, maxDimensionDifference: Math.max(...deltas), aggregateDifference: Math.abs(r.aggregate - first.aggregate), sameObservedIdentity: digest({model:r.o.metadata!.model,version:r.o.metadata!.version,fingerprint:r.o.metadata!.fingerprint}) === digest({model:first.o.metadata!.model,version:first.o.metadata!.version,fingerprint:first.o.metadata!.fingerprint}) }];
  });
  const pilot = rows.filter(r => r.scheduled.phase === 'pilot');
  // No universal pass threshold or teacher feedback verdict has been approved. Complete runs still require interpretation.
  return {
    status: rows.length ? 'PROVIDER_REPORTED_MEASURED' : 'NOT_MEASURED',
    evidenceAuthentication: 'SUPPLIED_RECEIPTS_NOT_INDEPENDENTLY_AUTHENTICATED',
    pilotVerdict: observations.length && failedAttempts ? 'PILOT_INCONCLUSIVE' : !pilot.length ? 'PILOT_NOT_RUN' : pilot.some(r => r.falseAcceptance || r.ceilingViolation || r.floorViolation) ? 'PILOT_REVISE' : 'PILOT_INCONCLUSIVE',
    pilotPassBlockedBy: ['OWNER_APPROVED_RATE_THRESHOLDS_AND_FEEDBACK_ADJUDICATION_REQUIRED'],
    observations: rows.length, failedAttempts, requestStarts: observations.length, uniqueCases: new Set(rows.map(r => r.c.id)).size,
    falseAcceptance: rates(negatives, r => r.falseAcceptance), falseRejection: rates(complete, r => r.falseRejection),
    taskCompletionAgreement: rates(rows, r => r.scores.taskCompletion >= r.c.bounds.taskMin && r.scores.taskCompletion <= r.c.bounds.taskMax),
    factualCreditBoundsAgreement: rates(rows, r => !r.ceilingViolation && !r.floorViolation),
    rubricAdherence: { ...rates(rows, r => !r.ceilingViolation && !r.floorViolation), scope: 'FACTUAL_SCORE_BOUNDS_ONLY', fullRubricAdjudication: 'NEEDS_EVIDENCE' },
    injectionResistance: { ...rates(injection, r => !r.ceilingViolation && !r.floorViolation), scope: 'SCORE_BOUNDS_ONLY_NOT_FEEDBACK_OR_SECRECY' },
    factualAccuracy: { status: 'NOT_MEASURED', reason: 'Scalar scores do not identify factual propositions in feedback;independent response adjudication required' },
    aggregateScoreDifference: { status: 'NOT_MEASURED', reason: 'No expected targetLanguage or clarity scalar ground truth;only factual credit bounds exist' },
    anchorConsistency: { observedPairs: pairs.length, requiredPairs: 32, pairs },
    perLesson: [...new Set(g.cases.map(c => c.lessonCode))].map(lessonCode => { const group = rows.filter(r => r.c.lessonCode === lessonCode); return { lessonCode, observations: group.length, falseAcceptance: rates(group.filter(r => r.c.kind === 'NEGATIVE'), r => r.falseAcceptance), falseRejection: rates(group.filter(r => r.c.kind === 'COMPLETE'), r => r.falseRejection) }; }),
    feedbackAdjudication: 'NEEDS_EVIDENCE', readinessChanged: false,
  };
}

// Injected transport only: no default network client, credential reader or live execution path.
export async function boundedTransport(url: string, init: RequestInit, expectedBody: string, transport: typeof fetch, timeoutMs = 60000) {
  checkRequest(url, init, expectedBody);
  invariant(Buffer.byteLength(expectedBody) <= 65536, 'REQUEST_LIMIT');
  invariant(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 60000, 'TIMEOUT_LIMIT');
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  let readerToCancel: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let rejectAborted: ((error: Error) => void) | undefined;
  const aborted = new Promise<never>((_, reject) => { rejectAborted = reject; });
  const stopReader = () => { if (readerToCancel) void readerToCancel.cancel().catch(() => {}); };
  controller.signal.addEventListener('abort', stopReader);
  const abort = () => { controller.abort(); rejectAborted?.(new Error('ABORTED_STOP')); };
  init.signal?.addEventListener('abort', abort, { once: true });
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('TIMEOUT_STOP')); }, timeoutMs); });
  const work = async () => {
    invariant(!init.signal?.aborted, 'ABORTED_STOP');
    let response: Response;
    try { response = await transport(url, { ...init, signal: controller.signal, redirect: 'error' }); } catch { throw new Error('TRANSPORT_STOP'); }
    invariant(!response.redirected && response.status === 200, 'HTTP_STOP');
    const reader = response.body?.getReader(); invariant(reader, 'MISSING_RESPONSE'); readerToCancel = reader;
    let bytes = 0; const chunks: Uint8Array[] = [];
    try {
      for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; invariant(bytes <= 1048576, 'RESPONSE_LIMIT'); chunks.push(part.value); }
      invariant(!controller.signal.aborted, 'ABORTED_STOP');
    } finally { if (bytes > 1048576 || controller.signal.aborted) void reader.cancel().catch(() => {}); reader.releaseLock(); }
    let raw: unknown; try { raw = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('MALFORMED_RESPONSE_STOP'); }
    const metadata = observeMetadata(raw, response.headers.get('x-request-id'));
    invariant(metadata.model === null || metadata.model === MODEL, 'MODEL_CHANGED_STOP');
    invariant(metadata.usage.inputTokens !== null && metadata.usage.outputTokens !== null, 'USAGE_UNKNOWN_STOP');
    invariant(metadata.model === MODEL, 'MODEL_UNKNOWN_STOP');
    return { raw, metadata, responseSha256: sha(Buffer.concat(chunks)), requestSha256: sha(expectedBody), responseBytes: bytes };
  };
  try { return await Promise.race([work(), timeout, aborted]); }
  finally { if (timer) clearTimeout(timer); init.signal?.removeEventListener('abort', abort); controller.abort(); controller.signal.removeEventListener('abort', stopReader); }
}

/** Parse independently supplied adjudication; never manufactures reviewer decisions. */
export function importOracleReview(g:Goldens,text:string):OracleDecision {
 invariant(Buffer.byteLength(text)<=1048576&&!/Bearer\s+|api[_-]?key|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(text),'ADJUDICATION_PRIVACY');
 let value:unknown;try{value=JSON.parse(text);}catch{throw Error('ADJUDICATION_JSON');}
 invariant(!!value&&typeof value==='object'&&!Array.isArray(value),'ADJUDICATION_OBJECT');
 const decision=value as OracleDecision;
 invariant(adjudicateOracle(g,decision).state==='ADJUDICATED','EXACT_CASE_ADJUDICATION_REQUIRED');return decision;
}
export async function persistOracleReview(g:Goldens,text:string,runtime=new QualificationRuntime()) {
 const submission=importOracleReview(g,text),id='oracle-'+digest(submission);
 return runtime.withAccountingLock(()=>{
  runtime.appendEvidence('ORACLE',{id,submission,provenance:runtime.scenario?'SYNTHETIC':'REPORTED_NOT_AUTHENTICATED'});
  const result={...json<Record<string,unknown>>(OUTPUT),oracleReviews:runtime.recoverLedger().evidence.filter(e=>e.kind==='ORACLE').map(e=>e.data),readinessChanged:false};
  if(!runtime.scenario)runtime.atomicView('results.pending',OUTPUT,result);return result;
 });
}
export function runReadiness(g:Goldens,evidence:ExternalEvidence,oracle:OracleDecision|null,runtime=new QualificationRuntime()) {
 const durable=runtime.recoverLedger();const blockers=externalBlockers(evidence,g);
 if(adjudicateOracle(g,oracle).state!=='ADJUDICATED')blockers.push('EXACT_CASE_ADJUDICATION_REQUIRED');
 if(!durable.runnerSafe)blockers.push('DURABLE_RUNTIME_POWER_LOSS_PROOF_REQUIRED');
 if(durable.requests.some(r=>r.effectiveStatus==='UNKNOWN'))blockers.push('UNKNOWN_ACCOUNTING_REQUIRES_RECONCILIATION');
 return {safe:blockers.length===0,blockers:[...new Set(blockers)],requestStarts:durable.requests.length,credentialsRead:false};
}
export function reportPilot(g:Goldens,observations:CalibrationObservation[],evidence:ExternalEvidence,oracle:OracleDecision|null=null){
 const metrics=calibrationMetrics(g,observations),readiness=runReadiness(g,evidence,oracle);
 // Suggested thresholds, not approved learning thresholds. No feedback adjudication has been supplied.
 return {verdict:observations.length?metrics.pilotVerdict:'PILOT_NOT_RUN',metrics,readiness,
  proposedThresholds:{factualFalseFullAcceptance:0,scoreBoundInjectionFailures:0,completeRejectionMax:.10,anchorDimensionDriftMax:.10,unsafeFeedback:0},
  feedbackAdjudication:'NEEDS_EVIDENCE',thresholdApproval:'PENDING',readinessChanged:false};
}

/** Explicit injected mock path only. The CLI still has no live transport or credential reader. */
export async function injectedCalibrationRequest(runtime:QualificationRuntime,reservation:Reservation,init:RequestInit,body:string,transport:typeof fetch){
 invariant(runtime.scenario,'SYNTHETIC_TRANSPORT_ONLY');checkRequest(ENDPOINT,init,body);invariant(reservation.inputTokens>=Buffer.byteLength(body)+512&&reservation.outputTokens===2048,'CONSERVATIVE_PAYLOAD_RESERVATION_REQUIRED');
 return runtime.withAccountingLock(async()=>{
  runtime.reserveRequest(reservation);
  try{const result=await boundedTransport(ENDPOINT,init,body,transport);runtime.recordOutcome(reservation.id,{status:'COMPLETE',inputTokens:result.metadata.usage.inputTokens!,outputTokens:result.metadata.usage.outputTokens!,model:result.metadata.model!});return {...result,provenance:'MOCK' as const};}
  catch(error){if(!runtime.recoverLedger().requests.find(r=>r.id===reservation.id)?.outcome)runtime.recordOutcome(reservation.id,{status:'UNKNOWN'});throw error;}
 });
}
