import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { parseLessonSource } from '@worklingo/content-format';
const ROOT = resolve(__dirname, '../../../..');
const PREFIX = 'docs/qualification/beginner-pilot-independent-qa';
export const hash = (x: string | Buffer) => createHash('sha256').update(x).digest('hex');
function sorted(x: unknown): unknown { return Array.isArray(x) ? x.map(sorted) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, sorted((x as Record<string, unknown>)[k])])) : x; }
export const digest = (x: unknown) => hash(JSON.stringify(sorted(x)));
const read = (p: string) => readFileSync(p.includes(':') ? p : resolve(ROOT, p));
const json = <T>(p: string) => JSON.parse(read(p).toString('utf8')) as T;
function requireValue(ok: unknown, code: string): asserts ok { if (!ok) throw new Error(code); }
interface AudioInput { slug: string; path: string; sha256: string; scriptSha256: string; reviewedBundleSha256: string }
interface LexicalInput { lessonCode: string; slug: string; expression: string; ipa: string; sourcePath: string; sourceLine: number; sourceSha256: string; reviewedBundleSha256: string; masterEntryId: null; cefr: null }
interface Intake { sourceBundles: { lesson: string; sourcePath: string; sourceSha256: string; reviewedBundleSha256: string }[]; evidenceIntake: { audio: AudioInput[]; lexicalOccurrences: LexicalInput[]; uniqueLexicalIpa: { key: string; mappings: string[] }[] }; supports: { supportId: string; group: string; relevantLessons: { lessonCode: string; reviewedBundleSha256: string }[] }[] }
interface Scope { baseline: { files: { path: string; sha256: string }[]; selectedAudio: AudioInput[] }; allowlist: { create: string[] } }
export function pcmInfo(bytes: Buffer) {
  requireValue(bytes.length >= 44 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE', 'WAV_HEADER');
  requireValue(bytes.readUInt32LE(4) + 8 === bytes.length, 'RIFF_LENGTH');
  let at = 12, fmt: { encoding: number; channels: number; sampleRate: number; bits: number; blockAlign: number; byteRate: number } | undefined, dataBytes: number | undefined;
  while (at < bytes.length) {
    requireValue(at + 8 <= bytes.length, 'CHUNK_HEADER'); const size = bytes.readUInt32LE(at + 4), end = at + 8 + size;
    requireValue(end <= bytes.length, 'CHUNK_BOUNDS'); const tag = bytes.toString('ascii', at, at + 4);
    if (tag === 'fmt ') { requireValue(size >= 16 && !fmt, 'FMT_DUPLICATE_OR_SHORT'); fmt = { encoding: bytes.readUInt16LE(at + 8), channels: bytes.readUInt16LE(at + 10), sampleRate: bytes.readUInt32LE(at + 12), byteRate: bytes.readUInt32LE(at + 16), blockAlign: bytes.readUInt16LE(at + 20), bits: bytes.readUInt16LE(at + 22) }; }
    if (tag === 'data') { requireValue(dataBytes === undefined, 'DUPLICATE_DATA'); dataBytes = size; }
    at = end + (size % 2);
  }
  requireValue(at === bytes.length && fmt && dataBytes !== undefined && dataBytes > 0, 'MISSING_FMT_OR_PCM');
  requireValue(fmt.encoding === 1 && fmt.channels === 1 && fmt.sampleRate === 24000 && fmt.bits === 16 && fmt.blockAlign === 2 && fmt.byteRate === 48000 && dataBytes % 2 === 0, 'PCM_CONTRACT');
  return { ...fmt, dataBytes, durationSeconds: dataBytes / fmt.byteRate, phoneticJudgment: false };
}
function unique(items: { id: string }[], expected: number) { requireValue(items.length === expected && new Set(items.map(x => x.id)).size === expected, 'COVERAGE_OR_DUPLICATE'); }
export function buildPacket() {
  const scope = json<Scope>('mandate/reports/2026-10-29-beginner-real-qualification-b-scope.json');
  for (const f of [...scope.baseline.files, ...scope.baseline.selectedAudio]) requireValue(hash(read(f.path)) === f.sha256, 'FROZEN_DRIFT:' + f.path);
  const ledger = json<Intake>('docs/qualification/beginner-pilot-post-context-requalification.json');
  const docs = ledger.sourceBundles.map(b => ({ ...b, source: read(b.sourcePath).toString('utf8'), doc: parseLessonSource(read(b.sourcePath).toString('utf8')).document }));
  const audio = ledger.evidenceIntake.audio.map(a => {
    const lesson = docs.find(d => d.reviewedBundleSha256 === a.reviewedBundleSha256); requireValue(lesson, 'AUDIO_BUNDLE');
    const content = lesson.doc.audioScripts.find(c => c.slug === a.slug); requireValue(content && hash(content.script) === a.scriptSha256, 'SCRIPT_BINDING');
    requireValue(hash(read(a.path)) === a.sha256, 'AUDIO_HASH');
    return { id: a.slug, ...a, script: content.script, sourcePath: lesson.sourcePath, sourceSha256: lesson.sourceSha256, pcm: pcmInfo(read(a.path)),
      technicalAudioIntegrity: 'PASS' as const, independentPhoneticEvidence: 'NEEDS_EVIDENCE' as const, humanReviewerEvidence: 'NEEDS_EVIDENCE' as const,
      pronunciationTargets: ['AmE intelligibility and stress', 'Names,places and letter names where in script', 'Final consonants/plurals where present', 'Weak/strong forms in context', 'No omitted/substituted script words'],
      priorGateASoundQA: 'PRESERVED_NOT_TRANSFERRED_TO_INDEPENDENT_QA', reviewer: null, verdict: null };
  });
  const lexical = ledger.evidenceIntake.lexicalOccurrences.map(l => {
    const lesson = docs.find(d => d.lesson === l.lessonCode); requireValue(lesson && hash(lesson.source) === l.sourceSha256 && lesson.reviewedBundleSha256 === l.reviewedBundleSha256, 'LEXICAL_BUNDLE');
    const at = lesson.source.indexOf('[[LANGUAGE_BLOCK ' + l.slug + ']]'), end = lesson.source.indexOf('[[/LANGUAGE_BLOCK]]', at);
    requireValue(at >= 0 && end > at && lesson.source.indexOf('[[LANGUAGE_BLOCK ' + l.slug + ']]', at + 1) === -1, 'LEXICAL_SOURCE');
    const block = lesson.source.slice(at, end); const field = (key: string) => block.match(new RegExp('^' + key + ': (.+)$', 'm'))?.[1]?.trim() ?? '';
    requireValue(field('expression') === l.expression && field('pronunciation') === l.ipa && field('meaning_vi'), 'TEXT_IPA_MISMATCH');
    return { id: l.slug, ...l, meaningVi: field('meaning_vi'), grammarPattern: field('grammar_pattern'), example: field('example'), commonError: field('common_error'),
      sourceBlockSha256: hash(block), textIpaConsistency: 'PASS' as const, phoneticEvidence: 'NEEDS_EVIDENCE' as const,
      authoredInlineProvenance: 'SOURCE_BOUND_AWAITING_ADJUDICATION', preA1Suitability: 'NEEDS_EVIDENCE', reviewer: null, verdict: null };
  });
  const ipaPairs = ledger.evidenceIntake.uniqueLexicalIpa.map(p => {
    const mappings = lexical.filter(l => p.mappings.includes(l.id)); requireValue(mappings.length === p.mappings.length && mappings.every(l => l.expression + '|' + l.ipa === p.key), 'IPA_PAIR_BINDING');
    return { id: p.key, mappings: p.mappings, textIpaConsistency: 'PASS', independentReference: null, referenceVerdict: null, reviewerEvidence: 'NEEDS_EVIDENCE' };
  });
  const supports = ledger.supports.map(s => ({ id: s.supportId, group: s.group, relevantLessons: s.relevantLessons, disposition: null, reviewerEvidence: 'NEEDS_EVIDENCE' }));
  unique(audio, 24); unique(lexical, 41); unique(ipaPairs, 11); unique(supports, 6);
  requireValue(supports.reduce((n, s) => n + s.relevantLessons.length, 0) === 32, 'SUPPORT_LINK_COUNT');
  const immutable = { schemaVersion: 'beginner-independent-qa/1', sourceBundles: ledger.sourceBundles, audio, lexical, ipaPairs, supports };
  return { ...immutable, packetSha256: digest(immutable), evidenceEvents: [] as EvidenceSubmission[], status: 'OFFLINE_PACKET_READY_INDEPENDENT_EVIDENCE_REQUIRED', readinessChanged: false };
}
export type Packet = ReturnType<typeof buildPacket>;
export interface EvidenceRow { id: string; itemSha256: string; verdict: 'PASS' | 'REVISE' | 'REJECT'; rationale: string; evidenceReference: string }
export interface EvidenceSubmission { packetSha256: string; reviewerId: string; appointmentReference: string; consentReference: string; exactPacketReceivedReference: string; reviewedAt: string; authorType: 'HUMAN_REPORTED'; identityIndependentlyVerified: false; rows: EvidenceRow[]; }
export function reviewItems(p: Packet) { return [...p.audio, ...p.lexical, ...p.ipaPairs, ...p.supports].map(row => ({ id: row.id, itemSha256: digest(row) })); }
function verifyImmutablePacket(p: Packet): void {
  const { packetSha256, evidenceEvents: _events, status: _status, readinessChanged: _ready, ...immutable } = p;
  requireValue(digest(immutable) === packetSha256 && packetSha256 === buildPacket().packetSha256 && p.readinessChanged === false, 'PACKET_PAYLOAD_DRIFT');
}
export function verifyPacket(p: Packet): void {
  verifyImmutablePacket(p);
  requireValue(Array.isArray(p.evidenceEvents) && new Set(p.evidenceEvents.map(digest)).size === p.evidenceEvents.length, 'PACKET_HISTORY_DUPLICATE');
  for (const event of p.evidenceEvents) validateSubmission(p, event);
}
export function validateSubmission(p: Packet, s: EvidenceSubmission): void {
  verifyImmutablePacket(p);
  requireValue(s.packetSha256 === p.packetSha256, 'STALE_PACKET');
  requireValue(s.authorType === 'HUMAN_REPORTED' && s.identityIndependentlyVerified === false, 'NO_FORGED_VERIFICATION');
  for (const v of [s.reviewerId, s.appointmentReference, s.consentReference, s.exactPacketReceivedReference]) requireValue(typeof v === 'string' && v.trim() && !/GLOBAL_PASS|\[|TODO|placeholder/iu.test(v), 'REVIEWER_EVIDENCE_REQUIRED');
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(s.reviewedAt) && Number.isFinite(Date.parse(s.reviewedAt)) && new Date(s.reviewedAt).toISOString().slice(0, 10) === s.reviewedAt && s.reviewedAt <= new Date().toISOString().slice(0, 10), 'ACTUAL_REVIEW_DATE_REQUIRED');
  const items = reviewItems(p); unique(s.rows, items.length);
  for (const i of items) { const row = s.rows.find(r => r.id === i.id); requireValue(row && row.itemSha256 === i.itemSha256 && ['PASS', 'REVISE', 'REJECT'].includes(row.verdict) && typeof row.rationale === 'string' && row.rationale.trim() && typeof row.evidenceReference === 'string' && row.evidenceReference.trim(), 'UNBOUND_REVIEW_ROW'); }
  requireValue(!/"(?:masterEntryId|cefr|teacherReviewedAt|teacherApproval|signature)"/u.test(JSON.stringify(s)), 'UNSUPPORTED_REVIEW_CLAIM');
}
export function appendEvidence(p: Packet, s: EvidenceSubmission): Packet {
  validateSubmission(p, s); requireValue(!p.evidenceEvents.some(e => digest(e) === digest(s)), 'DUPLICATE_REVIEW_EVENT');
  return { ...p, evidenceEvents: [...p.evidenceEvents, structuredClone(s)] };
}
function htmlEscape(s: string) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
export function renderHtml(p: Packet): string {
  const esc = htmlEscape;
  const controls = (id: string, item: unknown) => `<label>Disposition <select data-item="${esc(id)}" data-hash="${digest(item)}"><option value="">NEEDS_EVIDENCE</option><option>PASS</option><option>REVISE</option><option>REJECT</option></select></label><label>Rationale <textarea data-rationale="${esc(id)}"></textarea></label><label>Evidence reference <input data-evidence="${esc(id)}"></label>`;
  const cards = p.audio.map(a => `<article><h3>${esc(a.id)}</h3><audio controls preload="none" src="file:///${esc(a.path)}"></audio><pre>${esc(a.script)}</pre><p>WAV SHA256 ${a.sha256}<br>Script ${a.scriptSha256}<br>Bundle ${a.reviewedBundleSha256}</p><p>${esc(a.pronunciationTargets.join('; '))}</p>${controls(a.id, a)}</article>`).join('');
  const lex = p.lexical.map(l => `<article><h3>${esc(l.id)}: ${esc(l.expression)} ${esc(l.ipa)}</h3><p>${esc(l.meaningVi)}</p><p>${esc(l.grammarPattern)}<br>${esc(l.example)}<br>${esc(l.commonError)}</p><p>${esc(l.sourcePath)}:${l.sourceLine}<br>Source ${l.sourceSha256}<br>Bundle ${l.reviewedBundleSha256}</p>${controls(l.id, l)}</article>`).join('');
  const pairs = p.ipaPairs.map(i => `<article><h3>${esc(i.id)}</h3><p>${esc(i.mappings.join(', '))}</p>${controls(i.id, i)}</article>`).join('');
  const supports = p.supports.map(s => `<article><h3>${esc(s.group)}</h3><p>${esc(s.relevantLessons.map(l => l.lessonCode).join(', '))}</p>${controls(s.id, s)}</article>`).join('');
  return `<!doctype html><html lang="vi"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';media-src file:;style-src 'unsafe-inline';script-src 'unsafe-inline';form-action 'none';connect-src 'none'"><title>WorkLingo independent QA</title><style>body{font:16px system-ui;max-width:960px;margin:2rem auto;padding:1rem}article{border:1px solid #aaa;padding:1rem;margin:1rem 0}pre,p{white-space:pre-wrap;overflow-wrap:anywhere}label{display:block;margin:.5rem 0}textarea{width:95%;min-height:4rem}input{width:90%}audio{width:100%}</style><h1>Independent reviewer packet</h1><p>REVIEWER ONLY — contains private scripts/criteria. Offline;no telemetry/upload. Packet ${p.packetSha256}</p><p>Technical PASS does not prove phonetic accuracy. Actual listening and expertise required. Old global PASS is not transferred. Report meaning/function and Pre-A1 suitability as expert opinion,not official CEFR/master vocabulary IDs.</p><label>Reviewer ID<input id="reviewer"></label><label>Appointment ref<input id="appointment"></label><label>Consent ref<input id="consent"></label><label>Exact packet received ref<input id="received"></label><label>Actual review date<input id="date" type="date"></label><h2>24 WAV</h2>${cards}<h2>41 lexical contexts</h2>${lex}<h2>11 expression/IPA pairs</h2>${pairs}<h2>6 support groups</h2>${supports}<button type="button" id="prepare">Prepare evidence JSON for owner review</button><textarea id="result" aria-label="Evidence JSON"></textarea><script>document.getElementById('prepare').onclick=()=>{const value=id=>document.getElementById(id).value;const rows=[...document.querySelectorAll('select[data-item]')].map(s=>({id:s.dataset.item,itemSha256:s.dataset.hash,verdict:s.value||null,rationale:[...document.querySelectorAll('textarea[data-rationale]')].find(t=>t.dataset.rationale===s.dataset.item).value,evidenceReference:[...document.querySelectorAll('input[data-evidence]')].find(t=>t.dataset.evidence===s.dataset.item).value}));document.getElementById('result').value=JSON.stringify({packetSha256:'${p.packetSha256}',reviewerId:value('reviewer'),appointmentReference:value('appointment'),consentReference:value('consent'),exactPacketReceivedReference:value('received'),reviewedAt:value('date'),authorType:'HUMAN_REPORTED',identityIndependentlyVerified:false,rows},null,2);};</script></html>`;
}
export function outputPath(p: string): string {
  const scope = json<Scope>('mandate/reports/2026-10-29-beginner-real-qualification-b-scope.json'); requireValue(scope.allowlist.create.includes(p), 'OUTPUT_NOT_ALLOWLISTED');
  const target = resolve(ROOT, p); requireValue(!relative(ROOT, target).startsWith('..'), 'OUTPUT_ESCAPE');
  for (let part = target; part !== ROOT; part = dirname(part)) if (existsSync(part)) requireValue(!lstatSync(part).isSymbolicLink() && realpathSync(part) === part, 'OUTPUT_LINK'); return target;
}
export function writePacket() {
  const p = buildPacket(), target = outputPath(PREFIX + '.json');
  if (existsSync(target)) { const existing = json<Packet>(PREFIX + '.json'); verifyPacket(existing); requireValue(existing.packetSha256 === p.packetSha256, 'EXISTING_PACKET_DRIFT'); for (const event of existing.evidenceEvents) validateSubmission(p, event); return existing; }
  writeFileSync(target, JSON.stringify(p, null, 2) + '\n', { flag: 'wx' });
  writeFileSync(outputPath(PREFIX + '.html'), renderHtml(p), { flag: 'wx' }); return p;
}
if (require.main === module) {
  try { requireValue(process.argv.length === 3 && process.argv[2] === '--build', 'BUILD_ONLY'); const p = writePacket(); console.log(JSON.stringify({ packetSha256: p.packetSha256, audio: p.audio.length, lexical: p.lexical.length, pairs: p.ipaPairs.length, technical: 'PASS', independent: 'NEEDS_EVIDENCE' })); }
  catch { console.error('INDEPENDENT_QA_BUILD_FAILED;inspect offline bindings;no personal data output'); process.exitCode = 1; }
}
