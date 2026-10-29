import * as calibration from './provider-calibration.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGoldens, digest, reserveStart, externalBlockers, scoreObservation, MOCK_EVALUATION, offlineAdapterProbe, safeOutput, checkRequest, ENDPOINT, MODEL, type RequestReceipt } from './provider-calibration.js';
const goldens = buildGoldens();
test('128 immutable cases and32 repeated anchors preserve source lineage', () => {
  assert.equal(goldens.cases.length,128); assert.equal(goldens.schedule.length,160);
  assert.equal(new Set(goldens.cases.map(c=>c.id)).size,128);
  assert.equal(goldens.schedule.filter(s=>s.phase==='pilot').length,20);
  assert.equal(goldens.schedule.filter(s=>s.repeatOf).length,32);
  assert.equal(goldens.cases.filter(c=>c.derivedFrom).length,32);
  for(const c of goldens.cases){assert.match(c.lineageSha256,/^[a-f0-9]{64}$/);assert.match(c.reviewedBundleSha256,/^[a-f0-9]{64}$/);}
});
test('all complete candidates satisfy source-derived factual units;oracle is not provider-derived',()=>{
  for(const c of goldens.cases.filter(c=>c.kind!=='NEGATIVE')){assert.equal(c.ambiguity,null,c.id);assert.ok(c.units.every(u=>u.satisfied),c.id);assert.equal(c.oracleSource,'AUTHORED_FACTS_AND_RUBRIC_NOT_MODEL');}
});
test('all negatives have explicit missing/contradicted units and ceiling less than full credit',()=>{
  for(const c of goldens.cases.filter(c=>c.kind==='NEGATIVE')){assert.ok(c.units.some(u=>!u.satisfied),c.id);assert.ok(c.bounds.taskMax<.95);}
  assert.equal(goldens.cases.filter(c=>c.kind==='NEGATIVE').length,64);
});
test('oracle is reproducible and owner adjudication is never invented',()=>{assert.equal(digest(buildGoldens()),digest(goldens));assert.equal(goldens.ownerCaseAdjudication,null);});
test('no external evidence means network gate remains closed',()=>{assert.equal(externalBlockers({},goldens).length,4);});
for(const bad of [{quota:{reference:'x',verifiedAt:'x',grantedBalance:1,usdAdditional:0,noTopup:true}},{quota:{reference:'x',verifiedAt:'x',grantedBalance:2,usdAdditional:1,noTopup:true}},{quota:{reference:'x',verifiedAt:'x',grantedBalance:2,usdAdditional:0,noTopup:false}}])test('rejects inadequate or paid credit proof '+JSON.stringify(bad),()=>{assert.ok(externalBlockers(bad,goldens).includes('ACTUAL_GRANTED_BALANCE_AND_ZERO_SPEND_EVIDENCE_REQUIRED'));});
function closed(r:RequestReceipt):RequestReceipt{const {receiptSha256:_,...data}=r;const next={...data,status:'ERROR' as const};return {...next,receiptSha256:digest(next)};}
test('counts failures,keeps cap across resume and rejects receipt replay',()=>{const receipts:RequestReceipt[]=[];for(let i=0;i<160;i++)receipts.push(closed(reserveStart(receipts,String(i),'case',i*10000,100)));assert.throws(()=>reserveStart(receipts,'new','case',1600000,100),/CAP/);assert.throws(()=>reserveStart(receipts.slice(0,1),'0','case',20000,100),/REPLAY/);});
test('concurrent pending request and time rollback fail closed',()=>{const r=reserveStart([],'a','c',10000,20);assert.throws(()=>reserveStart([r],'b','c',20000,20),/ONE_REQUEST/);assert.throws(()=>reserveStart([closed(r)],'b','c',5000,20),/INTERVAL/);});
test('minimum start interval and rolling window include error receipts',()=>{const r=closed(reserveStart([],'a','c',0,20));assert.throws(()=>reserveStart([r],'b','c',9999,20),/INTERVAL/);assert.equal(reserveStart([r],'b','c',10000,20).id,'b');});
test('tampered persisted accounting and token exhaustion are rejected',()=>{const r=closed(reserveStart([],'a','c',0,20));assert.throws(()=>reserveStart([{...r,inputReservation:0}],'b','c',20000,20),/TAMPERING/);assert.throws(()=>reserveStart([],'a','c',0,650000),/TOKEN_OR_CREDIT/);});
for(const n of [NaN,-1,Infinity,1.5])test('invalid accounting inputs '+n,()=>{assert.throws(()=>reserveStart([],'a','c',0,n),/INVALID_ACCOUNTING/);});
test('false acceptance and high aggregate diagnostic do not assert runtime mastery',()=>{const c=goldens.cases.find(c=>c.kind==='NEGATIVE')!;const m=scoreObservation(c,{...MOCK_EVALUATION,scores:{taskCompletion:1,meaningAndLogic:1,targetLanguage:1,clarity:1}});assert.equal(m.falseAcceptance,true);assert.equal(m.ceilingViolation,true);assert.equal(m.brokenFactAggregateDiagnostic,true);assert.equal(m.phoneticEvidence,false);});
test('false rejection tracks complete answers separately from language errors',()=>{const c=goldens.cases.find(c=>c.kind==='COMPLETE')!;assert.equal(scoreObservation(c,{...MOCK_EVALUATION,scores:{...MOCK_EVALUATION.scores,taskCompletion:.7}}).falseRejection,true);assert.equal(scoreObservation(c,{...MOCK_EVALUATION,scores:{...MOCK_EVALUATION.scores,targetLanguage:.3}}).falseRejection,false);});
test('malformed or out-of-range evaluation is not a scored observation',()=>{assert.throws(()=>scoreObservation(goldens.cases[0]!,{scores:{taskCompletion:2}}));});
for(const path of ['.env','../escape.json','C:/elsewhere/results.json','docs/qualification/unapproved.json'])test('denies output outside exact five files '+path,()=>{assert.throws(()=>safeOutput(path),/OUTPUT/);});
const body=JSON.stringify({model:MODEL,max_tokens:2048,stream:false,messages:[{role:'system',content:'s'},{role:'user',content:'fictional'}]});
test('allows exact transport body and redirect denial',()=>{assert.doesNotThrow(()=>checkRequest(ENDPOINT,{method:'POST',body,redirect:'error'},body));});
for(const [url,init] of [['https://fallback.invalid',{method:'POST',body,redirect:'error'}],[ENDPOINT,{method:'GET',body,redirect:'error'}],[ENDPOINT,{method:'POST',body,redirect:'follow'}]] as const)test('denies fallback/redirect/method '+JSON.stringify([url,init]),()=>{assert.throws(()=>checkRequest(url,init,body),/UNAPPROVED_TRANSPORT/);});
test('real EvaluationService and Discovery adapter preserve exact context using mock HTTP only',async()=>{const p=await offlineAdapterProbe(goldens.cases[0]!);assert.equal(p.bodies.length,1);assert.ok(p.bodies[0]!.includes('Lucy'));assert.ok(p.bodies[0]!.includes('Los Angeles'));assert.equal(p.input.referenceText,'');assert.equal(p.input.beginnerContext?.lessonVersionId.length,36);assert.equal(p.evaluation.feedback.summary,MOCK_EVALUATION.feedback.summary);});

