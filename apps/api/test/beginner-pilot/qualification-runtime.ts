/** Offline durable accounting. No credentials, default transport, dotenv or database access. */
import * as fs from 'node:fs';
import { resolve, parse } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
export const SCENARIOS = ['before-reservation','after-reservation','during-request','after-response','duplicate','concurrent','corrupt-ledger','missing-receipt','restart','stale-lock','path-reparse','rename-failure','budget-exhaustion','timeout','unknown-usage'] as const;
type Scenario=typeof SCENARIOS[number];
const BASE=resolve(__dirname,'../../../..');
const ROOT=resolve(BASE,'.qualification-runtime/beginner-r12b');
const NAMES=['journal.jsonl','state.json','state.pending','results.pending','review.pending','anchor.json','writer.lock','writer.lock/owner.json'];
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function need(ok:unknown,reason:string):asserts ok {if(!ok)throw Error(reason);}
function inspect(path:string){let cursor=parse(path).root;for(const part of path.slice(cursor.length).split(/[\\/]/u).filter(Boolean)){cursor=resolve(cursor,part);if(fs.existsSync(cursor)||isLink(cursor)){need(!fs.lstatSync(cursor).isSymbolicLink(),'PATH_REPARSE');}}}
function isLink(path:string){try{return fs.lstatSync(path).isSymbolicLink();}catch{return false;}}
export function runtimePath(s?:Scenario){need(s===undefined||SCENARIOS.includes(s),'PATH_NOT_ALLOWED');const p=s?resolve(ROOT,'fault-tests',s):ROOT;inspect(p);return p;}
export type Reservation={id:string;caseId:string;phase:'pilot'|'remainder';at:number;inputTokens:number;outputTokens:number};
export type Outcome={status:'COMPLETE'|'ERROR'|'UNKNOWN';inputTokens?:number;outputTokens?:number;model?:string};
type Event={sequence:number;previous:string;kind:'RESERVE'|'OUTCOME'|'REVIEW'|'ORACLE';data:unknown;hash:string};
type RequestState=Reservation&{outcome?:Outcome;effectiveStatus:string};
export type Ledger={events:Event[];requests:RequestState[];evidence:Event[];inputReserved:number;outputReserved:number;runnerSafe:false;durability:'PROCESS_CRASH_ONLY_POWER_LOSS_NOT_PROVEN'};
export class QualificationRuntime {
 readonly root:string;private token:string|null=null;
 constructor(readonly scenario?:Scenario,private hooks:{beforeStateRename?:()=>void}={}){this.root=runtimePath(scenario);}
 private check(){inspect(this.root);for(const n of NAMES){const p=resolve(this.root,n);need(!isLink(p),'PATH_REPARSE');if(fs.existsSync(p)&&fs.lstatSync(p).isFile())need(fs.lstatSync(p).nlink===1,'PATH_HARDLINK');}}
 private ensure(){this.check();fs.mkdirSync(this.root,{recursive:true});this.check();}
 private file(name:string){need(NAMES.includes(name),'PATH_NOT_ALLOWED');return resolve(this.root,name);}
 private syncWrite(path:string,text:string,flag:'w'|'wx'|'a'){const fd=fs.openSync(path,flag,0o600);try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
 async withAccountingLock<T>(operation:()=>T|Promise<T>):Promise<T>{
  this.ensure();const lock=this.file('writer.lock');try{fs.mkdirSync(lock);}catch{throw Error('LOCK_BUSY_REQUIRES_OWNERSHIP_REVIEW');}
  const token=randomUUID();this.token=token;
  try{this.syncWrite(this.file('writer.lock/owner.json'),JSON.stringify({pid:process.pid,token,synthetic:!!this.scenario}), 'wx');return await operation();}
  finally{const own=this.token;this.token=null;try{const value=JSON.parse(fs.readFileSync(this.file('writer.lock/owner.json'),'utf8'));if(value.token===own&&value.pid===process.pid){fs.unlinkSync(this.file('writer.lock/owner.json'));fs.rmdirSync(lock);}}catch{/* Retain unverifiable lock; never remove another writer's lock. */}}
 }
 private assertOwned(){need(this.token,'LOCK_REQUIRED');const owner=JSON.parse(fs.readFileSync(this.file('writer.lock/owner.json'),'utf8'));need(owner.token===this.token&&owner.pid===process.pid,'LOCK_REQUIRED');}
 recoverLedger():Ledger {
  this.check();const journal=this.file('journal.jsonl'),anchor=this.file('anchor.json'),state=this.file('state.json');
  const anchored=fs.existsSync(anchor);const raw=fs.existsSync(journal)?fs.readFileSync(journal,'utf8'):'';
  need(!anchored||fs.existsSync(journal),'MISSING_JOURNAL');need(!raw||anchored,'MISSING_ANCHOR');
  if(anchored){const a=JSON.parse(fs.readFileSync(anchor,'utf8'));need(a.identity==='beginner-r12b/1'&&a.synthetic===!!this.scenario,'ANCHOR_IDENTITY');}
  need(!raw||raw.endsWith('\n'),'JOURNAL_TRUNCATED');const events:Event[]=[];
  for(const line of raw.split('\n').filter(Boolean)){let e:Event;try{e=JSON.parse(line);}catch{throw Error('JOURNAL_CORRUPT');}const {hash,...body}=e;need(e.sequence===events.length+1&&e.previous===(events.at(-1)?.hash??'GENESIS')&&sha(JSON.stringify(body))===hash,'JOURNAL_HASH_CHAIN');need(['RESERVE','OUTCOME','REVIEW','ORACLE'].includes(e.kind),'JOURNAL_KIND');events.push(e);}
  if(fs.existsSync(state)){const high=JSON.parse(fs.readFileSync(state,'utf8'));need(Number.isInteger(high.sequence)&&high.sequence<=events.length,'JOURNAL_ROLLBACK');if(high.sequence)need(events[high.sequence-1]?.hash===high.hash,'JOURNAL_ROLLBACK');}
  const requests:RequestState[]=[], evidence:Event[]=[];
  for(const e of events){if(e.kind==='RESERVE'){const r=e.data as Reservation;need(!requests.some(x=>x.id===r.id),'JOURNAL_DUPLICATE');requests.push({...r,effectiveStatus:'UNKNOWN'});}else if(e.kind==='OUTCOME'){const d=e.data as {id:string;outcome:Outcome};const r=requests.find(x=>x.id===d.id);need(r&&!r.outcome,'JOURNAL_OUTCOME');r.outcome=d.outcome;r.effectiveStatus=d.outcome.status;}else{const id=(e.data as {id:string}).id;need(id&&!evidence.some(x=>(x.data as {id:string}).id===id),'JOURNAL_DUPLICATE');evidence.push(e);}}
  return {events,requests,evidence,inputReserved:requests.reduce((n,r)=>n+r.inputTokens,0),outputReserved:requests.reduce((n,r)=>n+r.outputTokens,0),runnerSafe:false,durability:'PROCESS_CRASH_ONLY_POWER_LOSS_NOT_PROVEN'};
 }
 private append(kind:Event['kind'],data:unknown){
  this.assertOwned();const ledger=this.recoverLedger();
  if(!fs.existsSync(this.file('anchor.json'))){this.syncWrite(this.file('journal.jsonl'),'','wx');this.syncWrite(this.file('anchor.json'),JSON.stringify({identity:'beginner-r12b/1',synthetic:!!this.scenario}),'wx');}
  const body={sequence:ledger.events.length+1,previous:ledger.events.at(-1)?.hash??'GENESIS',kind,data};const event={...body,hash:sha(JSON.stringify(body))};
  // Write-ahead journal is authoritative. A pending request stays consumed after abrupt death.
  this.syncWrite(this.file('journal.jsonl'),JSON.stringify(event)+'\n','a');
  this.syncWrite(this.file('state.pending'),JSON.stringify({sequence:event.sequence,hash:event.hash}),'w');this.hooks.beforeStateRename?.();fs.renameSync(this.file('state.pending'),this.file('state.json'));return event;
 }
 reserveRequest(r:Reservation){
  this.assertOwned();const l=this.recoverLedger();need(/^[\w:-]{1,128}$/u.test(r.id)&&/^[\w:-]{1,128}$/u.test(r.caseId),'REQUEST_ID');need(['pilot','remainder'].includes(r.phase),'PHASE');
  need(!l.requests.some(x=>x.id===r.id),'DUPLICATE_REQUEST');need(l.requests.length<160,'LIFETIME_CAP');need(r.phase!=='pilot'||l.requests.filter(x=>x.phase==='pilot').length<20,'PILOT_CAP');
  need(!l.requests.some(x=>x.effectiveStatus==='UNKNOWN'),'UNKNOWN_PENDING_REQUIRES_RECONCILIATION');
  need([r.at,r.inputTokens,r.outputTokens].every(Number.isSafeInteger)&&r.at>=0&&r.inputTokens>0&&r.outputTokens>0&&r.outputTokens<=2048,'RESERVATION_BOUNDS');
  need(!l.requests.length||r.at-l.requests.at(-1)!.at>=10000,'RATE_INTERVAL');need(l.requests.filter(x=>r.at-x.at<60000).length<6,'RATE_WINDOW');
  need(l.inputReserved+r.inputTokens<=650000&&l.outputReserved+r.outputTokens<=327680,'TOKEN_CAP');need((l.inputReserved+r.inputTokens)*.8/1e6+(l.outputReserved+r.outputTokens)*2.7/1e6<=1.5,'CREDIT_CAP');
  this.append('RESERVE',r);return r;
 }
 recordOutcome(id:string,outcome:Outcome){this.assertOwned();const l=this.recoverLedger(),r=l.requests.find(x=>x.id===id);need(r&&!r.outcome,'OUTCOME_REQUEST');need(['COMPLETE','ERROR','UNKNOWN'].includes(outcome.status),'OUTCOME_STATUS');
  if(outcome.status==='COMPLETE'){need(Number.isSafeInteger(outcome.inputTokens)&&Number.isSafeInteger(outcome.outputTokens)&&outcome.inputTokens!>=0&&outcome.outputTokens!>=0,'USAGE_REQUIRED');need(outcome.inputTokens!<=r.inputTokens&&outcome.outputTokens!<=r.outputTokens,'USAGE_EXCEEDS_RESERVATION');need(typeof outcome.model==='string'&&/^[\w.-]{1,128}$/u.test(outcome.model),'MODEL_REQUIRED');const model=l.requests.find(x=>x.outcome?.status==='COMPLETE')?.outcome?.model;need(!model||model===outcome.model,'MODEL_CHANGED');}
  this.append('OUTCOME',{id,outcome});
 }
 appendEvidence(kind:'REVIEW'|'ORACLE',data:{id:string;[k:string]:unknown}){this.assertOwned();need(/^[\w-]{1,128}$/u.test(data.id),'EVIDENCE_ID');need(!this.recoverLedger().evidence.some(e=>(e.data as {id:string}).id===data.id),'DUPLICATE_EVIDENCE');const text=JSON.stringify(data);need(Buffer.byteLength(text)<=1048576&&!/Bearer\s+|api[_-]?key|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(text),'EVIDENCE_PRIVACY');return this.append(kind,data);}
 /** Derived views can be reconstructed from journal. A failed rename never erases source events. */
 atomicView(name:'results.pending'|'review.pending',target:string,value:unknown){this.assertOwned();need(!this.scenario,'SYNTHETIC_VIEW_CANNOT_PUBLISH');const allowed=['docs/qualification/beginner-pilot-provider-calibration-results.json','docs/qualification/beginner-pilot-independent-qa.json'];need(allowed.includes(target),'VIEW_PATH');const path=resolve(BASE,target);inspect(path);this.syncWrite(this.file(name),JSON.stringify(value,null,2)+'\n','w');fs.renameSync(this.file(name),path);}
}
