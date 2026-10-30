/** Gate C orchestration. Real study authority is separate from engineering permission. */
import {readFileSync,readdirSync,lstatSync,realpathSync,writeFileSync,openSync,fsyncSync,closeSync} from 'node:fs';
import path from 'node:path';
import {createInterface} from 'node:readline';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {validateObservation} from './rehearsal-protocol.js';
export type Authority={provenance:'SYNTHETIC'|'REAL_FACILITATOR_REPORTED';studyApproved:boolean;storageApproved:boolean;privateRoot:string|null;approvalReference?:string;retentionApproved?:boolean;versions:{lesson:string;bundleSha256:string;audioSha256:string[]}[]};
type Intake={slot:string;lesson:string;adult?:boolean;vietnamese?:boolean;absoluteBeginner?:boolean;consent?:boolean;firstExposure?:boolean;bundleSha256?:string;audioSha256?:string[]};
type History={slot:string;lesson:string;startedAt:number};
type Outcome={reading:boolean|null;listening:boolean|null;speaking:boolean|null;writing:boolean|null;independentSuccess:boolean|null;cognitiveLoad:number|null};
type Kind='active'|'wait'|'support'|'research';
export type Session={provenance:Authority['provenance'];slot:string;lesson:string;bundleSha256:string;audioSha256:string[];startedAt:number;status:'RUNNING'|'PAUSED'|'STOPPED'|'FINALIZED';kind:Kind;last:number;totals:Record<Kind,number>;events:{code:string;at:number}[];stopReason:string|null;reconciliationRequired:boolean;outcome:Outcome|null;attestations:{adult:boolean;vietnamese:boolean;absoluteBeginner:boolean;consent:boolean;firstExposure:boolean}};
const lessons=['MG01-L1','MG01-L2','MG01-L3','MG01-L4','MG02-L1','MG02-L2','MG02-L3','MG02-L4'];
const fail=(code:string):never=>{throw Error(code);};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
// No study mandate currently authorizes participants. Engineering config and
// facilitator booleans cannot mint study authority. A separately reviewed reader
// for an exact approved study/storage/protocol scope is required before intake.
const approvedStudies=new WeakSet<Authority>();
const approvedSessions=new WeakSet<Session>();
export async function readStudyAuthority(scopePath:string):Promise<Authority>{
 const repo=path.resolve(__dirname,'../../../..'),target=path.resolve(scopePath);
 if(!target.startsWith(path.join(repo,'mandate','reports')+path.sep)||lstatSync(target).isSymbolicLink())fail('STUDY_AUTHORITY_REQUIRED');
 const raw=readFileSync(target,'utf8').replace(/\r\n/gu,'\n'),scope=JSON.parse(raw) as {mandate:string;authority:{realParticipants:boolean;study:boolean};gateCStudy:Authority;protocol:{path:string;sha256:string};sourceFiles:{path:string;sha256:string}[];audioFiles:{path:string;sha256:string}[]};
 const names=readdirSync(path.join(repo,'mandate/items')).filter(n=>n.startsWith(scope.mandate+'-'));if(names.length!==1)fail('STUDY_AUTHORITY_REQUIRED');
 const match=readFileSync(path.join(repo,'mandate/items',names[0]!), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u);if(!match)throw Error('STUDY_AUTHORITY_REQUIRED');
 const item=JSON.parse(match[1]!),model=await import(path.join(repo,'.agents/skills/mandate-steward/scripts/model.mjs').replaceAll('\\','/').replace(/^([A-Za-z]):/, 'file:///$1:'));
 const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
 if(item.status!=='verified'||item.approval?.proposal_hash!==model.proposalHash(item,match[2])||!match[2]!.includes(hash(raw))||scope.authority?.realParticipants!==true||scope.authority.study!==true)fail('STUDY_AUTHORITY_REQUIRED');
 if(!scope.protocol||scope.sourceFiles?.length!==8||scope.audioFiles?.length!==24)fail('STUDY_VERSION_REQUIRED');
 for(const f of [scope.protocol,...scope.sourceFiles,...scope.audioFiles]){const p=path.resolve(repo,f.path);if(lstatSync(p).isSymbolicLink()||hash(readFileSync(p))!==f.sha256)fail('STUDY_VERSION_REQUIRED');}
 const a=scope.gateCStudy;if(!a||a.provenance!=='REAL_FACILITATOR_REPORTED'||a.versions.length!==8||!same(a.versions.map(v=>v.lesson),lessons))fail('STUDY_AUTHORITY_REQUIRED');approvedStudies.add(a);return a;
}
export function createSession(a:Authority,x:Intake,history:History[],wall:number,mono:number):Session{
 if(!['SYNTHETIC','REAL_FACILITATOR_REPORTED'].includes(a.provenance))fail('PROVENANCE');
 if(a.provenance==='REAL_FACILITATOR_REPORTED'&&(!approvedStudies.has(a)||!a.studyApproved||!a.storageApproved||!a.privateRoot||!a.approvalReference||!a.retentionApproved))fail('STUDY_AUTHORITY_REQUIRED');
 if(![x.adult,x.vietnamese,x.absoluteBeginner,x.consent,x.firstExposure].every(v=>v===true))fail('CONSENT_ELIGIBILITY_REQUIRED');
 if(!/^P0[1-3]$/u.test(x.slot)||Object.keys(x).some(k=>!['slot','lesson','adult','vietnamese','absoluteBeginner','consent','firstExposure','bundleSha256','audioSha256'].includes(k)))fail('PRIVATE_OR_UNKNOWN_FIELD');
 const v=a.versions.find(v=>v.lesson===x.lesson);if(!v||!same(v.audioSha256,x.audioSha256)||v.bundleSha256!==x.bundleSha256||!/^\w{64}$/u.test(v.bundleSha256)||!v.audioSha256.length||v.audioSha256.some(h=>!/^[a-f\d]{64}$/u.test(h)))throw Error('EXACT_VERSION_REQUIRED');
 if(!Number.isSafeInteger(wall)||wall<0||!Number.isFinite(mono)||mono<0)fail('CLOCK');
 const prior=history.filter(r=>r.slot===x.slot).sort((a,b)=>a.startedAt-b.startedAt);
 if(prior.some(r=>r.lesson===x.lesson))fail('DUPLICATE_EXPOSURE');
 if(lessons[prior.length]!==x.lesson||prior.some((r,i)=>r.lesson!==lessons[i]))fail('PROGRESSION_ORDER');
 if(prior.length&&wall-prior[prior.length-1]!.startedAt<86400000)fail('SPACING_24H');
 const session:Session={provenance:a.provenance,slot:x.slot,lesson:x.lesson,bundleSha256:v.bundleSha256,audioSha256:[...v.audioSha256],startedAt:wall,status:'RUNNING',kind:'active',last:mono,totals:{active:0,wait:0,support:0,research:0},events:[],stopReason:null,reconciliationRequired:false,outcome:null,attestations:{adult:true,vietnamese:true,absoluteBeginner:true,consent:true,firstExposure:true}};if(approvedStudies.has(a))approvedSessions.add(session);return session;
}
export function transition(s:Session,command:'tick'|'pause'|'resume'|'stop'|'event',now:number,code?:string):Session{
 if(s.reconciliationRequired)fail('CRASH_RECONCILIATION_REQUIRED');
 if(!Number.isFinite(now)||now<s.last)fail('MONOTONIC_CLOCK');
 if(!['RUNNING','PAUSED'].includes(s.status))fail('SESSION_STATE');
 if(command==='event'&&!['HINT','REPLAY','ASSISTANCE','TASK_ERROR','SYSTEM_ERROR','CRITICAL_DEFECT','WITHDRAWAL','DISTRESS'].includes(code??''))fail('CODED_EVENT_REQUIRED');
 if(command==='pause'&&(s.status!=='RUNNING'||!['wait','support','research'].includes(code??'')))fail('SESSION_STATE');
 if(command==='resume'&&s.status!=='PAUSED')fail('SESSION_STATE');
 const delta=now-s.last;s.last=now;s.totals[s.kind]+=delta;
 if(s.totals.active>=3600000){s.totals.active=3600000;s.status='STOPPED';s.stopReason='ACTIVE_LIMIT';return s;}
 if(command==='pause'){s.status='PAUSED';s.kind=code as Kind;}
 if(command==='resume'){s.status='RUNNING';s.kind='active';}
 if(command==='stop'){s.status='STOPPED';s.stopReason='FACILITATOR_STOP';}
 if(command==='event'){s.events.push({code:code!,at:now});if(['WITHDRAWAL','DISTRESS','CRITICAL_DEFECT'].includes(code!)){s.status='STOPPED';s.stopReason=code!;}}
 return s;
}
export function finalize(s:Session,input:unknown){
 const x=input as Outcome;if(!x||Object.keys(x).sort().join(',')!=='cognitiveLoad,independentSuccess,listening,reading,speaking,writing'||!['reading','listening','speaking','writing','independentSuccess'].every(k=>(typeof x[k as keyof Outcome]==='boolean'||x[k as keyof Outcome]===null))||!(x.cognitiveLoad===null||(Number.isInteger(x.cognitiveLoad)&&x.cognitiveLoad>=1&&x.cognitiveLoad<=5)))fail('OUTCOME_REQUIRED');
 if(s.status!=='STOPPED'||s.reconciliationRequired)fail('SESSION_STATE');s.outcome={...x};s.status='FINALIZED';return s;
}
const median=(n:number[])=>{const x=[...n].sort((a,b)=>a-b);return x.length?(x[Math.floor(x.length/2)]!+x[Math.floor((x.length-1)/2)]!)/2:null;};
/** Numerical summary only: caller determines provenance; this cannot mint human evidence. */
export function summarizeLesson(lesson:string,rows:Session[]){
 const r=rows.filter(r=>r.lesson===lesson&&r.status==='FINALIZED');
 const eligible=r.filter(r=>!['WITHDRAWAL','DISTRESS','CRITICAL_DEFECT'].includes(r.stopReason??''));
 const complete=eligible.filter(r=>r.outcome&&Object.values(r.outcome).every(v=>v!==null));
 const observed=(k:keyof Outcome)=>eligible.filter(r=>r.outcome?.[k]!==null&&r.outcome?.[k]!==undefined);
 const successes=(k:keyof Outcome)=>observed(k).filter(r=>r.outcome![k]===true).length;
 return {lesson,observations:r.length,validCompleted:complete.length,required:3,
  independentObserved:observed('independentSuccess').length,independentSuccesses:successes('independentSuccess'),
  readingObserved:observed('reading').length,readingSuccesses:successes('reading'),listeningObserved:observed('listening').length,listeningSuccesses:successes('listening'),
  speakingObserved:observed('speaking').length,speakingSuccesses:successes('speaking'),writingObserved:observed('writing').length,writingSuccesses:successes('writing'),
  activeMedianMinutes:median(r.map(r=>r.totals.active/60000)),waitMedianMinutes:median(r.map(r=>r.totals.wait/60000)),supportMedianMinutes:median(r.map(r=>r.totals.support/60000)),researchMedianMinutes:median(r.map(r=>r.totals.research/60000)),loadMedian:median(r.map(r=>r.outcome!.cognitiveLoad).filter((n):n is number=>n!==null)),assistanceEvents:r.reduce((n,r)=>n+r.events.filter(e=>['HINT','REPLAY','ASSISTANCE'].includes(e.code)).length,0),criticalDefects:r.filter(r=>r.stopReason==='CRITICAL_DEFECT').length};
}
function writeDurable(target:string,value:unknown){const fd=openSync(target,'wx',0o600);try{writeFileSync(fd,JSON.stringify(value)+'\n');fsyncSync(fd);}finally{closeSync(fd);}}
export function reserveExposure(a:Authority,prefix:string,s:Session){
 const target=assertPrivatePath(prefix+'.'+s.slot+'.'+s.lesson+'.started.json',a);
 writeDurable(target,{state:'STARTED',provenance:s.provenance,slot:s.slot,lesson:s.lesson,startedAt:s.startedAt,bundleSha256:s.bundleSha256,audioSha256:s.audioSha256,attestations:s.attestations});
}
export function aggregate(rows:Session[]){
 if(rows.some(r=>!['SYNTHETIC','REAL_FACILITATOR_REPORTED'].includes(r.provenance)))fail('PROVENANCE');
 if(rows.some(r=>r.provenance==='REAL_FACILITATOR_REPORTED'&&!approvedSessions.has(r)))fail('STUDY_AUTHORITY_REQUIRED');
 if(rows.length>24||new Set(rows.map(r=>r.slot+':'+r.lesson)).size!==rows.length)fail('OBSERVATION_CAP_OR_DUPLICATE');
 const real=rows.filter(r=>r.provenance==='REAL_FACILITATOR_REPORTED'&&r.status==='FINALIZED');
 return {status:'NEEDS_HUMAN_EVIDENCE',realObservations:real.length,syntheticObservations:rows.filter(r=>r.provenance==='SYNTHETIC'&&r.status==='FINALIZED').length,readinessChanged:false,lessons:lessons.map(lesson=>summarizeLesson(lesson,real))};}
