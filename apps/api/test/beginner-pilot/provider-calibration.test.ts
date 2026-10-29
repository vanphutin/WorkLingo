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
