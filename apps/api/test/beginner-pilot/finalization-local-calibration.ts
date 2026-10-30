import { createHash } from 'node:crypto';
import { appendFileSync, createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { constrainedChatRequest, strictChatEvaluation } from '../../src/ai-gateway/infrastructure/language-evaluation-chat-contract.js';
import { localRequest, measurePilot, parseLocalResponse, sha, validateLocalOracle, validateReceiptChain } from './bcd-local-calibration.js';
import type { Receipt, Schedule } from './bcd-local-calibration.js';
const ROOT = resolve(__dirname, '../../../..');
export const FINAL_RUNTIME = 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-finalization-20261030';
const OLD_RUNTIME = 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-bcd-20261030';
const IDENTITY = 'WL-R12B-LOCAL-QWEN06-CONSTRAINED-002';
const load = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
interface Protocol { identity: string; count: number; retries: number; inflight: number; timeoutMs: number; outputCap: number; endpoint: string }
export function validateProtocol(p: Protocol): void {
  if (p.identity !== IDENTITY || p.count !== 20 || p.retries !== 0 || p.inflight !== 1 || p.timeoutMs !== 120000 || p.outputCap !== 2048 || p.endpoint !== 'http://127.0.0.1:33441/v1/chat/completions') throw new Error('PROTOCOL_DENIED');
}
export function replayHistorical() {
  const old = load('docs/qualification/beginner-r12b-local-calibration.json') as { receipts: Receipt[] };
  const rows = old.receipts.map(r => {
    let rejected = false; try { strictChatEvaluation(r.raw); } catch { rejected = true; }
    if (!rejected) throw new Error('HISTORICAL_FAILURE_UNEXPECTEDLY_ACCEPTED');
    const raw = r.raw as { choices: { finish_reason: string; message: { content: string } }[] };
    return { observationId: r.observationId, disposition: 'REJECTED_UNCHANGED_JSON_CONTRACT', rawSha256: sha(JSON.stringify(r.raw)), finishReason: raw.choices[0]!.finish_reason, markdownFenced: raw.choices[0]!.message.content.startsWith('```'), inputTokens: r.inputTokens, outputTokens: r.outputTokens };
  });
  return { schemaVersion: 'beginner-r12b-contract-replay/1', mandate: 'MND-20261030-006', rows, discoveryActualStarts: 0, originalEvidenceChanged: false,
    originalReportSha256: sha(readFileSync(resolve(ROOT, 'docs/qualification/beginner-r12b-local-calibration.json'))),
    rootCause: 'All20 local outputs fenced; stop reasons and output token counts rule out observed truncation. Request had no constrained-output contract. Strict parser correctly rejected.',
    source: 'https://github.com/ggml-org/llama.cpp/blob/b12000/tools/server/server-common.cpp', remediation: 'Separate nested response_format.json_schema.schema experiment; no old repair' };
}
function sorted(v: unknown): unknown { return Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sorted(x)])) : v; }
const digest = (v: unknown) => sha(JSON.stringify(sorted(v)));
export async function executeConstrained(schedule: Schedule[], call: (s: Schedule) => Promise<unknown>, persist: (r: Receipt) => void, expectedCounts?: Map<string, number>): Promise<Receipt[]> {
  if (schedule.length !== 20 || schedule.some(s => s.phase !== 'pilot') || new Set(schedule.map(s => s.observationId)).size !== 20) throw new Error('PILOT_SCHEDULE_DENIED');
  const results: Receipt[] = []; let previous: string | null = null;
  const record = (data: Omit<Receipt, 'receiptSha256'>) => { const r = { ...data, receiptSha256: digest(data) }; persist(r); previous = r.receiptSha256; return r; };
  for (const s of schedule) {
    const t = Date.now(), startedAt = new Date(t).toISOString();
    record({ observationId: s.observationId, caseId: s.caseId, status: 'STARTED', startedAt, endedAt: null, elapsedMs: null, inputTokens: null, outputTokens: null, evaluation: null, error: null, previousSha256: previous });
    let raw: unknown, evaluation: unknown = null, inputTokens: number | null = null, outputTokens: number | null = null, error: string | null = null;
    try {
      raw = await call(s); const metadata = parseLocalResponse(raw); inputTokens = metadata.inputTokens; outputTokens = metadata.outputTokens;
      const r = raw as { model?: string; system_fingerprint?: string };
      evaluation = strictChatEvaluation(raw);
      if (r.model !== 'worklingo-qwen3-0.6b-q8_0-23749fef' || r.system_fingerprint !== 'b12000-68d20b884' || inputTokens === null || outputTokens === null || outputTokens > 2048 || (expectedCounts && inputTokens !== expectedCounts.get(s.observationId))) throw new Error('IDENTITY_OR_USAGE_MISMATCH');
    } catch { evaluation = null; error = raw === undefined ? 'TRANSPORT_TIMEOUT_OR_FAILURE_NO_RETRY' : 'STRICT_CONTRACT_IDENTITY_OR_USAGE_FAILURE'; }
    results.push(record({ observationId: s.observationId, caseId: s.caseId, status: error ? 'ERROR' : 'COMPLETE', startedAt, endedAt: new Date().toISOString(), elapsedMs: Date.now() - t, inputTokens, outputTokens, evaluation, error, previousSha256: previous, ...(raw === undefined ? {} : { raw }) }));
  }
  return results;
}
async function hashFile(path: string) { const h = createHash('sha256'); for await (const bytes of createReadStream(path)) h.update(bytes); return h.digest('hex'); }
async function post(path: string, value: unknown) {
  if (!['/apply-template', '/tokenize', '/v1/chat/completions'].includes(path)) throw new Error('LOCAL_PATH_DENIED');
  const response = await fetch('http://127.0.0.1:33441' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value), signal: AbortSignal.timeout(120000), redirect: 'error' });
  if (!response.ok) throw new Error('LOCAL_HTTP_ERROR');
  const reader = response.body?.getReader(); if (!reader) throw new Error('MISSING_BODY');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > 1048576) { await reader.cancel(); throw new Error('LOCAL_RESPONSE_LIMIT'); } chunks.push(part.value); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function main() {
  const arg = process.argv[2]; if (process.argv.length !== 3 || !['--preflight', '--run'].includes(arg!)) throw new Error('ARGUMENT_DENIED');
  if (sha(readFileSync(resolve(ROOT, 'mandate/reports/2026-10-30-r12b-finalization-scope.json'))) !== '66838c08b5380887e5d95e2f187b1d1429f95b25def52db69694b0dc72d6940c') throw new Error('SCOPE_DRIFT');
  const goldensPath = 'docs/qualification/beginner-pilot-provider-calibration-goldens.json', oraclePath = 'docs/qualification/beginner-r12b-oracle-adjudication-final.json';
  if (sha(readFileSync(resolve(ROOT, goldensPath))) !== 'b069d60a00ecdfa02d7249ffe39414fd820b54ffee8d1ca0f2364580a1c785ff' || sha(readFileSync(resolve(ROOT, oraclePath))) !== 'bdcf1aa547088fcb44c3e0ad7b729ef425d10dc5bbdf33c053d5742e678ca2ba') throw new Error('FROZEN_ORACLE_DRIFT');
  const g = load(goldensPath), oracle = load(oraclePath), bindings = validateLocalOracle(ROOT, g, oracle);
  const protocol = { identity: IDENTITY, count: 20, retries: 0, inflight: 1, timeoutMs: 120000, outputCap: 2048, endpoint: 'http://127.0.0.1:33441/v1/chat/completions' }; validateProtocol(protocol);
  const replay = replayHistorical(), replayPath = resolve(ROOT, 'docs/qualification/beginner-r12b-finalization-contract-replay.json');
  if (!existsSync(replayPath)) {
    writeFileSync(replayPath, JSON.stringify(replay, null, 2) + '\n', { flag: 'wx' });
    writeFileSync(replayPath.replace('.json', '.md'), '# Original local contract replay\n\nAll20 retained responses remain rejected. Each stopped normally with Markdown fences; no original observation is repaired, rescored or promoted. Discovery remains never called. New constrained request is separate. See JSON for every disposition and original evidence hash.\n', { flag: 'wx' });
  }
  if (arg === '--preflight') { console.log(JSON.stringify({ bindings, protocol, replayed: replay.rows.length, newStarts: 0 })); return; }
  const ledger = FINAL_RUNTIME + '/artifacts/constrained-starts.ndjson', resultPath = resolve(ROOT, 'docs/qualification/beginner-r12b-finalization-constrained-local-calibration.json');
  if (existsSync(ledger) || existsSync(resultPath)) throw new Error('EXPERIMENT_ALREADY_STARTED_NO_REPLAY');
  const assets = [{ path: OLD_RUNTIME + '/runtime/llama-b12000-bin-win-cpu-x64.zip', sha256: '6fb512a768e6b93c9ced1d01e1f84a3a96bc16b5f0a5948e38fb320d6e067220' }, { path: OLD_RUNTIME + '/models/Qwen3-0.6B-Q8_0.gguf', sha256: '9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031' }];
  for (const asset of assets) if (await hashFile(asset.path) !== asset.sha256) throw new Error('REUSED_ASSET_HASH_DRIFT');
  const runtimeAssets = load(FINAL_RUNTIME + '/artifacts/constrained-runtime-assets.json');
  if (runtimeAssets.archiveSha256 !== assets[0]!.sha256 || runtimeAssets.modelSha256 !== assets[1]!.sha256 || runtimeAssets.safeZip !== true || !Array.isArray(runtimeAssets.extractedEntries) || runtimeAssets.extractedEntries.length !== 52) throw new Error('EXTRACTED_RUNTIME_BINDING');
  for (const entry of runtimeAssets.extractedEntries) {
    const path = resolve(entry.path), directory = resolve(FINAL_RUNTIME, 'model/bin') + '\\';
    if (!path.startsWith(directory) || await hashFile(path) !== entry.sha256) throw new Error('EXTRACTED_RUNTIME_DRIFT');
  }
  const sources = ['apps/api/test/beginner-pilot/finalization-local-calibration.ts', 'apps/api/src/ai-gateway/infrastructure/language-evaluation-chat-contract.ts', 'apps/api/test/beginner-pilot/bcd-local-calibration.ts', 'apps/api/src/ai-gateway/domain/language-evaluation.schema.ts', 'apps/api/src/ai-gateway/infrastructure/openai-language-evaluation.adapter.ts', 'apps/api/src/ai-gateway/domain/language-evaluation.port.ts', 'apps/api/src/ai-gateway/domain/provider-errors.ts', 'apps/api/src/ai-gateway/infrastructure/provider-http-client.ts', 'apps/api/test/beginner-pilot/bcd-cost-options.ts', 'pnpm-lock.yaml', goldensPath, oraclePath];
  const sourceBindings = sources.map((path, i) => { const bytes = readFileSync(resolve(ROOT, path)), snapshot = FINAL_RUNTIME + '/artifacts/constrained-source-' + i + '.snapshot'; writeFileSync(snapshot, bytes, { flag: 'wx' }); return { path, sha256: sha(bytes), snapshot }; });
  const serverPropsPath = FINAL_RUNTIME + '/artifacts/constrained-server-props.json', props = load(serverPropsPath);
  if (props.total_slots !== 1 || props.model_path !== OLD_RUNTIME + '/models/Qwen3-0.6B-Q8_0.gguf') throw new Error('SERVER_IDENTITY_DRIFT');
  const requests = new Map<string, ReturnType<typeof constrainedChatRequest<ReturnType<typeof localRequest>>>>(), counts: { observationId: string; exactChatTokens: number; requestSha256: string; promptSha256: string }[] = [];
  for (const s of g.schedule.slice(0, 20)) {
    const request = constrainedChatRequest(localRequest(oracle.decisions.find((d: { caseId: string }) => d.caseId === s.caseId)));
    const applied = await post('/apply-template', request), tokenized = await post('/tokenize', { content: applied.prompt, add_special: false, parse_special: true });
    if (typeof applied.prompt !== 'string' || !Array.isArray(tokenized.tokens) || !tokenized.tokens.length || tokenized.tokens.length + 2048 > 8192) throw new Error('EXACT_TOKEN_CONTEXT_BOUND');
    requests.set(s.observationId, request); counts.push({ observationId: s.observationId, exactChatTokens: tokenized.tokens.length, requestSha256: sha(JSON.stringify(request)), promptSha256: sha(applied.prompt) });
  }
  const preflight = { protocol, assets, runtimeAssets, sourceBindings, counts, serverPropsSha256: await hashFile(serverPropsPath), chatTemplateSha256: sha(props.chat_template), createdBeforeStarts: new Date().toISOString() };
  writeFileSync(FINAL_RUNTIME + '/artifacts/constrained-preflight.json', JSON.stringify(preflight, null, 2) + '\n', { flag: 'wx' }); writeFileSync(ledger, '', { flag: 'wx' });
  const receipts = await executeConstrained(g.schedule.slice(0, 20), s => post('/v1/chat/completions', requests.get(s.observationId)), r => appendFileSync(ledger, JSON.stringify(r) + '\n'), new Map(counts.map(c => [c.observationId, c.exactChatTokens])));
  validateReceiptChain(readFileSync(ledger, 'utf8').trim().split('\n').map(line => JSON.parse(line)), g.schedule.slice(0, 20));
  const metrics = measurePilot(g, receipts), result = { schemaVersion: 'beginner-r12b-constrained-local-calibration/1', mandate: 'MND-20261030-006', identity: IDENTITY, status: metrics.violations.length ? 'REVISE' : 'NEEDS_EVIDENCE', protocol, bindings, preflight, schedule: g.schedule, receipts, metrics,
    oldPilot: { starts: 20, unchanged: true, path: 'docs/qualification/beginner-r12b-local-calibration.json' }, newStarts: receipts.length,
    usage: { inputTokens: receipts.reduce((n, r) => n + (r.inputTokens ?? 0), 0), outputTokens: receipts.reduce((n, r) => n + (r.outputTokens ?? 0), 0), unknownUsageStarts: receipts.filter(r => r.inputTokens === null || r.outputTokens === null).length }, actualSpend: { USD: '0', inkPoints: '0', electricity: 'NOT_MEASURED' }, discovery: { starts: 0, status: 'BLOCKED', pass: false }, continuation: 'STOPPED_AFTER_PILOT_NO_REMAINDER', readinessChanged: false };
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  writeFileSync(resultPath.replace('.json', '.md'), '# Separate constrained local pilot\n\n' + JSON.stringify({ identity: IDENTITY, status: result.status, metrics, usage: result.usage }, null, 2) + '\n\nNo old response repaired; no retry, remainder or Discovery call. Strict output validity and grading quality remain separate. Exact pre-start snapshots, assets, requests, tokens and raw receipts are in JSON/runtime evidence.\n', { flag: 'wx' });
  console.log(JSON.stringify({ metrics, usage: result.usage }));
}
if (require.main === module) main().catch(e => { console.error(e instanceof Error ? e.message : 'CONSTRAINED_LOCAL_FAILED'); process.exitCode = 1; });