export function assertPrivatePath(target:string,a:Authority){
 if(!a.storageApproved||!a.privateRoot||!path.isAbsolute(target)||!path.isAbsolute(a.privateRoot))fail('PRIVATE_STORAGE_AUTHORITY');
 const root=path.resolve(a.privateRoot!),p=path.resolve(target),repo=path.resolve(__dirname,'../../../..');
 if(p===root||!p.startsWith(root+path.sep)||p===repo||p.startsWith(repo+path.sep)||root===repo||root.startsWith(repo+path.sep))fail('PRIVATE_PATH');
 let parent=path.dirname(p);while(true){const stat=lstatSync(parent);if(!stat.isDirectory()||stat.isSymbolicLink()||realpathSync(parent)!==parent)fail('PRIVATE_REPARSE_PATH');const next=path.dirname(parent);if(next===parent)break;parent=next;}return p;
}
export function importCompleted(a:Authority,rows:unknown[]):Session[]{
 if(a.provenance==='REAL_FACILITATOR_REPORTED'&&!approvedStudies.has(a))fail('STUDY_AUTHORITY_REQUIRED');
 if(!Array.isArray(rows)||rows.length>24)fail('OBSERVATION_CAP');
 const sorted=(rows as Session[]).sort((a,b)=>a.startedAt-b.startedAt),accepted:Session[]=[];
 for(const row of sorted){
  if(!row||Object.keys(row).sort().join(',')!=='attestations,audioSha256,bundleSha256,events,kind,last,lesson,outcome,provenance,reconciliationRequired,slot,startedAt,status,stopReason,totals'||row.provenance!==a.provenance||row.status!=='FINALIZED'||row.reconciliationRequired||!row.attestations)fail('HISTORY_SCHEMA_OR_RECONCILIATION');
  if(Object.keys(row.attestations).sort().join(',')!=='absoluteBeginner,adult,consent,firstExposure,vietnamese'||Object.values(row.attestations).some(v=>v!==true))fail('CONSENT_ELIGIBILITY_REQUIRED');
  const s=createSession(a,{slot:row.slot,lesson:row.lesson,...row.attestations,bundleSha256:row.bundleSha256,audioSha256:row.audioSha256},accepted,row.startedAt,0);
  if(!row.totals||Object.keys(row.totals).sort().join(',')!=='active,research,support,wait'||Object.values(row.totals).some(v=>!Number.isFinite(v)||v<0)||row.totals.active>3600000||!Array.isArray(row.events)||row.events.length>500||row.events.some(e=>Object.keys(e).sort().join(',')!=='at,code'||!Number.isFinite(e.at)||e.at<0||!['HINT','REPLAY','ASSISTANCE','TASK_ERROR','SYSTEM_ERROR','CRITICAL_DEFECT','WITHDRAWAL','DISTRESS'].includes(e.code))||!['FACILITATOR_STOP','ACTIVE_LIMIT','WITHDRAWAL','DISTRESS','CRITICAL_DEFECT'].includes(row.stopReason??''))fail('HISTORY_TIMING_OR_EVENT');
  s.totals={...row.totals};s.events=row.events.map(e=>({...e}));s.stopReason=row.stopReason;s.status='STOPPED';finalize(s,row.outcome);accepted.push(s);
 }return accepted;
}
export function readHistory(a:Authority,prefix:string){
 const target=assertPrivatePath(prefix,a),dir=path.dirname(target),base=path.basename(target)+'.';
 const names=readdirSync(dir);
 const pending=names.filter(n=>n.startsWith(base)&&n.endsWith('.started.json'));
 for(const n of pending){
  const complete=n.replace(/\.started\.json$/u,'.json');if(!names.includes(complete))fail('EXPOSURE_RECONCILIATION_REQUIRED');
  const markerPath=assertPrivatePath(path.join(dir,n),a),donePath=assertPrivatePath(path.join(dir,complete),a);
  for(const p of [markerPath,donePath]){const st=lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>1024*1024)fail('EXPOSURE_RECONCILIATION_REQUIRED');}
  const marker=JSON.parse(readFileSync(markerPath,'utf8')),done=JSON.parse(readFileSync(donePath,'utf8'));
  if(marker.state!=='STARTED'||!['provenance','slot','lesson','startedAt','bundleSha256','audioSha256','attestations'].every(k=>same(marker[k],done[k])))fail('EXPOSURE_RECONCILIATION_REQUIRED');
 }
 return importCompleted(a,names.filter(n=>!n.endsWith('.started.json')).filter(n=>n.startsWith(base)&&n.endsWith('.json')).map(n=>{const p=assertPrivatePath(path.join(dir,n),a),stat=lstatSync(p);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>1024*1024)fail('PRIVATE_HISTORY_PATH');return JSON.parse(readFileSync(p,'utf8'));}));
}
/** Synthetic parity remains governed by the original validator, never relabel real records. */
export const validateSyntheticProtocol=validateObservation;
export function status(){return aggregate([]);}
async function main(){
 const args=process.argv.slice(2);if(args.length===1&&['status','dry-run'].includes(args[0]!)){console.log(JSON.stringify({...status(),tooling:'CONSENT_TIMER_AGGREGATE_ENGINEERING_ONLY',realIntake:'BLOCKED_NO_VERIFIED_STUDY_SCOPE'}));return;}
 // Interactive only; no persisted monotonic clock can be resumed after process loss.
 if(args.length!==3||args[0]!=='session')fail('ARGV_STATUS_OR_SESSION_AUTHORITY_OUTPUT');
 const a=await readStudyAuthority(args[1]!);if(a.provenance!=='REAL_FACILITATOR_REPORTED')fail('REAL_AUTHORITY_REQUIRED');
 const output=assertPrivatePath(args[2]!,a);const rl=createInterface({input:process.stdin,output:process.stderr});let session:Session|undefined;const completed:Session[]=readHistory(a,output);const history:History[]=completed.map(s=>({slot:s.slot,lesson:s.lesson,startedAt:s.startedAt}));
 console.error('JSON lines: start {intake}; pause wait|support|research; resume; event CODE; stop; finalize {outcomes}; summary. No names or answers. Process loss invalidates active interval; do not reload as resumed.');
 const timer=setInterval(()=>{if(session&&['RUNNING','PAUSED'].includes(session.status))transition(session,'tick',performance.now());},1000);
 try{for await(const line of rl){await readStudyAuthority(args[1]!);const [cmd,...rest]=line.split(' '),payload=rest.join(' ');if(cmd==='start'){if(session)fail('ONE_SESSION_PER_PROCESS');const candidate=createSession(a,JSON.parse(payload),history,Date.now(),performance.now());reserveExposure(a,output,candidate);session=candidate;}else if(cmd==='summary')console.log(JSON.stringify(aggregate([...completed,...(session?[session]:[])])));else if(cmd==='finalize'){if(!session)throw Error('SESSION_REQUIRED');finalize(session,JSON.parse(payload));writeDurable(assertPrivatePath(output+'.'+session.slot+'.'+session.lesson+'.json',a),session);completed.push(session);history.push({slot:session.slot,lesson:session.lesson,startedAt:session.startedAt});session=undefined;console.log(JSON.stringify(aggregate(completed)));}else if(session&&['pause','resume','event','stop'].includes(cmd??''))transition(session,cmd as 'pause',performance.now(),payload||undefined);else fail('COMMAND');}}
 finally{clearInterval(timer);rl.close();}
}
if(require.main===module)main().catch(()=>{console.error('GATE_C_COMMAND_REJECTED');process.exitCode=1;});
