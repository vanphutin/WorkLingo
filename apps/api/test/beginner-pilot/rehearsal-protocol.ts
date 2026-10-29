/** Synthetic protocol engineering only. No live-session command or participant persistence. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const bundles=JSON.parse(readFileSync(resolve(__dirname,'../../../../docs/qualification/beginner-pilot-post-context-requalification.json'),'utf8')).sourceBundles as {lesson:string;reviewedBundleSha256:string}[];
export type Observation={provenance:'SYNTHETIC';participant:string;lesson:string;bundleSha256:string;adult:boolean;consent:boolean;firstExposure:boolean;startedAt:number;intervals:{start:number;end:number;kind:'active'|'wait'|'support'|'research';purposeful:boolean}[];skills:{reading:boolean;listening:boolean;speaking:boolean;writing:boolean};comprehension:{reading:boolean;listening:boolean};independentSuccess:boolean;criticalDefect:boolean;cognitiveLoad:number};
const fields=['provenance','participant','lesson','bundleSha256','adult','consent','firstExposure','startedAt','intervals','skills','comprehension','independentSuccess','criticalDefect','cognitiveLoad'];
function object(x:unknown):x is Record<string,unknown>{return !!x&&typeof x==='object'&&!Array.isArray(x);}
export function validateObservation(input:unknown):{valid:boolean;errors:string[]}{
 const errors:string[]=[];if(!object(input))return {valid:false,errors:['OBSERVATION_OBJECT']};
 const x=input as unknown as Observation;
 if(Object.keys(input).some(k=>!fields.includes(k)))errors.push('PRIVATE_OR_UNKNOWN_FIELD');
 if(x.provenance!=='SYNTHETIC')errors.push('REAL_DATA_NOT_AUTHORIZED');
 if(!/^P0[1-3]$/u.test(x.participant??''))errors.push('PSEUDONYM_ONLY');
 if(!bundles.some(b=>b.lesson===x.lesson&&b.reviewedBundleSha256===x.bundleSha256))errors.push('EXACT_VERSION_REQUIRED');
 if(x.adult!==true||x.consent!==true||x.firstExposure!==true)errors.push('ADULT_CONSENT_FIRST_EXPOSURE');
 if(!Number.isSafeInteger(x.startedAt)||x.startedAt<0)errors.push('START_TIME');
 if(!Number.isInteger(x.cognitiveLoad)||x.cognitiveLoad<1||x.cognitiveLoad>5)errors.push('LOAD_SCALE');
 if(!object(x.skills)||Object.keys(x.skills).length!==4||!['reading','listening','speaking','writing'].every(k=>x.skills[k as keyof typeof x.skills]===true))errors.push('FOUR_SKILL_TASK_COMPLETION');
 if(x.criticalDefect!==false)errors.push('CRITICAL_DEFECT_REVISE');
 if(!object(x.comprehension)||Object.keys(x.comprehension).length!==2||typeof x.comprehension.reading!=='boolean'||typeof x.comprehension.listening!=='boolean'||typeof x.independentSuccess!=='boolean')errors.push('OUTCOME_REQUIRED');
 let end=-1,active=0;
 if(!Array.isArray(x.intervals)||!x.intervals.length||x.intervals.length>500)errors.push('INTERVALS_REQUIRED');
 else for(const i of x.intervals){
  if(!object(i)||Object.keys(i).some(k=>!['start','end','kind','purposeful'].includes(k))||!Number.isSafeInteger(i.start)||!Number.isSafeInteger(i.end)||i.start<0||i.end<=i.start||i.start<end||!['active','wait','support','research'].includes(i.kind)||i.purposeful!==true){errors.push('INTERVAL_OVERLAP_PADDING_OR_INVALID');continue;}
  end=i.end;if(i.kind==='active')active+=i.end-i.start;
 }
 if(active>3600000)errors.push('ACTIVE_STOP_60_MINUTES');
 return {valid:errors.length===0,errors};
}
const median=(values:number[])=>{const s=[...values].sort((a,b)=>a-b);return s.length?(s[Math.floor(s.length/2)]!+s[Math.floor((s.length-1)/2)]!)/2:null;};
export function aggregateRehearsal(inputs:unknown[]){
 if(!Array.isArray(inputs)||inputs.length>24)throw Error('OBSERVATION_CAP');
 const valid=inputs.map(x=>{const v=validateObservation(x);if(!v.valid)throw Error(v.errors.join(';'));return x as Observation;});
 if(new Set(valid.map(x=>x.participant+':'+x.lesson)).size!==valid.length)throw Error('DUPLICATE_EXPOSURE');
 for(const p of ['P01','P02','P03']){const rows=valid.filter(x=>x.participant===p).sort((a,b)=>a.startedAt-b.startedAt);for(let i=0;i<rows.length;i++){if(i>0&&rows[i]!.startedAt-rows[i-1]!.startedAt<86400000)throw Error('SPACING_24H');if(bundles.findIndex(b=>b.lesson===rows[i]!.lesson)!==i)throw Error('PROGRESSION_ORDER');}}
 const minutes=(x:Observation,kind:string)=>x.intervals.filter(i=>i.kind===kind).reduce((n,i)=>n+i.end-i.start,0)/60000;
 return {status:'NOT_RUN',realObservations:0,syntheticObservations:valid.length,protocolApproval:'PENDING_SEPARATE_GATE_C_AUTHORITY',contractMinutes:45,readinessChanged:false,
  lessons:bundles.map(b=>{const rows=valid.filter(x=>x.lesson===b.lesson),active=rows.map(x=>minutes(x,'active')),activeMedianMinutes=median(active),load=median(rows.map(x=>x.cognitiveLoad));return {lesson:b.lesson,bundleSha256:b.reviewedBundleSha256,syntheticCount:rows.length,activeMedianMinutes,waitMedianMinutes:median(rows.map(x=>minutes(x,'wait'))),supportMedianMinutes:median(rows.map(x=>minutes(x,'support'))),researchMedianMinutes:median(rows.map(x=>minutes(x,'research'))),independentSuccesses:rows.filter(x=>x.independentSuccess).length,comprehensionSuccesses:rows.filter(x=>x.comprehension.reading&&x.comprehension.listening).length,loadMedian:load,proposedCriteriaMet:rows.length===3&&rows.filter(x=>x.independentSuccess).length>=2&&rows.filter(x=>x.comprehension.reading&&x.comprehension.listening).length>=2&&rows.filter(x=>x.skills.reading&&x.skills.listening).length>=2&&active.filter(n=>n>=35&&n<=50).length>=2&&activeMedianMinutes!==null&&activeMedianMinutes>=35&&activeMedianMinutes<=50&&load!==null&&load<=3};})};
}