test('bounded metadata keeps actual observed model separate and strips arbitrary provider data',()=>{const observe=(calibration as unknown as {observeMetadata:(raw:unknown,requestId:string|null)=>unknown}).observeMetadata;assert.equal(typeof observe,'function');assert.deepEqual(observe({model:'observed-model',system_fingerprint:'fp',usage:{prompt_tokens:10,completion_tokens:2},secret:'must-not-persist'},'request-1'),{model:'observed-model',version:null,fingerprint:'fp',requestId:'request-1',usage:{inputTokens:10,outputTokens:2}});assert.equal(JSON.stringify(observe({},null)).includes(MODEL),false);});

test('all128cases traverse exact pinned snapshots and real adapter using only mock HTTP',async()=>{for(const c of goldens.cases){const r=await offlineAdapterProbe(c);assert.equal(r.bodies.length,1,c.id);assert.equal(r.input.beginnerContext?.activitySlug,c.activitySlug);assert.ok(!r.bodies[0]!.includes('caseSha256'));}});

test('160 schedule observations map to80negative,64complete,16positive-injection',()=>{const count={NEGATIVE:0,COMPLETE:0,POSITIVE_INJECTION:0};for(const o of goldens.schedule)count[goldens.cases.find(c=>c.id===o.caseId)!.kind]++;assert.deepEqual(count,{NEGATIVE:80,COMPLETE:64,POSITIVE_INJECTION:16});});
test('32anchors use identical serialized input and fresh uncached service invocations',async()=>{for(const o of goldens.schedule.filter(o=>o.repeatOf)){const c=goldens.cases.find(c=>c.id===o.caseId)!;const a=await offlineAdapterProbe(c),b=await offlineAdapterProbe(c);assert.equal(a.bodies[0],b.bodies[0]);}});

