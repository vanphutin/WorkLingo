import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as qa from './independent-qa-pack.js';
import { buildPacket, pcmInfo, reviewItems, validateSubmission, appendEvidence, digest, renderHtml, outputPath, type EvidenceSubmission } from './independent-qa-pack.js';
const packet=buildPacket();
function syntheticSubmission():EvidenceSubmission{return {packetSha256:packet.packetSha256,reviewerId:'SYNTHETIC_TEST_REVIEWER',appointmentReference:'SYNTHETIC_ONLY_APPOINTMENT',consentReference:'SYNTHETIC_ONLY_CONSENT',exactPacketReceivedReference:'SYNTHETIC_ONLY_PACKET_RECEIPT',reviewedAt:'2026-10-27',authorType:'HUMAN_REPORTED',identityIndependentlyVerified:false,rows:reviewItems(packet).map(i=>({...i,verdict:'REVISE',rationale:'Synthetic test rationale,not an actual reviewer verdict',evidenceReference:'SYNTHETIC_ONLY_NOT_PERSISTED'}))};}
test('24 assets,41 contexts,11 IPA pairs and6 support groups retain evidence gaps',()=>{assert.equal(packet.audio.length,24);assert.equal(packet.lexical.length,41);assert.equal(packet.ipaPairs.length,11);assert.equal(packet.supports.length,6);assert.equal(packet.supports.flatMap(s=>s.relevantLessons).length,32);});
test('packet verification rejects immutable payload tampering',()=>{const verify=(qa as unknown as {verifyPacket:(p:typeof packet)=>void}).verifyPacket;assert.equal(typeof verify,'function');const bad=structuredClone(packet);bad.audio[0]!.script+='wrong';assert.throws(()=>verify(bad),/PACKET/);});
test('technical audio integrity is not independent phonetic evidence',()=>{for(const a of packet.audio){assert.equal(a.technicalAudioIntegrity,'PASS');assert.equal(a.independentPhoneticEvidence,'NEEDS_EVIDENCE');assert.equal(a.humanReviewerEvidence,'NEEDS_EVIDENCE');assert.equal(a.pcm.phoneticJudgment,false);assert.equal(a.verdict,null);assert.equal(a.reviewer,null);}});
test('41 contexts and11 pairs are source-bound without fabricated CEFR/master IDs',()=>{for(const l of packet.lexical){assert.equal(l.textIpaConsistency,'PASS');assert.ok(l.meaningVi);assert.equal(l.masterEntryId,null);assert.equal(l.cefr,null);assert.equal(l.preA1Suitability,'NEEDS_EVIDENCE');}for(const p of packet.ipaPairs){assert.equal(p.referenceVerdict,null);assert.equal(p.independentReference,null);}});
test('packet determinism binds all exact assets and contexts',()=>{assert.equal(buildPacket().packetSha256,packet.packetSha256);assert.equal(reviewItems(packet).length,82);assert.equal(new Set(reviewItems(packet).map(x=>x.id)).size,82);});
test('synthetic full submission validator accepts shape without persisting fake evidence',()=>{assert.doesNotThrow(()=>validateSubmission(packet,syntheticSubmission()));assert.equal(packet.evidenceEvents.length,0);});
for(const key of ['reviewerId','appointmentReference','consentReference','exactPacketReceivedReference'] as const)test('missing '+key+' is not replaced by global pass',()=>{const s=syntheticSubmission();s[key]='GLOBAL_PASS';assert.throws(()=>validateSubmission(packet,s),/REVIEWER_EVIDENCE/);});
for(const date of ['', '2026-02-30','2099-01-01','27/10/2026'])test('missing/impossible/future review date '+date,()=>{const s=syntheticSubmission();s.reviewedAt=date;assert.throws(()=>validateSubmission(packet,s),/ACTUAL_REVIEW_DATE/);});
test('stale packet prevents batch fanout',()=>{const s=syntheticSubmission();s.packetSha256='0'.repeat(64);assert.throws(()=>validateSubmission(packet,s),/STALE_PACKET/);});
test('omitted row and duplicate asset cannot count as complete',()=>{const s=syntheticSubmission();s.rows.pop();assert.throws(()=>validateSubmission(packet,s),/COVERAGE/);const t=syntheticSubmission();t.rows[1]=t.rows[0]!;assert.throws(()=>validateSubmission(packet,t),/DUPLICATE/);});
test('wrong per-item hash is rejected even with correct packet hash',()=>{const s=syntheticSubmission();s.rows[0]!.itemSha256='0'.repeat(64);assert.throws(()=>validateSubmission(packet,s),/UNBOUND/);});
test('empty rationale or evidence reference cannot become teacher sign-off',()=>{const s=syntheticSubmission();s.rows[0]!.rationale='';assert.throws(()=>validateSubmission(packet,s),/UNBOUND/);});
test('AI or independently-authenticated identity claims are not human evidence',()=>{const s=syntheticSubmission();Object.assign(s,{authorType:'AI'});assert.throws(()=>validateSubmission(packet,s),/FORGED/);const t=syntheticSubmission();Object.assign(t,{identityIndependentlyVerified:true});assert.throws(()=>validateSubmission(packet,t),/FORGED/);});
test('review submission cannot invent signature or teacher fields',()=>{const s=syntheticSubmission();Object.assign(s,{signature:'pretend'});assert.throws(()=>validateSubmission(packet,s),/UNSUPPORTED/);});
test('append-only evidence preserves original packet and rejects replay',()=>{const s=syntheticSubmission(),before=digest(packet);const next=appendEvidence(packet,s);assert.equal(digest(packet),before);assert.equal(next.evidenceEvents.length,1);assert.equal(next.readinessChanged,false);assert.throws(()=>appendEvidence(next,s),/DUPLICATE_REVIEW/);});
for(const path of ['../escape.json','.env','content/beginner/pilot/mg01-l1.lesson.txt','D:/outside/results.json'])test('output allowlist denies '+path,()=>{assert.throws(()=>outputPath(path),/OUTPUT/);});
test('HTML is reviewer-only,offline and leaves all dispositions empty',()=>{const html=renderHtml(packet);assert.equal((html.match(/<audio /g)||[]).length,24);assert.equal((html.match(/<select /g)||[]).length,82);assert.ok(html.includes("connect-src 'none'"));assert.ok(html.includes('REVIEWER ONLY'));assert.equal((html.match(/selected/g)||[]).length,0);assert.ok(!html.includes('fetch('));assert.ok(html.includes(packet.packetSha256));});
test('HTML escapes untrusted script text',()=>{const p=structuredClone(packet);p.audio[0]!.script='<img src=x onerror=alert(1)>';const html=renderHtml(p);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));});
test('malformed RIFF header and truncated chunks fail',()=>{assert.throws(()=>pcmInfo(Buffer.alloc(44)),/WAV_HEADER/);const b=Buffer.alloc(44);b.write('RIFF');b.writeUInt32LE(100,4);b.write('WAVE',8);assert.throws(()=>pcmInfo(b),/RIFF_LENGTH/);});

