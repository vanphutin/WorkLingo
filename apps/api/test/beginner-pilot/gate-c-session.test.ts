import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSession,transition,finalize,aggregate,assertPrivatePath,type Authority} from './gate-c-session.js';
const authority:Authority={provenance:'SYNTHETIC',studyApproved:false,storageApproved:false,privateRoot:null,versions:[{lesson:'MG01-L1',bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)]}]};
const gate={adult:true,vietnamese:true,absoluteBeginner:true,consent:true,firstExposure:true};
const make=()=>createSession(authority,{slot:'P01',lesson:'MG01-L1',...gate,bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)]},[],1000,0);
test('requires actual study authority for human provenance and every eligibility attestation',()=>{
 assert.throws(()=>createSession({...authority,provenance:'REAL_FACILITATOR_REPORTED'}, {slot:'P01',lesson:'MG01-L1',...gate},[],1000,0),/AUTHORITY/);
 for(const k of Object.keys(gate)){assert.throws(()=>createSession(authority,{slot:'P01',lesson:'MG01-L1',...gate,[k]:false},[],1000,0),/CONSENT/);}
});
test('rejects stale versions, PII slots, repeats, order and spacing',()=>{
 for(const x of [{slot:'email@example.test'},{bundleSha256:'stale'},{audioSha256:[]}])assert.throws(()=>createSession(authority,{slot:'P01',lesson:'MG01-L1',...gate,bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)],...x},[],1000,0));
 assert.throws(()=>createSession(authority,{slot:'P01',lesson:'MG01-L1',...gate},[{slot:'P01',lesson:'MG01-L1',startedAt:0}],1000,0));
});
test('timer excludes support and wait, stops at cap and rejects backwards or crashed clocks',()=>{
 const s=make();transition(s,'pause',60000,'support');transition(s,'resume',120000);transition(s,'stop',180000);assert.equal(s.totals.active,120000);assert.equal(s.totals.support,60000);
 assert.throws(()=>transition(s,'resume',190000),/STATE/);const cap=make();transition(cap,'tick',3601000);assert.equal(cap.totals.active,3600000);assert.equal(cap.stopReason,'ACTIVE_LIMIT');
 assert.throws(()=>transition(make(),'tick',-1),/CLOCK/);const crash=make();crash.reconciliationRequired=true;assert.throws(()=>transition(crash,'resume',300),/RECONCILIATION/);
});
test('coded events only, withdrawal stops; incomplete outcomes never qualify',()=>{
 const s=make();assert.throws(()=>transition(s,'event',1,'private free text'),/EVENT/);transition(s,'event',100,'HINT');transition(s,'event',200,'WITHDRAWAL');assert.equal(s.status,'STOPPED');assert.equal(s.events.length,2);assert.throws(()=>finalize(s,{}),/OUTCOME/);
});
test('eight aggregate rows never expose slot records or promote synthetic into human evidence',()=>{
 const a=aggregate([]);assert.equal(a.lessons.length,8);assert.equal(a.realObservations,0);assert.equal(a.status,'NEEDS_HUMAN_EVIDENCE');assert.equal(JSON.stringify(a).includes('P01'),false);
 const s=make();transition(s,'stop',100);finalize(s,{reading:true,listening:true,speaking:true,writing:true,independentSuccess:true,cognitiveLoad:2});const b=aggregate([s]);assert.equal(b.realObservations,0);assert.equal(b.syntheticObservations,1);
});
test('private path rejects unapproved roots, workspace paths and traversal',()=>{
 for(const p of ['relative.json','../escape.json','D:/Projects/WorkLingo/person.json'])assert.throws(()=>assertPrivatePath(p,{...authority,privateRoot:'D:/PrivateGateC',storageApproved:true}));assert.throws(()=>assertPrivatePath('D:/PrivateGateC/a.json',authority));
});

test('engineering authority cannot start actual participant session',()=>{
 const a={...authority,provenance:'REAL_FACILITATOR_REPORTED' as const,studyApproved:true,storageApproved:true,privateRoot:'D:/PrivateGateC',approvalReference:'self-attested',retentionApproved:true};
 assert.throws(()=>createSession(a,{slot:'P01',lesson:'MG01-L1',...gate,bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)]},[],1000,0),/AUTHORITY/);
});
test('aggregate cannot turn forged plain human records into measured evidence',()=>{
 const s=make();transition(s,'stop',100);finalize(s,{reading:true,listening:true,speaking:true,writing:true,independentSuccess:true,cognitiveLoad:2});s.provenance='REAL_FACILITATOR_REPORTED';assert.throws(()=>aggregate([s]),/AUTHORITY/);
});
test('eight lesson progression and 24-hour spacing enforced before the second session',()=>{
 const a={...authority,versions:[...authority.versions,{lesson:'MG01-L2',bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)]}]};const x={slot:'P01',lesson:'MG01-L2',...gate,bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)]};
 assert.throws(()=>createSession(a,x,[],86400000,0),/ORDER/);assert.throws(()=>createSession(a,x,[{slot:'P01',lesson:'MG01-L1',startedAt:1000}],86400000,0),/SPACING/);assert.equal(createSession(a,x,[{slot:'P01',lesson:'MG01-L1',startedAt:0}],86400000,0).lesson,'MG01-L2');
});
test('public aggregate rejects unknown provenance and unknown fields',()=>{
 const s=make();assert.throws(()=>aggregate([{...s,provenance:'HUMAN' as never}]),/PROVENANCE/);assert.throws(()=>createSession(authority,{slot:'P01',lesson:'MG01-L1',...gate,bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)],name:'private'} as never,[],1000,0),/PRIVATE/);
});

