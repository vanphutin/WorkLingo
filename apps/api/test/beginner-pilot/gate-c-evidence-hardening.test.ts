import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as gate from './gate-c-session.js';
const authority:gate.Authority={provenance:'SYNTHETIC',studyApproved:false,storageApproved:false,privateRoot:null,versions:[{lesson:'MG01-L1',bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)]}]};
test('terminal safety events at or beyond active cap remain excluded from completion',()=>{
 for(const now of [3600000,3600001])for(const code of ['WITHDRAWAL','DISTRESS','CRITICAL_DEFECT']){
  const s=gate.createSession(authority,{slot:'P01',lesson:'MG01-L1',adult:true,vietnamese:true,absoluteBeginner:true,consent:true,firstExposure:true,bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)]},[],1000,0);
  gate.transition(s,'event',now,code);
  assert.equal(s.stopReason,code);assert.deepEqual(s.events,[{code,at:now}]);assert.equal(s.totals.active,3600000);
  gate.finalize(s,{reading:true,listening:true,speaking:true,writing:true,independentSuccess:true,cognitiveLoad:2});
  const imported=gate.importCompleted(authority,[s]);assert.equal(gate.summarizeLesson('MG01-L1',imported).validCompleted,0);
 }
});
function completed(){const s=gate.createSession(authority,{slot:'P01',lesson:'MG01-L1',adult:true,vietnamese:true,absoluteBeginner:true,consent:true,firstExposure:true,bundleSha256:'a'.repeat(64),audioSha256:['b'.repeat(64)]},[],1000,0);gate.transition(s,'stop',100);return gate.finalize(s,{reading:true,listening:true,speaking:true,writing:true,independentSuccess:true,cognitiveLoad:2});}
test('import rejects terminal event hidden behind facilitator stop',()=>{
 for(const code of ['WITHDRAWAL','DISTRESS','CRITICAL_DEFECT']){const s=completed();s.events=[{code,at:50}];assert.throws(()=>gate.importCompleted(authority,[s]),/HISTORY/);}
});
test('import rejects invalid persisted kind, clock, event ordering and terminal totals',()=>{
 const edits:((s:gate.Session)=>void)[]=[s=>{s.kind='invalid' as never;},s=>{s.last=-1;},s=>{s.last=NaN;},s=>{s.totals.wait=101;},s=>{s.events=[{code:'HINT',at:101}];},s=>{s.events=[{code:'HINT',at:50},{code:'REPLAY',at:40}];},s=>{s.stopReason='ACTIVE_LIMIT';},s=>{s.stopReason='WITHDRAWAL';}];
 for(const edit of edits){const s=completed();edit(s);assert.throws(()=>gate.importCompleted(authority,[s]),/HISTORY/);}
});
test('legitimate withdrawn null outcomes and active cap survive import',()=>{
 const s=completed();s.status='RUNNING';s.outcome=null;s.last=0;s.totals.active=0;gate.transition(s,'event',100,'WITHDRAWAL');gate.finalize(s,{reading:null,listening:null,speaking:null,writing:null,independentSuccess:null,cognitiveLoad:null});
 const rows=gate.importCompleted(authority,[s]);assert.equal(gate.summarizeLesson('MG01-L1',rows).validCompleted,0);assert.equal(rows[0]!.stopReason,'WITHDRAWAL');
 const cap=completed();cap.stopReason='ACTIVE_LIMIT';cap.last=3600000;cap.totals.active=3600000;assert.equal(gate.importCompleted(authority,[cap]).length,1);
});
test('validated history can be revalidated without discarding terminal clock or pause category',()=>{
 const s=completed();s.kind='support';s.totals.active=40;s.totals.support=60;
 const once=gate.importCompleted(authority,[s]);assert.equal(once[0]!.last,100);assert.equal(once[0]!.kind,'support');assert.doesNotThrow(()=>gate.importCompleted(authority,once));
});
test('bundle hash must be lowercase SHA256 rather than arbitrary word characters',()=>{
 const a={...authority,versions:[{...authority.versions[0]!,bundleSha256:'_'.repeat(64)}]};assert.throws(()=>gate.createSession(a,{slot:'P01',lesson:'MG01-L1',adult:true,vietnamese:true,absoluteBeginner:true,consent:true,firstExposure:true,bundleSha256:'_'.repeat(64),audioSha256:['b'.repeat(64)]},[],1000,0),/VERSION/);
});
test('pure study manifest rejects duplicate and misassigned exact source/audio/version entries',()=>{
 // Missing validator is an explicit feature failure, rather than a fake study grant.
 assert.equal(typeof gate.validateStudyManifest,'function');
 const expected=gate.canonicalStudyManifest();
 const scope={protocol:expected.protocol,sourceFiles:expected.lessons.map(v=>({path:v.sourcePath,sha256:v.sourceSha256})),audioFiles:expected.lessons.flatMap(v=>v.audio),gateCStudy:{versions:expected.lessons.map(v=>({lesson:v.lesson,bundleSha256:v.bundleSha256,audioSha256:v.audio.map(a=>a.sha256)}))}};
 assert.doesNotThrow(()=>gate.validateStudyManifest(scope,expected));
 const badSource=structuredClone(scope);badSource.sourceFiles[1]=badSource.sourceFiles[0]!;assert.throws(()=>gate.validateStudyManifest(badSource,expected),/STUDY_VERSION/);
 const badAudio=structuredClone(scope);badAudio.audioFiles[1]=badAudio.audioFiles[0]!;assert.throws(()=>gate.validateStudyManifest(badAudio,expected),/STUDY_VERSION/);
 const badVersion=structuredClone(scope);badVersion.gateCStudy.versions[0]!.audioSha256=badVersion.gateCStudy.versions[1]!.audioSha256;assert.throws(()=>gate.validateStudyManifest(badVersion,expected),/STUDY_VERSION/);
 const badProtocol=structuredClone(scope);badProtocol.protocol.path='package.json';assert.throws(()=>gate.validateStudyManifest(badProtocol,expected),/STUDY_VERSION/);
});
