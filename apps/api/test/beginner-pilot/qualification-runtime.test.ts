import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { test } from 'node:test';
import * as fs from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { QualificationRuntime, type SCENARIOS, runtimePath } from './qualification-runtime.js';
const files = ['state.json','state.pending','results.pending','review.pending','anchor.json','journal.jsonl'];
function clean(s: typeof SCENARIOS[number]) {
 const root=runtimePath(s); fs.mkdirSync(root,{recursive:true});
 assert.ok(!fs.lstatSync(root).isSymbolicLink());
 const lock=resolve(root,'writer.lock');
 if(fs.existsSync(lock)) { const owner=JSON.parse(fs.readFileSync(resolve(lock,'owner.json'),'utf8')); assert.equal(owner.synthetic,true); assert.ok(!alive(owner.pid)); fs.unlinkSync(resolve(lock,'owner.json')); fs.rmdirSync(lock); }
 for(const name of files) { const path=resolve(root,name); if(fs.existsSync(path)){assert.ok(fs.lstatSync(path).isFile());fs.unlinkSync(path);} }
}
function alive(pid:number){try{process.kill(pid,0);return true;}catch{return false;}}
function runtime(s:typeof SCENARIOS[number]) { clean(s);return new QualificationRuntime(s); }
const start=(id:string,at=100000)=>({id,caseId:'case',phase:'pilot' as const,at,inputTokens:100,outputTokens:2048});
test('restart recovers completed receipt and exact evidence without re-appending',async()=>{
 const r=runtime('restart');await r.withAccountingLock(()=>{r.reserveRequest(start('a'));r.recordOutcome('a',{status:'COMPLETE',inputTokens:80,outputTokens:50,model:'fixed-v1'});r.appendEvidence('REVIEW',{id:'review1',provenance:'SYNTHETIC'});});
 const reopened=new QualificationRuntime('restart');const ledger=reopened.recoverLedger();assert.equal(ledger.requests.length,1);assert.equal(ledger.evidence.length,1);assert.equal(ledger.requests[0]!.outcome?.status,'COMPLETE');assert.equal(ledger.runnerSafe,false);
 await reopened.withAccountingLock(()=>assert.throws(()=>reopened.reserveRequest(start('a',120000)),/DUPLICATE/));
});
test('duplicate evidence IDs reject without overwriting earlier evidence',async()=>{const r=runtime('duplicate');await r.withAccountingLock(()=>{r.appendEvidence('REVIEW',{id:'one',provenance:'SYNTHETIC'});assert.throws(()=>r.appendEvidence('REVIEW',{id:'one',provenance:'SYNTHETIC'}),/DUPLICATE/);});assert.equal(r.recoverLedger().evidence.length,1);});
test('unknown usage remains consumed and prevents next reservation',async()=>{const r=runtime('unknown-usage');await r.withAccountingLock(()=>{r.reserveRequest(start('a'));r.recordOutcome('a',{status:'UNKNOWN'});assert.throws(()=>r.reserveRequest(start('b',120000)),/UNKNOWN/);});assert.equal(r.recoverLedger().inputReserved,100);});
test('timeout records unknown without retry and consumes a start',async()=>{const r=runtime('timeout');let calls=0;await assert.rejects(r.withAccountingLock(async()=>{r.reserveRequest(start('a'));try{calls++;throw Error('TIMEOUT');}catch{r.recordOutcome('a',{status:'UNKNOWN'});throw Error('TIMEOUT');}}),/TIMEOUT/);assert.equal(calls,1);assert.equal(r.recoverLedger().requests.length,1);});
test('reservation is impossible outside owned lock',()=>{const r=runtime('before-reservation');assert.throws(()=>r.reserveRequest(start('a')),/LOCK_REQUIRED/);});
test('rejects corrupt or truncated journal, never silently resets',async()=>{const r=runtime('corrupt-ledger');await r.withAccountingLock(()=>r.appendEvidence('REVIEW',{id:'one'}));fs.appendFileSync(resolve(runtimePath('corrupt-ledger'),'journal.jsonl'),'{');assert.throws(()=>r.recoverLedger(),/JOURNAL/);});
test('missing receipt/journal with nonzero high-water state fails closed',async()=>{const r=runtime('missing-receipt');await r.withAccountingLock(()=>r.reserveRequest(start('a')));fs.unlinkSync(resolve(runtimePath('missing-receipt'),'journal.jsonl'));assert.throws(()=>r.recoverLedger(),/MISSING_JOURNAL/);});
test('existing stale lock is retained and blocks acquisition',async()=>{const r=runtime('stale-lock');const lock=resolve(runtimePath('stale-lock'),'writer.lock');fs.mkdirSync(lock);fs.writeFileSync(resolve(lock,'owner.json'),JSON.stringify({synthetic:true,pid:2147483646,token:'foreign'}));await assert.rejects(r.withAccountingLock(()=>{}),/LOCK_BUSY/);assert.ok(fs.existsSync(lock));});
test('state rename failure cannot erase fsynced reservation',async()=>{clean('rename-failure');const r=new QualificationRuntime('rename-failure',{beforeStateRename:()=>{throw Error('RENAME_FAILURE');}});await assert.rejects(r.withAccountingLock(()=>r.reserveRequest(start('a'))),/RENAME_FAILURE/);const ledger=new QualificationRuntime('rename-failure').recoverLedger();assert.equal(ledger.requests.length,1);assert.equal(ledger.requests[0]!.effectiveStatus,'UNKNOWN');});
test('path selectors and symlink/reparse paths fail closed',()=>{assert.throws(()=>new QualificationRuntime('../escape' as never),/PATH/);runtime('path-reparse');const root=runtimePath('path-reparse'),link=resolve(root,'state.pending');fs.symlinkSync(resolve(root,'state.json'),link,'file');try{assert.throws(()=>new QualificationRuntime('path-reparse').recoverLedger(),/REPARSE/);}finally{fs.unlinkSync(link);}});
test('pilot cap, lifetime cap and rate/token accounting persist across instances',async()=>{const r=runtime('budget-exhaustion');await r.withAccountingLock(()=>{for(let i=0;i<160;i++){const request={...start(String(i),100000+i*10000),phase:i<20?'pilot' as const:'remainder' as const};r.reserveRequest(request);r.recordOutcome(String(i),{status:'COMPLETE',inputTokens:10,outputTokens:10,model:'fixed-v1'});if(i===19)assert.throws(()=>r.reserveRequest(start('pilot21',request.at+10000)),/PILOT_CAP/);}assert.throws(()=>r.reserveRequest({...start('161',1800000),phase:'remainder'}),/LIFETIME_CAP/);});assert.equal(new QualificationRuntime('budget-exhaustion').recoverLedger().requests.length,160);});
function child(s:typeof SCENARIOS[number],point:string):ChildProcess {
 const modulePath=resolve(__dirname,'qualification-runtime.ts'); const loader=require.resolve('tsx/cjs');
 const code=`require(${JSON.stringify(loader)});const {QualificationRuntime}=require(${JSON.stringify(modulePath)});const r=new QualificationRuntime(${JSON.stringify(s)});r.withAccountingLock(async()=>{if(${JSON.stringify(point)}!=='before-reservation')r.reserveRequest(${JSON.stringify(start('child'))});let calls=0;if(${JSON.stringify(point)}==='during-request'){calls++;const inFlight=new Promise(()=>{});void inFlight;}if(${JSON.stringify(point)}==='after-response'){await (async()=>{calls++;return {body:'SYNTHETIC_RESPONSE'};})();}process.send({stage:${JSON.stringify(point)},calls});await new Promise(()=>{});}).catch(()=>process.exit(7));`;
 return spawn(process.execPath,['-e',code],{env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP},stdio:['ignore','ignore','ignore','ipc']});
}
for(const scenario of ['before-reservation','after-reservation','during-request','after-response'] as const)test('actual child kill at '+scenario+' retains budget; stale owner is never auto-reaped',async()=>{
 clean(scenario);const c=child(scenario,scenario);await new Promise<void>((yes,no)=>{c.once('message',(message:unknown)=>{const m=message as {stage:string;calls:number};assert.equal(m.stage,scenario);assert.equal(m.calls,['during-request','after-response'].includes(scenario)?1:0);yes();});c.once('exit',code=>no(Error('child exited '+code)));});
 const r=new QualificationRuntime(scenario);await assert.rejects(r.withAccountingLock(()=>{}),/LOCK_BUSY/);
 const exited=new Promise<void>(yes=>c.once('exit',()=>yes()));c.kill('SIGKILL');await exited;
 const ledger=r.recoverLedger();assert.equal(ledger.requests.length,scenario==='before-reservation'?0:1);if(ledger.requests.length)assert.equal(ledger.requests[0]!.effectiveStatus,'UNKNOWN');await assert.rejects(r.withAccountingLock(()=>{}),/LOCK_BUSY/);
 clean(scenario);
});
test('concurrent processes cannot both acquire writer lock',async()=>{clean('concurrent');const c=child('concurrent','before-reservation');await new Promise<void>(yes=>c.once('message',()=>yes()));try{await assert.rejects(new QualificationRuntime('concurrent').withAccountingLock(()=>{}),/LOCK_BUSY/);}finally{const done=new Promise<void>(yes=>c.once('exit',()=>yes()));c.kill();await done;}clean('concurrent');});