for(const status of [401,403,429,500])test('actual adapter stops on mockedHTTP '+status+' without retry or error-body leakage',async()=>{let starts=0;await assert.rejects(()=>offlineAdapterProbe(goldens.cases[0]!,{status,raw:{sensitive:'MUST_NOT_LOG'},onStart:()=>starts++}),e=>!String(e).includes('MUST_NOT_LOG'));assert.equal(starts,1);});
for(const raw of [{choices:[]},{choices:[{finish_reason:'length',message:{content:'{}'}}]},{choices:[{finish_reason:'stop',message:{content:'not JSON'}}]}])test('actual adapter denies malformed/truncated mock response '+JSON.stringify(raw),async()=>{await assert.rejects(()=>offlineAdapterProbe(goldens.cases[0]!,{raw}));});
test('mock network failure is never retried',async()=>{let starts=0;await assert.rejects(()=>offlineAdapterProbe(goldens.cases[0]!,{networkError:true,onStart:()=>starts++}));assert.equal(starts,1);});
test('payload-byte estimate records complete160schedule without using provider token counts',async t=>{let bytes=0;for(const o of goldens.schedule){const p=await offlineAdapterProbe(goldens.cases.find(c=>c.id===o.caseId)!);bytes+=Buffer.byteLength(p.bodies[0]!) +512;}t.diagnostic('OFFLINE_INPUT_RESERVATION='+bytes+';APPROVED_CAP=650000');assert.ok(bytes>0);});

// Mega-task TDD: oracle evidence must be independent of model output.
test('oracle validator rejects recomputed-digest tampering against frozen authored facts',()=>{
  const validate=calibration.validateOracle;const bad=structuredClone(goldens);bad.cases[0]!.units[0]!.label='invented';
  const {oracleSha256:_old,...rest}=bad;bad.oracleSha256=calibration.digest(rest);
  assert.equal(validate(goldens).state,'VALIDATED');assert.equal(validate(bad).state,'BLOCKED');
});
test('oracle adjudication requires all128 bound decisions and never infers human signature',()=>{
  assert.equal(calibration.adjudicateOracle(goldens,null).state,'VALIDATED');
  const review={oracleSha256:goldens.oracleSha256,reviewerId:'SYNTHETIC_REVIEWER',reviewedAt:'2026-10-29',evidenceReference:'SYNTHETIC_TEST_ONLY',decisions:goldens.cases.map(c=>({caseId:c.id,decision:'APPROVE' as const,rationale:'Synthetic test only',evidenceReference:'SYNTHETIC_TEST_ONLY'}))};
  const result=calibration.adjudicateOracle(goldens,review);assert.equal(result.state,'ADJUDICATED');assert.equal(result.humanSigned,false);
  review.decisions.pop();assert.equal(calibration.adjudicateOracle(goldens,review).state,'BLOCKED');
});
test('empty and mocked result sets cannot produce real calibration metrics or pilot pass',()=>{
  const empty=calibration.calibrationMetrics(goldens,[]);assert.equal(empty.status,'NOT_MEASURED');assert.equal(empty.pilotVerdict,'PILOT_NOT_RUN');
  const mocked={observationId:goldens.schedule[0]!.observationId,oracleSha256:goldens.oracleSha256,provenance:'MOCK' as const,evaluation:MOCK_EVALUATION};
  assert.throws(()=>calibration.calibrationMetrics(goldens,[mocked]),/REAL_EVIDENCE_REQUIRED/);
});
test('metrics retain80negative64complete16injection denominators without counting unique cases as160',()=>{
  const v=calibration.validateOracle(goldens);assert.equal(v.uniqueCases,128);assert.equal(v.evaluations,160);assert.equal(v.repeatPairs,32);assert.deepEqual(v.scheduleGroups,{NEGATIVE:80,COMPLETE:64,POSITIVE_INJECTION:16});
});
test('metrics reject unreceipted,duplicate and wrong-oracle observations',()=>{
  const o={observationId:goldens.schedule[0]!.observationId,oracleSha256:goldens.oracleSha256,provenance:'PROVIDER_REPORTED' as const,evaluation:MOCK_EVALUATION};
  assert.throws(()=>calibration.calibrationMetrics(goldens,[o]),/RECEIPT/);
  assert.throws(()=>calibration.calibrationMetrics(goldens,[{...o,oracleSha256:'0'.repeat(64)}]),/ORACLE/);
});
test('bounded transport stops malformed and oversized replies without disclosing response body',async()=>{
  const init={method:'POST',body,redirect:'error' as const};
  await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,init,body,async()=>new Response('SECRET_NOT_JSON')),e=>!String(e).includes('SECRET_NOT_JSON'));
  await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,init,body,async()=>new Response('x'.repeat(1024*1024+1))),/RESPONSE_LIMIT/);
});
test('bounded transport aborts a hung transport and never retries',async()=>{
  let starts=0;await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,{method:'POST',body,redirect:'error'},body,async()=>{starts++;return new Promise<Response>(()=>{});},10),/TIMEOUT/);assert.equal(starts,1);
});
test('bounded transport rejects redirects,unknown usage and unapproved observed model',async()=>{
  const init={method:'POST',body,redirect:'error' as const};
  await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,init,body,async()=>new Response('',{status:302})),/HTTP_STOP/);
  await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,init,body,async()=>Response.json({model:MODEL})),/USAGE_UNKNOWN/);
  await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,init,body,async()=>Response.json({model:'unapproved',usage:{prompt_tokens:1,completion_tokens:1}})),/MODEL_CHANGED/);
});

