import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseLessonSource} from '@worklingo/content-format';
import {canonicalStudyManifest,type Session} from './gate-c-session.js';
const ROOT=resolve(__dirname,'../../../..');
const hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const requireValue=(ok:unknown,code:string):void=>{if(!ok)throw Error(code);};
type Activity={slug:string;activityType:string};
export type KitLesson=ReturnType<typeof canonicalStudyManifest>['lessons'][number]&{activities:Activity[];applicationBinding:null};
type AppBinding={lesson:string;sourceSha256:string;bundleSha256:string;audioSha256:string[];origin:string;lessonVersionId:string;sessionId:string;activities:(Activity&{id:string})[]};
const keys=(x:unknown,wanted:string)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===wanted;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Public blank engineering packet only. Does not create storage, consent, study authority or sessions. */
export function buildSessionKit(){
 const manifest=canonicalStudyManifest();
 const lessons:KitLesson[]=manifest.lessons.map(v=>{
  const source=readFileSync(resolve(ROOT,v.sourcePath));requireValue(hash(source)===v.sourceSha256,'KIT_SOURCE_DRIFT');
  const parsed=parseLessonSource(source.toString('utf8')).document;
  const activities=parsed.activities.map(a=>({slug:a.slug,activityType:a.activityType}));
  requireValue(activities.length===8&&new Set(activities.map(a=>a.slug)).size===8&&v.audio.length===3,'KIT_COVERAGE');
  return {...v,activities,applicationBinding:null};
 });
 requireValue(lessons.length===8&&new Set(lessons.map(v=>v.lesson)).size===8,'KIT_COVERAGE');
 return {schemaVersion:'beginner-gate-c-session-kit/1',status:'NEEDS_HUMAN_EVIDENCE',actualParticipants:0,actualObservations:0,requiredObservations:24,readinessChanged:false,
  protocol:manifest.protocol,lessons,participantSlots:['P01','P02','P03'],studyAuthority:null,privateStorageContract:null,consent:null,recordingConsent:null,
  applicationBindingStatus:'NOT_SUPPLIED',measurementStatus:'NOT_RUN',failureCategories:['CONTENT','UX','API','EVALUATOR','PARTICIPANT_SPECIFIC','UNKNOWN'],
  instructions:'See beginner-r12b-gate-c-session-kit.md; kit identities and structural validation do not approve a study or establish human evidence.'};
}
/** Both manifests must come from the approved operator workflow. Equality is not authentication. */
export function validateApplicationBinding(lesson:KitLesson,approved:unknown,observed:unknown){
 const canonical=buildSessionKit().lessons.find(l=>l.lesson===lesson.lesson);
 requireValue(same(lesson,canonical),'APPLICATION_BINDING_KIT_DRIFT');
 requireValue(keys(approved,'activities,audioSha256,bundleSha256,lesson,lessonVersionId,origin,sessionId,sourceSha256')&&keys(observed,'activities,audioSha256,bundleSha256,launchUrl,lesson,lessonVersionId,origin,sessionId,sourceSha256'),'APPLICATION_BINDING_SCHEMA');
 const a=approved as AppBinding,o=observed as AppBinding&{launchUrl:string};
 const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/u.test(v);
 requireValue(a.lesson===lesson.lesson&&a.sourceSha256===lesson.sourceSha256&&a.bundleSha256===lesson.bundleSha256&&same(a.audioSha256,lesson.audio.map(v=>v.sha256))&&uuid(a.lessonVersionId)&&uuid(a.sessionId),'APPLICATION_BINDING_VERSION');
 requireValue(Array.isArray(a.activities)&&a.activities.length===lesson.activities.length&&new Set(a.activities.map(v=>v?.id)).size===a.activities.length&&a.activities.every((v,i)=>keys(v,'activityType,id,slug')&&uuid(v.id)&&v.slug===lesson.activities[i]!.slug&&v.activityType===lesson.activities[i]!.activityType),'APPLICATION_BINDING_ACTIVITIES');
 let origin:URL,launch:URL;
 try{origin=new URL(a.origin);launch=new URL(o.launchUrl);}catch{throw Error('APPLICATION_BINDING_URL');}
 requireValue(a.origin===origin.origin&&!origin.username&&!origin.password&&(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname)))&&o.launchUrl===origin.origin+'/sessions/'+a.sessionId&&launch.origin===origin.origin,'APPLICATION_BINDING_URL');
 const {launchUrl:_url,...observedBinding}=o;
 requireValue(same(observedBinding,a),'APPLICATION_BINDING_MISMATCH');
 return {status:'STRUCTURE_MATCH_ONLY',humanEvidence:false,studyAuthorityVerified:false,readinessChanged:false};
}
/** Private sidecar ties a supplied application identity to one facilitator exposure. No I/O or authority grant. */
export function bindSessionEvidence(lesson:KitLesson,approved:unknown,observed:unknown,session:Session){
 validateApplicationBinding(lesson,approved,observed);
 requireValue(session.lesson===lesson.lesson&&session.bundleSha256===lesson.bundleSha256&&same(session.audioSha256,lesson.audio.map(a=>a.sha256))&&/^P0[1-3]$/u.test(session.slot)&&Number.isSafeInteger(session.startedAt)&&session.startedAt>=0&&['SYNTHETIC','REAL_FACILITATOR_REPORTED'].includes(session.provenance),'APPLICATION_BINDING_FACILITATOR');
 return {schemaVersion:'beginner-gate-c-private-binding/1',status:'STRUCTURE_MATCH_ONLY',humanEvidence:false,readinessChanged:false,
  application:structuredClone(observed as AppBinding&{launchUrl:string}),facilitator:{provenance:session.provenance,slot:session.slot,lesson:session.lesson,startedAt:session.startedAt,bundleSha256:session.bundleSha256,audioSha256:[...session.audioSha256]},
  privacy:'PRIVATE_OPERATOR_STORAGE_ONLY_NOT_AGGREGATE_EXPORT',authority:'NOT_VERIFIED_BY_THIS_STRUCTURAL_VALIDATOR'};
}
if(require.main===module){
 requireValue(process.argv.length===3&&process.argv[2]==='--build','BUILD_ONLY');
 const output=resolve(ROOT,'docs/qualification/beginner-r12b-gate-c-session-kit.json'),packet=buildSessionKit(),bytes=JSON.stringify(packet,null,2)+'\n';
 if(existsSync(output))requireValue(readFileSync(output,'utf8')===bytes,'KIT_OUTPUT_DRIFT');else writeFileSync(output,bytes,{flag:'wx'});
 console.log(JSON.stringify({lessons:packet.lessons.length,activities:packet.lessons.flatMap(l=>l.activities).length,actualObservations:0,readinessChanged:false}));
}