test('rate violation,changed model and usage exceeding reservation cannot authorize another start',async()=>{const r=runtime('restart');await r.withAccountingLock(()=>{r.reserveRequest(start('a'));assert.throws(()=>r.recordOutcome('a',{status:'COMPLETE',inputTokens:101,outputTokens:1,model:'fixed-v1'}),/EXCEEDS/);r.recordOutcome('a',{status:'COMPLETE',inputTokens:1,outputTokens:1,model:'fixed-v1'});assert.throws(()=>r.reserveRequest(start('b',105000)),/RATE/);r.reserveRequest(start('b',110000));assert.throws(()=>r.recordOutcome('b',{status:'COMPLETE',inputTokens:1,outputTokens:1,model:'different'}),/MODEL_CHANGED/);assert.equal(r.recoverLedger().requests[1]!.effectiveStatus,'UNKNOWN');});});
test('secret/oversized evidence and synthetic derived-view publication are denied',async()=>{const r=runtime('duplicate');await r.withAccountingLock(()=>{assert.throws(()=>r.appendEvidence('REVIEW',{id:'secret',text:'Bearer fake-secret'}),/PRIVACY/);assert.throws(()=>r.appendEvidence('REVIEW',{id:'large',text:'x'.repeat(1048577)}),/PRIVACY/);assert.throws(()=>r.atomicView('review.pending','docs/qualification/beginner-pilot-independent-qa.json',{}),/SYNTHETIC_VIEW/);});});