function syntheticObservation(index:number,evaluation:unknown=MOCK_EVALUATION,previous:RequestReceipt|null=null):calibration.CalibrationObservation{
  const scheduled=goldens.schedule[index]!;
  const data={id:scheduled.observationId,caseId:scheduled.caseId,startedAt:index*10000,inputReservation:100,outputReservation:2048,previousSha256:previous?.receiptSha256??null,status:'COMPLETE' as const};
  return {observationId:scheduled.observationId,oracleSha256:goldens.oracleSha256,provenance:'PROVIDER_REPORTED',evaluation,receipt:{...data,receiptSha256:digest(data)},requestSha256:'1'.repeat(64),responseSha256:'2'.repeat(64),metadata:{model:MODEL,version:null,fingerprint:null,requestId:'synthetic-request-'+index,usage:{inputTokens:10,outputTokens:10}}};
}
test('metrics compute literal error denominators from receipts and do not authenticate synthetic fixtures',()=>{
  let previous:RequestReceipt|null=null;const observations=goldens.schedule.map((_,i)=>{const o=syntheticObservation(i,{...MOCK_EVALUATION,scores:{taskCompletion:1,meaningAndLogic:1,targetLanguage:1,clarity:1}},previous);previous=o.receipt!;return o;});
  const metrics=calibration.calibrationMetrics(goldens,observations);
  assert.equal(metrics.falseAcceptance.denominator,80);assert.equal(metrics.falseAcceptance.numerator,80);assert.equal(metrics.falseRejection.denominator,64);assert.equal(metrics.falseRejection.numerator,0);assert.equal(metrics.anchorConsistency.observedPairs,32);assert.equal(metrics.pilotVerdict,'PILOT_REVISE');assert.equal(metrics.perLesson.length,8);
  assert.equal(metrics.anchorConsistency.pairs.every(p=>p.sameObservedIdentity),true);
});
test('metrics reject a broken receipt chain and preserve unknown or failed attempts as inconclusive',()=>{
  const a=syntheticObservation(0),b=syntheticObservation(1);assert.throws(()=>calibration.calibrationMetrics(goldens,[a,b]),/CHAIN/);
  const failed=syntheticObservation(0,null);const {receiptSha256:_,...data}=failed.receipt!;const error={...data,status:'ERROR' as const};failed.receipt={...error,receiptSha256:digest(error)};delete failed.metadata;delete failed.responseSha256;
  const result=calibration.calibrationMetrics(goldens,[failed]);assert.equal(result.failedAttempts,1);assert.equal(result.observations,0);assert.equal(result.pilotVerdict,'PILOT_INCONCLUSIVE');
});
test('truncated response and abort during body read stop offline transport without retry',async()=>{
  const init={method:'POST',body,redirect:'error' as const};let calls=0;
  const transport=async()=>{calls++;return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));c.close();}}));};
  await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,init,body,transport),/MALFORMED/);assert.equal(calls,1);
  await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,init,body,async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}})),10),/TIMEOUT/);
});

test('transport timeout cancels a stalled response stream and external abort returns immediately',async()=>{
  const init={method:'POST',body,redirect:'error' as const};let cancelled=false;
  await assert.rejects(()=>calibration.boundedTransport(ENDPOINT,init,body,async()=>new Response(new ReadableStream({cancel(){cancelled=true;}})),10),/TIMEOUT/);assert.equal(cancelled,true);
  const controller=new AbortController();const pending=calibration.boundedTransport(ENDPOINT,{...init,signal:controller.signal},body,async()=>new Promise<Response>(()=>{}),100);controller.abort();await assert.rejects(()=>pending,/ABORTED/);
});