test('bounded review import rejects unknown fields,prototype keys and oversized content before append',()=>{
  const s=syntheticSubmission();Object.assign(s,{qualificationReference:'SYNTHETIC_QUALIFICATION'});for(const r of s.rows)Object.assign(r,{scopeOfClaim:'ITEM_ONLY_NOT_CEFR_OR_MASTERY'});
  const valid=qa.importReview(packet,JSON.stringify(s));assert.equal(valid.evidenceEvents.length,1);assert.equal(packet.evidenceEvents.length,0);
  assert.throws(()=>qa.importReview(packet,JSON.stringify({...s,learnerEmail:'REDACTED_UNKNOWN_FIELD'})),/UNKNOWN/);
  assert.throws(()=>qa.importReview(packet,'{"__proto__":{}}'),/UNSAFE|UNKNOWN/);
  assert.throws(()=>qa.importReview(packet,'x'.repeat(1048577)),/SIZE/);
});
test('review import requires qualification evidence and explicit scope on every disposition',()=>{
  const s=syntheticSubmission();assert.throws(()=>qa.importReview(packet,JSON.stringify(s)),/QUALIFICATION/);
  Object.assign(s,{qualificationReference:'SYNTHETIC_ONLY'});assert.throws(()=>qa.importReview(packet,JSON.stringify(s)),/SCOPE/);
});
test('aggregation distinguishes82 supplied dispositions from independent verification and readiness',()=>{
  const empty=qa.aggregateEvidence(packet);assert.equal(empty.dispositionsCompleted,0);assert.equal(empty.pending,82);assert.equal(empty.status,'NEEDS_EVIDENCE');
  const s=syntheticSubmission();Object.assign(s,{qualificationReference:'SYNTHETIC_ONLY'});for(const r of s.rows)Object.assign(r,{scopeOfClaim:'ITEM_ONLY_NOT_CEFR_OR_MASTERY'});
  const summary=qa.aggregateEvidence(qa.importReview(packet,JSON.stringify(s)));assert.equal(summary.dispositionsCompleted,82);assert.equal(summary.counts.REVISE,82);assert.equal(summary.independentlyAuthenticated,false);assert.equal(summary.readinessChanged,false);
});
test('conflicting review events require adjudication without silently replacing earlier decisions',()=>{
  const first=syntheticSubmission();Object.assign(first,{qualificationReference:'SYNTHETIC_ONLY'});for(const r of first.rows)Object.assign(r,{scopeOfClaim:'ITEM_ONLY_NOT_CEFR_OR_MASTERY'});
  const second=structuredClone(first);second.reviewerId='OTHER_SYNTHETIC_REVIEWER';second.rows[0]!.verdict='PASS';
  const p1=qa.importReview(packet,JSON.stringify(first)),p2=qa.importReview(p1,JSON.stringify(second));const summary=qa.aggregateEvidence(p2);
  assert.equal(p1.evidenceEvents.length,1);assert.equal(p2.evidenceEvents.length,2);assert.equal(summary.conflicts.length,1);assert.equal(summary.status,'ADJUDICATION_REQUIRED');
});
test('lexical audit reports technical consistency separately from semantic/provenance evidence',()=>{
  const audit=qa.auditVocabulary(packet);assert.equal(audit.contexts,41);assert.equal(audit.pairs,11);assert.equal(audit.technicalErrors.length,0);assert.equal(audit.provenancePending,41);assert.equal(audit.semanticStatus,'NEEDS_EVIDENCE');
});

