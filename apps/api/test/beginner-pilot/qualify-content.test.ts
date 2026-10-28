import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {qualifyPilotSources} from './qualify-content.js';
import {syntheticBeginnerSource} from '../fixtures/beginner/authoring/fixture-factory.js';
import {analyzeLessonSource,parseLessonSource} from '@worklingo/content-format';
import {buildBeginnerDraftSnapshot} from '../../src/curriculum-foundation/application/foundation-validation.js';
import {projectLearnerActivity} from '../../src/learning-sessions/domain/learner-activity-projection.js';
const source=(code:string)=>readFileSync(path.resolve(__dirname,'../../../../content/beginner/pilot',code+'.lesson.txt'),'utf8');

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
test('case changes do not hide a complete transcript from the leakage check',()=>{
 const s=checkerFixture(),script=s.match(/\[AUDIO_SCRIPT test-call-1\][\s\S]*?<<<\n([\s\S]*?)\n>>>/u)![1]!;
 const changed=s+'\n[INSTRUCTION leaked-case]\nphase: readDecode\norder: 9\ntext: '+script.toUpperCase()+'\n[/INSTRUCTION]';
 assert.equal(one(changed).lessons[0]!.checks.redaction,'FAIL');
});
test('three references cannot qualify one cloned listening script body',()=>{
 const s=checkerFixture(),body='Hello. I am the same synthetic voice in every recording.';
 const changed=s.replace(/(\[AUDIO_SCRIPT [^\]]+\][\s\S]*?<<<\n)[\s\S]*?(\n>>>)/gu,(_m,start,end)=>start+body+end);
 assert.equal(one(changed).lessons[0]!.checks.listeningBindings,'FAIL');
});
test('all16 learner response prompts preserve the complete authored task instructions',()=>{
 for(const unit of ['mg01','mg02'])for(const n of [1,2,3,4]){
  const raw=source(unit+'-l'+n),doc=parseLessonSource(raw).document,analysis=analyzeLessonSource(raw);assert.ok(analysis.normalizedDraft);
  const snapshot=buildBeginnerDraftSnapshot(analysis.normalizedDraft);
  for(const a of doc.activities.filter(a=>a.activityType==='speaking'||a.activityType==='writing')){
   const normalized=snapshot.activities.find(s=>s.slug===a.slug)!;
   assert.equal(projectLearnerActivity(snapshot,normalized.id).payload?.prompt,a.prompt,a.slug+' loses requirements during normalization');
  }
 }
});
test('singular listening items cannot be solved by choosing the only singular option',()=>{
 for(const [code,slug]of [['mg02-l1','mg02-l1-l2'],['mg02-l2','mg02-l2-l3']]){
  const a=parseLessonSource(source(code!)).document.activities.find(a=>a.slug===slug)!;
  assert.ok(a.options.filter(o=>/^an?\s/iu.test(o.text)).length>1,a.slug+' reveals the answer before audio');
 }
});
test('accepted contractions and short meaningful requests are not forced to pad output',()=>{
 const alternatives:Record<string,string>={
  'mg01-l1-s1':"Hello. I'm Lucy. I'm from Los Angeles. You are Leo.",'mg01-l1-w1':"Hello. I'm Adam. I'm from London.",
  'mg01-l2-s1':"Hello. I'm Emma. I'm from London. E-M-M-A.",'mg01-l2-w1':"I'm Mia. I'm from Los Angeles. M-I-A.",
  'mg01-l3-s1':"Hello. I'm Sam. I'm from New York. You are Kim.",'mg01-l3-w1':"Hello. I'm Eva. I'm from London. You are Noah.",
  'mg01-l4-s1':"Hello. I'm Mia. I'm from London. You are Jo.",'mg01-l4-w1':"Hello. I'm Ben. I'm from New York. You are Lucy.",
  'mg02-l2-s1':'A pen. Two books. A bag.','mg02-l2-w1':'Two pens. A book. A bag.',
  'mg02-l3-w1':'This is a book. A bag. Two pens.','mg02-l4-w1':'This is a bag. Three pens. A book.'};
 for(const [slug,answer]of Object.entries(alternatives)){
  const a=parseLessonSource(source(slug.slice(0,7))).document.activities.find(a=>a.slug===slug)!;
  assert.ok(a.minWords!<=answer.split(/\s+/u).length,slug+' rejects a complete accepted alternative');
 }
});
test('MG02-L3 transfer needs its own card and no verbatim correct answer in attached glossary examples',()=>{
 const doc=parseLessonSource(source('mg02-l3')).document,a=doc.activities.find(a=>a.slug==='mg02-l3-r2')!;
 const answer=a.options.find(o=>o.label===a.answer)!.text;
 const blocks=doc.wordBanks.flatMap(b=>b.languageBlocks).filter(b=>a.languageBlockRefs.includes(b.slug));
 assert.ok(!blocks.flatMap(b=>b.examples).includes(answer));
 const prior=parseLessonSource(source('mg02-l1')).document.activities.find(a=>a.slug==='mg02-l1-r2')!;
 assert.notEqual(answer,prior.options.find(o=>o.label===prior.answer)!.text);
});
test('MG02-L3 assesses the claimed near/far distinction in a listening task',()=>{
 const doc=parseLessonSource(source('mg02-l3')).document;
 assert.ok(doc.activities.some(a=>a.activityType==='listening'&&/\bnear\b|\bfar\b/iu.test(a.question??'')));
});
test('MG01-L2 writing rubric names the current speaking card when warning against copying it',()=>{
 const doc=parseLessonSource(source('mg01-l2')).document;
 const card=doc.contents.find(c=>c.slug==='mg01-l2-speaking-card')!.text;
 const name=card.match(/^Name: (.+)$/mu)![1]!;
 assert.ok(doc.activities.find(a=>a.slug==='mg01-l2-w1')!.rubric!.includes(name+'/London'));
});
test('qualifies the real pilot once all8 sources exist; never substitutes checker fixtures for missing lessons',()=>{
 const root=path.resolve(__dirname,'../../../..');
 const codes=['MG01-L1','MG01-L2','MG01-L3','MG01-L4','MG02-L1','MG02-L2','MG02-L3','MG02-L4'];
 const sources=codes.flatMap(code=>{const file=path.join(root,'content/beginner/pilot',code.toLowerCase()+'.lesson.txt');return existsSync(file)?[{code,rawSource:readFileSync(file,'utf8')}]:[];});
 const q=qualifyPilotSources(sources);assert.equal(q.counts.lessons,sources.length);
 assert.equal(sources.length,8,'Real source files are required; fixtures do not fill missing lessons');
 assert.equal(q.offlineStatus,'PASS',JSON.stringify(q.lessons.map(l=>({code:l.code,issues:l.issues}))));assert.deepEqual(q.counts,{lessons:8,activities:64,objectives:32,listeningScripts:24});assert.equal(q.contentReadiness,'NOT_READY');
});
