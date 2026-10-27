import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {analyzeLessonSource,parseLessonSource} from '@worklingo/content-format';
import {buildBeginnerDraftSnapshot} from '../../src/curriculum-foundation/application/foundation-validation.js';
import {projectLearnerActivity} from '../../src/learning-sessions/domain/learner-activity-projection.js';
import {resolveBeginnerRubric} from '../../src/teacher-ai/domain/beginner-rubrics.js';

type Check='PASS'|'FAIL'|'NOT_RUN';
const lessonCodes=['MG01-L1','MG01-L2','MG01-L3','MG01-L4','MG02-L1','MG02-L2','MG02-L3','MG02-L4'] as const;
const skills=['reading','listening','speaking','writing'] as const;
interface LessonQualification {
 code:string;sourceSha256:string;technicalStatus:'PASS'|'FAIL';issues:string[];
 checks:Record<'parser'|'planner'|'objectives'|'rubrics'|'redaction'|'listeningBindings',Check>;
 skills:Record<typeof skills[number],number>;activities:number;objectives:number;listeningScripts:number;
 audioStatus:'NEEDS_AUDIO';reviewer:null;rehearsal:'TIMING_NOT_VERIFIED';contentReadiness:'NOT_READY';
}
export interface PilotQualification {
 offlineStatus:'PASS'|'FAIL';contentReadiness:'NOT_READY';missingLessonCodes:string[];inputIssues:string[];
 counts:{lessons:number;activities:number;objectives:number;listeningScripts:number};lessons:LessonQualification[];
}
function privateKeys(value:unknown):boolean{
 if(!value||typeof value!=='object')return false;
 return Object.entries(value).some(([key,v])=>['answer','answerIndex','correctAnswer','sampleAnswer','explanation','evidence','rubric','rubricId','rubricVersion','audioText','requiredPhrases'].includes(key)||privateKeys(v));
}
function visibleStrings(value:unknown):string[]{
 if(typeof value==='string')return [value];
 return value&&typeof value==='object'?Object.values(value).flatMap(visibleStrings):[];
}
const normalized=(s:string)=>s.normalize('NFKC').replace(/\s+/gu,' ').trim();
export function qualifyPilotSources(sources:readonly {code:string;rawSource:string}[]):PilotQualification{
 const seen=new Set<string>(),inputIssues:string[]=[];
 const lessons=sources.map(({code,rawSource}):LessonQualification=>{
  const row:LessonQualification={code,sourceSha256:createHash('sha256').update(rawSource).digest('hex'),technicalStatus:'FAIL',issues:[],checks:{parser:'NOT_RUN',planner:'NOT_RUN',objectives:'NOT_RUN',rubrics:'NOT_RUN',redaction:'NOT_RUN',listeningBindings:'NOT_RUN'},skills:{reading:0,listening:0,speaking:0,writing:0},activities:0,objectives:0,listeningScripts:0,audioStatus:'NEEDS_AUDIO',reviewer:null,rehearsal:'TIMING_NOT_VERIFIED',contentReadiness:'NOT_READY'};
  if(seen.has(code))inputIssues.push('DUPLICATE_LESSON:'+code);seen.add(code);
  if(!lessonCodes.some(c=>c===code)){row.issues.push('UNKNOWN_LESSON_CODE');inputIssues.push('UNKNOWN_LESSON:'+code);return row;}
  const parsed=parseLessonSource(rawSource).document,analysis=analyzeLessonSource(rawSource);
  row.activities=parsed.activities.length;row.objectives=parsed.objectives?.length??0;row.listeningScripts=parsed.audioScripts.length;
  for(const skill of skills)row.skills[skill]=parsed.activities.filter(a=>a.activityType===skill).length;
  row.checks.parser=analysis.canPublish&&!analysis.issuesTruncated&&parsed.formatVersion==='WorkLingoLesson/1.2'?'PASS':'FAIL';
  row.issues.push(...analysis.issues.filter(i=>i.severity==='error').slice(0,10).map(i=>i.code+':'+i.message));
  if(parsed.lesson?.slug!==code.toLowerCase()){row.issues.push('LESSON_CODE_SOURCE_MISMATCH');row.checks.parser='FAIL';}
  const objectives=parsed.objectives??[];
  row.checks.objectives=objectives.length===4&&skills.every(skill=>objectives.filter(o=>o.skills.length===1&&o.skills[0]===skill&&o.required==='true').length===1)&&parsed.activities.every(a=>a.objectiveRefs?.length===1&&objectives.some(o=>o.slug===a.objectiveRefs![0]&&o.skills.length===1&&o.skills[0]===a.activityType))?'PASS':'FAIL';
  const listening=parsed.activities.filter(a=>a.activityType==='listening');
  row.checks.listeningBindings=parsed.audioScripts.length===3&&listening.length===3&&new Set(listening.map(a=>a.audioRef)).size===3&&listening.every(a=>{
   const script=parsed.audioScripts.find(s=>s.slug===a.audioRef);
   return script&&a.evidence.length>0&&a.evidence.every(e=>{const match=/^([^:]+):([1-9]\d*)$/u.exec(e);return match?.[1]===script.slug&&Boolean(script.script.split('\n')[Number(match?.[2])-1]?.trim());});
  })?'PASS':'FAIL';
  try{
   for(const a of parsed.activities.filter(a=>a.activityType==='speaking'||a.activityType==='writing'))resolveBeginnerRubric(a.rubricId??'',a.rubricVersion??'',a.activityType);
   row.checks.rubrics=parsed.activities.filter(a=>a.activityType==='speaking'||a.activityType==='writing').length===2?'PASS':'FAIL';
  }catch{row.checks.rubrics='FAIL';}
  if(analysis.normalizedDraft&&row.checks.parser==='PASS'){
   try{
    // Existing builder creates ephemeral snapshot identities in memory and runs the exact-version planner.
    // They are never persisted, emitted as publication IDs or attached to media.
    const snapshot=buildBeginnerDraftSnapshot(analysis.normalizedDraft);row.checks.planner='PASS';
    row.checks.redaction='PASS';
    const secrets=[...parsed.audioScripts.map(s=>s.script),...parsed.activities.flatMap(a=>[a.sampleAnswer??'',a.rubric??''])];
    for(const a of snapshot.activities){
     const dto=projectLearnerActivity(snapshot,a.id),visible=visibleStrings(dto).map(normalized);
     if(privateKeys(dto)||(a.activityType==='listening'&&('audioText'in dto||dto.content.length>0))||secrets.some(s=>normalized(s).length>=12&&visible.some(v=>v.includes(normalized(s)))))row.checks.redaction='FAIL';
    }
   }catch(e){row.checks.planner='FAIL';row.issues.push(e instanceof Error?e.message:'SNAPSHOT_FAILED');}
  }
  for(const [check,result]of Object.entries(row.checks))if(result!=='PASS')row.issues.push(check+':'+result);
  row.issues=[...new Set(row.issues)].slice(0,10);row.technicalStatus=Object.values(row.checks).every(s=>s==='PASS')?'PASS':'FAIL';return row;
 });
 const missingLessonCodes=lessonCodes.filter(c=>!seen.has(c));
 return {offlineStatus:lessons.length===8&&!missingLessonCodes.length&&!inputIssues.length&&lessons.every(l=>l.technicalStatus==='PASS')?'PASS':'FAIL',contentReadiness:'NOT_READY',missingLessonCodes,inputIssues,counts:{lessons:lessons.length,activities:lessons.reduce((n,l)=>n+l.activities,0),objectives:lessons.reduce((n,l)=>n+l.objectives,0),listeningScripts:lessons.reduce((n,l)=>n+l.listeningScripts,0)},lessons};
}

if(require.main===module){
 const args=process.argv.slice(2),single=args.length===2&&args[0]==='--lesson'&&args[1]==='mg01-l1',all=args.length===1&&args[0]==='--all';
 if(!single&&!all){console.error('EXACT_ARGV_REQUIRED: --lesson mg01-l1 | --all');process.exitCode=1;}
 else{
  const root=path.resolve(__dirname,'../../../..');
  try{
   const selected=single?lessonCodes.slice(0,1):lessonCodes;
   const sources=selected.map(code=>({code,rawSource:readFileSync(path.join(root,'content/beginner/pilot',code.toLowerCase()+'.lesson.txt'),'utf8')}));
   const result=qualifyPilotSources(sources);console.log(JSON.stringify(result,null,2));
   if(single?result.lessons[0]?.technicalStatus!=='PASS':result.offlineStatus!=='PASS')process.exitCode=1;
  }catch(error){console.error(error instanceof Error?error.message:'SOURCE_READ_FAILED');process.exitCode=1;}
 }
}