test('reviewer page exported JSON is consumable by strict importer without inventing dispositions',async()=>{
  const {runInNewContext}=await import('node:vm');const html=renderHtml(packet),script=html.match(/<script>([\s\S]*)<\/script>/)![1]!;
  const controls=reviewItems(packet).map(i=>({dataset:{item:i.id,hash:i.itemSha256},value:'REVISE'}));
  const fields:Record<string,{value:string;onclick?:()=>void}>={prepare:{value:''},result:{value:''},reviewer:{value:'SYNTHETIC_REVIEWER'},appointment:{value:'SYNTHETIC_ONLY'},qualification:{value:'SYNTHETIC_ONLY'},consent:{value:'SYNTHETIC_ONLY'},received:{value:'SYNTHETIC_ONLY'},date:{value:'2026-10-29'}};
  const document={getElementById:(id:string)=>fields[id],querySelectorAll:(selector:string)=>selector.startsWith('select')?controls:controls.map(c=>({dataset:selector.startsWith('textarea')?{rationale:c.dataset.item}:{evidence:c.dataset.item},value:'SYNTHETIC_TEST_ONLY'}))};
  runInNewContext(script,{document});fields.prepare!.onclick!();assert.equal(qa.importReview(packet,fields.result!.value).evidenceEvents.length,1);
});

test('strict review import rejects global boilerplate verdict rationale and credential-like text',()=>{
  const s=syntheticSubmission();Object.assign(s,{qualificationReference:'SYNTHETIC_ONLY'});for(const r of s.rows)Object.assign(r,{scopeOfClaim:'ITEM_ONLY_NOT_CEFR_OR_MASTERY'});
  s.rows[0]!.rationale='GLOBAL_PASS';assert.throws(()=>qa.importReview(packet,JSON.stringify(s)),/ITEM_EVIDENCE/);
  s.rows[0]!.rationale='Bearer secret-value-must-not-be-logged';assert.throws(()=>qa.importReview(packet,JSON.stringify(s)),/SENSITIVE/);
});

test('review evidence has durable intake/recovery without inventing actual reviewer rows',()=>{
 assert.equal(typeof qa.persistReview,'function','MISSING_DURABLE_REVIEW_INTAKE');
 assert.equal(typeof qa.recoverReviews,'function');
});

test('82 strict dispositions survive interrupted derived view and recover once without public synthetic writes',async()=>{
 const {QualificationRuntime,runtimePath}=await import('./qualification-runtime.js');const fs=await import('node:fs');const {resolve}=await import('node:path');
 const root=runtimePath('rename-failure');fs.mkdirSync(root,{recursive:true});assert.ok(!fs.existsSync(resolve(root,'writer.lock')));if(fs.existsSync(resolve(root,'anchor.json')))assert.equal(JSON.parse(fs.readFileSync(resolve(root,'anchor.json'),'utf8')).synthetic,true);
 for(const name of ['journal.jsonl','state.json','state.pending','anchor.json'])if(fs.existsSync(resolve(root,name)))fs.unlinkSync(resolve(root,name));
 const s=syntheticSubmission();Object.assign(s,{qualificationReference:'SYNTHETIC_ONLY'});for(const row of s.rows)Object.assign(row,{scopeOfClaim:'ITEM_ONLY_NOT_CEFR_OR_MASTERY'});
 const r=new QualificationRuntime('rename-failure',{beforeStateRename:()=>{throw Error('SIMULATED_DERIVED_RENAME_FAILURE');}});await assert.rejects(qa.persistReview(packet,JSON.stringify(s),r),/RENAME_FAILURE/);const recovered=qa.recoverReviews(packet,new QualificationRuntime('rename-failure'));assert.equal(qa.aggregateEvidence(recovered).dispositionsCompleted,82);assert.equal(recovered.evidenceEvents.length,1);await assert.rejects(qa.persistReview(packet,JSON.stringify(s),r),/DUPLICATE/);assert.equal(packet.evidenceEvents.length,0);
});