test('actual frozen candidate identifiers may include colon separators',async()=>{const r=runtime('restart');await r.withAccountingLock(()=>r.reserveRequest({...start('mg01-l1-s1:AUTHORED_CORRECT'),caseId:'mg01-l1-s1:AUTHORED_CORRECT'}));assert.equal(r.recoverLedger().requests.length,1);});

test('remainder cannot bypass the pilot, including incomplete or failed pilot receipts',async()=>{
 const r=runtime('budget-exhaustion');
 await r.withAccountingLock(()=>{
  const remainder=(at:number)=>({...start('remainder',at),phase:'remainder' as const});
  assert.throws(()=>r.reserveRequest(remainder(100000)),/PILOT_NOT_COMPLETE/);
  assert.equal(r.recoverLedger().requests.length,0);
  for(let i=0;i<20;i++){
   r.reserveRequest(start(String(i),100000+i*10000));
   r.recordOutcome(String(i),i===19?{status:'ERROR'}:{status:'COMPLETE',inputTokens:10,outputTokens:10,model:'fixed-v1'});
   if(i===18)assert.throws(()=>r.reserveRequest(remainder(290000)),/PILOT_NOT_COMPLETE/);
  }
  assert.throws(()=>r.reserveRequest(remainder(300000)),/PILOT_NOT_COMPLETE/);
  assert.equal(r.recoverLedger().requests.length,20);
 });
});

test('malformed high-water state cannot be replayed as valid accounting',async()=>{
 const r=runtime('corrupt-ledger');
 await r.withAccountingLock(()=>r.reserveRequest(start('a')));
 const state=resolve(r.root,'state.json'), original=fs.readFileSync(state);
 try{
  for(const invalid of [{sequence:0,hash:'invalid'},{sequence:-1},{sequence:1}]){
   fs.writeFileSync(state,JSON.stringify(invalid));
   assert.throws(()=>r.recoverLedger(),/JOURNAL_ROLLBACK/);
  }
 }finally{fs.writeFileSync(state,original);}
 assert.equal(r.recoverLedger().requests.length,1);
});