test('oracle adjudication refuses invented signature or unknown authority fields',()=>{
  const review={oracleSha256:goldens.oracleSha256,reviewerId:'SYNTHETIC_REVIEWER',reviewedAt:'2026-10-29',evidenceReference:'SYNTHETIC_ONLY',decisions:goldens.cases.map(c=>({caseId:c.id,decision:'APPROVE' as const,rationale:'Synthetic only',evidenceReference:'SYNTHETIC_ONLY'})),humanSigned:true};
  assert.equal(calibration.adjudicateOracle(goldens,review).state,'BLOCKED');
});

test('durable oracle intake refuses missing adjudication and runner readiness is not a caller boolean',async()=>{
 assert.equal(typeof calibration.importOracleReview,'function','MISSING_DURABLE_ORACLE_INTAKE');
 assert.throws(()=>calibration.importOracleReview(goldens,'{}'),/ADJUDICATION/);
 assert.equal(calibration.reportPilot(goldens,[],{}).verdict,'PILOT_NOT_RUN');
 assert.ok(calibration.runReadiness(goldens,{},null).blockers.includes('DURABLE_RUNTIME_POWER_LOSS_PROOF_REQUIRED'));
});

test('oracle journal persists exact reported decisions; replay cannot append duplicate or overwrite goldens',async()=>{
 const {QualificationRuntime,runtimePath}=await import('./qualification-runtime.js');const fs=await import('node:fs');const {resolve}=await import('node:path');
 const root=runtimePath('before-reservation');fs.mkdirSync(root,{recursive:true});assert.ok(!fs.existsSync(resolve(root,'writer.lock')));if(fs.existsSync(resolve(root,'anchor.json')))assert.equal(JSON.parse(fs.readFileSync(resolve(root,'anchor.json'),'utf8')).synthetic,true);
 for(const name of ['journal.jsonl','state.json','state.pending','anchor.json'])if(fs.existsSync(resolve(root,name)))fs.unlinkSync(resolve(root,name));
 const review={oracleSha256:goldens.oracleSha256,reviewerId:'SYNTHETIC_REVIEWER',reviewedAt:'2026-10-29',evidenceReference:'SYNTHETIC_TEST_ONLY',decisions:goldens.cases.map(c=>({caseId:c.id,decision:'APPROVE' as const,rationale:'Synthetic test only',evidenceReference:'SYNTHETIC_TEST_ONLY'}))};
 const before=fs.readFileSync(resolve(calibration.ROOT,calibration.GOLDENS));const r=new QualificationRuntime('before-reservation');await calibration.persistOracleReview(goldens,JSON.stringify(review),r);assert.equal(new QualificationRuntime('before-reservation').recoverLedger().evidence.length,1);await assert.rejects(calibration.persistOracleReview(goldens,JSON.stringify(review),r),/DUPLICATE/);assert.deepEqual(fs.readFileSync(resolve(calibration.ROOT,calibration.GOLDENS)),before);
});

test('injected transport cannot start before durable reservation and failed request stays consumed',async()=>{
 assert.equal(typeof calibration.injectedCalibrationRequest,'function','MISSING_DURABLE_TRANSPORT_BINDING');
 const {QualificationRuntime,runtimePath}=await import('./qualification-runtime.js');const fs=await import('node:fs');const {resolve}=await import('node:path');const root=runtimePath('timeout');fs.mkdirSync(root,{recursive:true});assert.ok(!fs.existsSync(resolve(root,'writer.lock')));if(fs.existsSync(resolve(root,'anchor.json')))assert.equal(JSON.parse(fs.readFileSync(resolve(root,'anchor.json'),'utf8')).synthetic,true);for(const name of ['journal.jsonl','state.json','state.pending','anchor.json'])if(fs.existsSync(resolve(root,name)))fs.unlinkSync(resolve(root,name));
 const r=new QualificationRuntime('timeout');let calls=0;
 await assert.rejects(calibration.injectedCalibrationRequest(r,{id:'transport-test',caseId:'case',phase:'pilot',at:100000,inputTokens:1000,outputTokens:2048},{method:'POST',body,redirect:'error'},body,async()=>{calls++;assert.equal(r.recoverLedger().requests.length,1);return Response.json({model:MODEL});}),/USAGE_UNKNOWN/);
 assert.equal(calls,1);assert.equal(r.recoverLedger().requests[0]!.effectiveStatus,'UNKNOWN');assert.equal(r.recoverLedger().inputReserved,1000);
});
