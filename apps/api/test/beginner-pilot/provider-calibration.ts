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
    const response = c.response.split('</worklingo_untrusted_data>')[0]!.replace(/[’]/g, "'").toLowerCase();
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
export interface ExternalEvidence { quota?: { reference: string; verifiedAt: string; grantedBalance: number; usdAdditional: number; noTopup: boolean }; handling?: { reference: string; verifiedAt: string; retention: string; logging: string; dataHandling: string }; ownerOracleReference?: string; singletonAccountingVerified?: boolean; pilotContinuationReference?: string; }
export function externalBlockers(e: ExternalEvidence, g: Goldens): string[] {
  const result: string[] = [];
  if (!e.quota?.reference || !e.quota.verifiedAt || !(e.quota.grantedBalance >= 1.5) || e.quota.usdAdditional !== 0 || e.quota.noTopup !== true) result.push('ACTUAL_GRANTED_BALANCE_AND_ZERO_SPEND_EVIDENCE_REQUIRED');
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
  const blockers = externalBlockers({}, g);
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