test('rehashed journal cannot replay invalid reservation semantics or fabricate completed usage',async()=>{
 const r=runtime('corrupt-ledger');
 await r.withAccountingLock(()=>{
  r.reserveRequest(start('a'));
  r.recordOutcome('a',{status:'COMPLETE',inputTokens:10,outputTokens:10,model:'fixed-v1'});
 });
 const journal=resolve(r.root,'journal.jsonl'),state=resolve(r.root,'state.json');
 const originalJournal=fs.readFileSync(journal),originalState=fs.readFileSync(state);
 const original=originalJournal.toString().trim().split('\n').map(line=>JSON.parse(line));
 const mutations=[
  (events:typeof original)=>{events[0].data.inputTokens=-100;},
  (events:typeof original)=>{events[0].data.phase='remainder';},
  (events:typeof original)=>{events[1].data.outcome.inputTokens=101;},
  (events:typeof original)=>{delete events[1].data.outcome.model;},
  (events:typeof original)=>{events[1].data.outcome.status='FORGED';},
 ];
 try{
  for(const mutate of mutations){
   const events=structuredClone(original);mutate(events);
   for(let i=0;i<events.length;i++){
    const {hash:_oldHash,...body}=events[i];void _oldHash;
    body.previous=i?events[i-1].hash:'GENESIS';
    events[i]={...body,hash:createHash('sha256').update(JSON.stringify(body)).digest('hex')};
   }
   fs.writeFileSync(journal,events.map(e=>JSON.stringify(e)).join('\n')+'\n');
   fs.writeFileSync(state,JSON.stringify({sequence:events.length,hash:events.at(-1).hash}));
   assert.throws(()=>r.recoverLedger(),/RESERVATION_BOUNDS|PILOT_NOT_COMPLETE|USAGE_EXCEEDS|MODEL_REQUIRED|OUTCOME_STATUS/);
  }
 }finally{fs.writeFileSync(journal,originalJournal);fs.writeFileSync(state,originalState);}
 assert.equal(r.recoverLedger().requests[0]!.effectiveStatus,'COMPLETE');
});

test('reservation identifiers must be strings before anything is journaled',async()=>{
 const r=runtime('restart');
 await r.withAccountingLock(()=>{
  for(const field of ['id','caseId'] as const){
   for(const value of [undefined,null,1]){
    assert.throws(()=>r.reserveRequest({...start('a'),[field]:value} as never),/REQUEST_ID/);
    assert.equal(r.recoverLedger().requests.length,0);
   }
  }
 });
});

test('outcome identifiers reject coercible values without consuming the receipt slot',async()=>{
 const r=runtime('restart');
 await r.withAccountingLock(()=>{
  r.reserveRequest(start('a'));
  for(const value of [undefined,null,1]){
   assert.throws(()=>r.recordOutcome(value as never,{status:'ERROR'}),/REQUEST_ID/);
  }
  r.recordOutcome('a',{status:'ERROR'});
 });
 assert.equal(r.recoverLedger().requests[0]!.effectiveStatus,'ERROR');
});

test('rehashed journal rejects missing or numeric request and case identifiers',async()=>{
 const r=runtime('corrupt-ledger');
 await r.withAccountingLock(()=>r.reserveRequest(start('a')));
 const journal=resolve(r.root,'journal.jsonl'),state=resolve(r.root,'state.json');
 const originalJournal=fs.readFileSync(journal),originalState=fs.readFileSync(state);
 try{
  for(const field of ['id','caseId'] as const){
   for(const value of [undefined,null,1]){
    const event=JSON.parse(originalJournal.toString());event.data[field]=value;
    const {hash:_oldHash,...body}=event;void _oldHash;
    const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
    fs.writeFileSync(journal,JSON.stringify({...body,hash})+'\n');
    fs.writeFileSync(state,JSON.stringify({sequence:1,hash}));
    assert.throws(()=>r.recoverLedger(),/REQUEST_ID/);
   }
  }
 }finally{fs.writeFileSync(journal,originalJournal);fs.writeFileSync(state,originalState);}
 assert.equal(r.recoverLedger().requests[0]!.id,'a');
});

test('evidence identifiers reject coercion before append',async()=>{
 const r=runtime('duplicate');
 await r.withAccountingLock(()=>{
  for(const id of [undefined,null,1]){
   assert.throws(()=>r.appendEvidence('REVIEW',{id} as never),/EVIDENCE_ID/);
   assert.equal(r.recoverLedger().evidence.length,0);
  }
 });
});