test('current engineering mandate cannot authorize study reader and cannot read arbitrary file',async()=>{
 const {readStudyAuthority}=await import('./gate-c-session.js');
 await assert.rejects(readStudyAuthority('../../package.json'),/AUTHORITY/);
 await assert.rejects(readStudyAuthority(resolve(__dirname,'../../../../mandate/reports/2026-10-30-r12b-browser-cost-scope.json')),/AUTHORITY/);
});
test('completed synthetic history revalidates consent, versions, timing and outcomes without trusting persisted clocks',async()=>{
 const {importCompleted}=await import('./gate-c-session.js');const s=make();transition(s,'stop',100);finalize(s,{reading:true,listening:true,speaking:true,writing:true,independentSuccess:true,cognitiveLoad:2});assert.equal(importCompleted(authority,[s]).length,1);
 for(const edit of [(r:typeof s)=>{r.attestations.consent=false;},(r:typeof s)=>{r.bundleSha256='bad';},(r:typeof s)=>{r.status='RUNNING';},(r:typeof s)=>{r.totals.active=3600001;},(r:typeof s)=>{r.outcome=null;}]){const r=structuredClone(s);edit(r);assert.throws(()=>importCompleted(authority,[r]));}
});
test('withdrawal preserves unknown outcomes without inventing load or success',()=>{
 const s=make();transition(s,'event',100,'WITHDRAWAL');assert.doesNotThrow(()=>finalize(s,{reading:null,listening:null,speaking:null,writing:null,independentSuccess:null,cognitiveLoad:null}));assert.equal(s.outcome?.cognitiveLoad,null);
});

test('durable exposure reservation survives interruption and prevents same first exposure',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),p=await import('node:path');const mod=await import('./gate-c-session.js');
 const base=p.join(os.tmpdir(),'worklingo-r12b-browser-cost-001','gate-c-tests');fs.mkdirSync(base,{recursive:true});const root=fs.mkdtempSync(p.join(base,'reservation-'));const a={...authority,privateRoot:root,storageApproved:true};const prefix=p.join(root,'observations');const s=make();
 try{mod.reserveExposure(a,prefix,s);assert.throws(()=>mod.readHistory(a,prefix),/RECONCILIATION/);assert.throws(()=>mod.reserveExposure(a,prefix,s),/EEXIST/);assert.ok(fs.existsSync(prefix+'.P01.MG01-L1.started.json'));}finally{fs.rmSync(root,{recursive:true});}
});
test('observed false writing does not erase reading listening or independent success counts',async()=>{
 const {summarizeLesson}=await import('./gate-c-session.js');const s=make();transition(s,'stop',100);finalize(s,{reading:true,listening:true,speaking:true,writing:false,independentSuccess:true,cognitiveLoad:2});
 const a=summarizeLesson('MG01-L1',[s]);assert.equal(a.validCompleted,1);assert.equal(a.readingSuccesses,1);assert.equal(a.listeningSuccesses,1);assert.equal(a.independentSuccesses,1);assert.equal(a.writingSuccesses,0);assert.equal(a.writingObserved,1);
 const unknown=make();transition(unknown,'event',100,'WITHDRAWAL');finalize(unknown,{reading:null,listening:null,speaking:null,writing:null,independentSuccess:null,cognitiveLoad:null});const b=summarizeLesson('MG01-L1',[unknown]);assert.equal(b.observations,1);assert.equal(b.validCompleted,0);assert.equal(b.readingObserved,0);
});
test('completed file cannot hide mismatching durable exposure metadata',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),p=await import('node:path'),mod=await import('./gate-c-session.js');const base=p.join(os.tmpdir(),'worklingo-r12b-browser-cost-001','gate-c-tests');fs.mkdirSync(base,{recursive:true});const root=fs.mkdtempSync(p.join(base,'completed-')),a={...authority,privateRoot:root,storageApproved:true},prefix=p.join(root,'observations'),s=make();
 try{mod.reserveExposure(a,prefix,s);transition(s,'stop',100);finalize(s,{reading:true,listening:true,speaking:true,writing:true,independentSuccess:true,cognitiveLoad:2});fs.writeFileSync(prefix+'.P01.MG01-L1.json',JSON.stringify(s));assert.equal(mod.readHistory(a,prefix).length,1);const marker=JSON.parse(fs.readFileSync(prefix+'.P01.MG01-L1.started.json','utf8'));marker.startedAt++;fs.writeFileSync(prefix+'.P01.MG01-L1.started.json',JSON.stringify(marker));assert.throws(()=>mod.readHistory(a,prefix),/RECONCILIATION/);}finally{fs.rmSync(root,{recursive:true});}
});
