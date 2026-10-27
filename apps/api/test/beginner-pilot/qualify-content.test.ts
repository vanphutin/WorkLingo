import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {qualifyPilotSources} from './qualify-content.js';
import {syntheticBeginnerSource} from '../fixtures/beginner/authoring/fixture-factory.js';

// Test fixtures exercise the checker; none is an authored pilot deliverable.
function checkerFixture():string{
 let s=syntheticBeginnerSource().replace('slug: handling-customer-complaints','slug: mg01-l1');
 s=s.replace(/\[OBJECTIVE explain-complaint\][\s\S]*?\[\/OBJECTIVE\]/u,
  ['reading','listening','speaking','writing'].map(skill=>`[OBJECTIVE mg01-l1-${skill}]\nstatement: Synthetic ${skill} boundary task.\nskills: ${skill}\nrequired: true\n[/OBJECTIVE]`).join('\n'));
 s=s.replace(/\[ACTIVITY [^\]]+\][\s\S]*?\[\/ACTIVITY\]/gu,section=>{
  const skill=section.match(/activity_type: (\w+)/u)![1]!;
  return section.replace('objective_refs: explain-complaint','objective_refs: mg01-l1-'+skill);
 });
 // Give each listening task distinct source evidence rather than cloning a script reference.
 let index=0;const originals=s.match(/\[AUDIO_SCRIPT complaint-call\][\s\S]*?\[\/AUDIO_SCRIPT\]/u)![0];
 s=s.replace(/\[ACTIVITY [^\]]+\][\s\S]*?\[\/ACTIVITY\]/gu,section=>{
  if(!section.includes('activity_type: listening'))return section;
  index++;const slug='test-call-'+index;
  const script=originals.replaceAll('complaint-call',slug).replace('Hello,','Hello '+index+',');
  return script+'\n'+section.replaceAll('complaint-call',slug);
 });
 return s.replace(originals,'');
}
const one=(s=checkerFixture())=>qualifyPilotSources([{code:'MG01-L1',rawSource:s}]);
test('rejects missing expected lessons instead of claiming the full pilot is complete',()=>{
 const q=qualifyPilotSources([]);assert.equal(q.offlineStatus,'FAIL');assert.equal(q.missingLessonCodes.length,8);assert.equal(q.counts.lessons,0);
});
test('uses the real parser/planner/rubrics/projection and never promotes text to audio or human readiness',()=>{
 const q=one();const row=q.lessons[0]!;
 assert.equal(row.technicalStatus,'PASS',JSON.stringify(row.issues));
 assert.deepEqual(row.skills,{reading:3,listening:3,speaking:1,writing:1});
 assert.equal(row.objectives,4);assert.equal(row.listeningScripts,3);
 assert.equal(row.audioStatus,'NEEDS_AUDIO');assert.equal(row.rehearsal,'TIMING_NOT_VERIFIED');assert.equal(row.reviewer,null);assert.equal(row.contentReadiness,'NOT_READY');
 assert.equal(q.offlineStatus,'FAIL');assert.equal(q.missingLessonCodes.length,7);assert.match(row.sourceSha256,/^[a-f0-9]{64}$/u);
});
test('rejects malformed format, duration, seven/nine tasks and unknown rubric',()=>{
 const s=checkerFixture(),activity=s.match(/\[ACTIVITY [^\]]+\][\s\S]*?\[\/ACTIVITY\]/u)![0];
 for(const altered of [s.replace('WorkLingoLesson/1.2','WorkLingoLesson/1.0'),s.replace('duration_minutes: 45','duration_minutes: 60'),s.replace(activity,''),s+'\n'+activity.replace(/\[ACTIVITY ([^\]]+)\]/u,'[ACTIVITY extra-task]'),s.replace('rubric_version: 1','rubric_version: 999')]){
  assert.equal(one(altered).lessons[0]!.technicalStatus,'FAIL');
 }
});
test('rejects missing, duplicate or cross-skill objectives and unassessed references',()=>{
 const s=checkerFixture();
 for(const altered of [s.replace(/\[OBJECTIVE mg01-l1-reading\][\s\S]*?\[\/OBJECTIVE\]/u,''),s+'\n'+s.match(/\[OBJECTIVE mg01-l1-reading\][\s\S]*?\[\/OBJECTIVE\]/u)![0],s.replace('skills: reading\nrequired: true','skills: reading | speaking\nrequired: true'),s.replace('objective_refs: mg01-l1-reading','objective_refs: unknown-objective')])assert.equal(one(altered).lessons[0]!.technicalStatus,'FAIL');
});
test('rejects unresolved, shared or extra listening scripts and impossible evidence lines',()=>{
 const s=checkerFixture();
 for(const altered of [s.replace('audio_ref: test-call-1','audio_ref: absent'),s.replaceAll('test-call-2','test-call-1'),s.replace('test-call-1:1','test-call-1:999'),s+'\n[AUDIO_SCRIPT unused]\nscript:\n<<<\nUnused voice.\n>>>\n[/AUDIO_SCRIPT]'])assert.equal(one(altered).lessons[0]!.technicalStatus,'FAIL');
});
test('rejects duplicate lesson input and a source bound to the wrong editorial code',()=>{
 const s=checkerFixture();assert.equal(qualifyPilotSources([{code:'MG01-L1',rawSource:s},{code:'MG01-L1',rawSource:s}]).offlineStatus,'FAIL');assert.equal(qualifyPilotSources([{code:'MG02-L1',rawSource:s}]).lessons[0]!.technicalStatus,'FAIL');
});
test('rejects a listening transcript exposed through an earlier reading instruction',()=>{
 const s=checkerFixture(),script=s.match(/\[AUDIO_SCRIPT test-call-1\][\s\S]*?<<<\n([\s\S]*?)\n>>>/u)![1]!;
 const altered=s+'\n[INSTRUCTION leaked-listening]\nphase: readDecode\norder: 9\ntext: '+script+'\n[/INSTRUCTION]';
 assert.equal(one(altered).lessons[0]!.checks.redaction,'FAIL');
});
test('qualifies the real pilot once all8 sources exist; never substitutes checker fixtures for missing lessons',()=>{
 const root=path.resolve(__dirname,'../../../..');
 const codes=['MG01-L1','MG01-L2','MG01-L3','MG01-L4','MG02-L1','MG02-L2','MG02-L3','MG02-L4'];
 const sources=codes.flatMap(code=>{const file=path.join(root,'content/beginner/pilot',code.toLowerCase()+'.lesson.txt');return existsSync(file)?[{code,rawSource:readFileSync(file,'utf8')}]:[];});
 const q=qualifyPilotSources(sources);assert.equal(q.counts.lessons,sources.length);
 if(sources.length===8){assert.equal(q.offlineStatus,'PASS',JSON.stringify(q.lessons.map(l=>({code:l.code,issues:l.issues}))));assert.deepEqual(q.counts,{lessons:8,activities:64,objectives:32,listeningScripts:24});assert.equal(q.contentReadiness,'NOT_READY');}
 else{assert.equal(q.offlineStatus,'FAIL');assert.ok(q.missingLessonCodes.length>0);}
});