test('evidence replay rechecks identifier and privacy boundaries after hash validation',async()=>{
 const r=runtime('corrupt-ledger');
 await r.withAccountingLock(()=>r.appendEvidence('REVIEW',{id:'review1',provenance:'SYNTHETIC'}));
 const journal=resolve(r.root,'journal.jsonl'),state=resolve(r.root,'state.json');
 const originalJournal=fs.readFileSync(journal),originalState=fs.readFileSync(state);
 try{
  for(const data of [{id:1},{id:'review1',text:'Bearer synthetic-fixture'}]){
   const event=JSON.parse(originalJournal.toString());event.data=data;
   const {hash:_oldHash,...body}=event;void _oldHash;
   const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
   fs.writeFileSync(journal,JSON.stringify({...body,hash})+'\n');
   fs.writeFileSync(state,JSON.stringify({sequence:1,hash}));
   assert.throws(()=>r.recoverLedger(),/EVIDENCE_ID|EVIDENCE_PRIVACY/);
  }
 }finally{fs.writeFileSync(journal,originalJournal);fs.writeFileSync(state,originalState);}
 assert.equal(r.recoverLedger().evidence.length,1);
});

for(const fault of ['disk-full-before-append','disk-full-partial-append','fsync-after-append'] as const)test(fault+' stops before transport and retains conservative recovery',()=>{
 const scenario='rename-failure';clean(scenario);
 const code=`
 require(${JSON.stringify(require.resolve('tsx/cjs'))});
 const fs=require('node:fs'),{syncBuiltinESMExports}=require('node:module');
 const original={open:fs.openSync,write:fs.writeFileSync,sync:fs.fsyncSync};const paths=new Map();
 fs.openSync=function(path,...args){const fd=original.open.call(fs,path,...args);paths.set(fd,String(path));return fd;};
 fs.writeFileSync=function(fd,text,...args){
  if(paths.get(fd)?.endsWith('journal.jsonl')&&String(text).length&&${JSON.stringify(fault)}!=='fsync-after-append'){
   if(${JSON.stringify(fault)}==='disk-full-partial-append')original.write.call(fs,fd,String(text).slice(0,20),...args);
   const error=Error('INJECTED_ENOSPC');error.code='ENOSPC';throw error;
  }return original.write.call(fs,fd,text,...args);
 };
 fs.fsyncSync=function(fd){if(paths.get(fd)?.endsWith('journal.jsonl')&&fs.fstatSync(fd).size>0&&${JSON.stringify(fault)}==='fsync-after-append')throw Error('INJECTED_FSYNC');return original.sync.call(fs,fd);};
 syncBuiltinESMExports();
 const {QualificationRuntime}=require(${JSON.stringify(resolve(__dirname,'qualification-runtime.ts'))});
 const r=new QualificationRuntime(${JSON.stringify(scenario)});let transportCalls=0;
 (async()=>{let failure;try{await r.withAccountingLock(()=>{r.reserveRequest(${JSON.stringify(start('fault'))});transportCalls++;});}catch(e){failure=e.message;}
 fs.openSync=original.open;fs.writeFileSync=original.write;fs.fsyncSync=original.sync;syncBuiltinESMExports();
 let requests=null,recoveryError=null,nextError=null;
 try{requests=r.recoverLedger().requests.map(x=>x.effectiveStatus);}catch(e){recoveryError=e.message;}
 if(requests?.length)try{await r.withAccountingLock(()=>r.reserveRequest(${JSON.stringify(start('next',120000))}));}catch(e){nextError=e.message;}
 console.log(JSON.stringify({failure,transportCalls,requests,recoveryError,nextError}));})().catch(()=>process.exit(9));`;
 try{
  const result=JSON.parse(execFileSync(process.execPath,['-e',code],{encoding:'utf8',env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP}}));
  assert.match(result.failure,/INJECTED_ENOSPC|INJECTED_FSYNC/);assert.equal(result.transportCalls,0);
  if(fault==='disk-full-before-append')assert.deepEqual(result.requests,[]);
  if(fault==='disk-full-partial-append')assert.match(result.recoveryError,/JOURNAL_TRUNCATED/);
  if(fault==='fsync-after-append'){assert.deepEqual(result.requests,['UNKNOWN']);assert.match(result.nextError,/UNKNOWN_PENDING/);}
 }finally{clean(scenario);}
});
