import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as kit from './gate-c-session-kit.js';
import {createSession,type Authority} from './gate-c-session.js';
test('blank kit binds eight exact sources and 64 authored activities without invented app identifiers',()=>{
 const p=kit.buildSessionKit();assert.equal(p.lessons.length,8);assert.equal(p.lessons.flatMap(l=>l.activities).length,64);assert.equal(p.actualObservations,0);
 assert.equal(p.lessons[0]!.lesson,'MG01-L1');assert.equal(p.lessons[0]!.sourceSha256,'da7a962a6f49c5a37a8e6abf94f57d320095749807aee7b8087bbcea7e6834a7');
 assert.equal(p.lessons[0]!.activities[0]!.slug,'mg01-l1-r1');assert.ok(p.lessons.every(l=>l.applicationBinding===null&&l.audio.length===3));
});
test('session binding sidecar refuses a different facilitator lesson or audio and excludes participant outcomes',()=>{
 const l=kit.buildSessionKit().lessons[0]!;
 const a:Authority={provenance:'SYNTHETIC',studyApproved:false,storageApproved:false,privateRoot:null,versions:[{lesson:l.lesson,bundleSha256:l.bundleSha256,audioSha256:l.audio.map(v=>v.sha256)}]};
 const s=createSession(a,{slot:'P01',lesson:l.lesson,adult:true,vietnamese:true,absoluteBeginner:true,consent:true,firstExposure:true,bundleSha256:l.bundleSha256,audioSha256:l.audio.map(v=>v.sha256)},[],1000,0);
 const b={lesson:l.lesson,sourceSha256:l.sourceSha256,bundleSha256:l.bundleSha256,audioSha256:l.audio.map(v=>v.sha256),origin:'http://localhost:3000',lessonVersionId:'11111111-1111-4111-8111-111111111111',sessionId:'22222222-2222-4222-8222-222222222222',activities:l.activities.map((v,i)=>({...v,id:`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`}))};
 const observed={...b,launchUrl:b.origin+'/sessions/'+b.sessionId};
 assert.equal(typeof kit.bindSessionEvidence,'function');
 const sidecar=kit.bindSessionEvidence(l,b,observed,s);assert.equal(sidecar.application.sessionId,b.sessionId);assert.equal(sidecar.facilitator.startedAt,1000);assert.equal(sidecar.humanEvidence,false);assert.equal('outcome' in sidecar.facilitator,false);
 assert.throws(()=>kit.bindSessionEvidence(l,b,observed,{...s,lesson:'MG01-L2'}),/BINDING/);
 assert.throws(()=>kit.bindSessionEvidence(l,b,observed,{...s,audioSha256:[]}),/BINDING/);
});
test('app binding requires independently approved identity and exact observed session/version/activity/audio',()=>{
 const l=kit.buildSessionKit().lessons[0]!;
 const binding={lesson:l.lesson,sourceSha256:l.sourceSha256,bundleSha256:l.bundleSha256,audioSha256:l.audio.map(a=>a.sha256),origin:'http://localhost:3000',lessonVersionId:'11111111-1111-4111-8111-111111111111',sessionId:'22222222-2222-4222-8222-222222222222',activities:l.activities.map((a,i)=>({slug:a.slug,activityType:a.activityType,id:`33333333-3333-4333-8333-${String(i).padStart(12,'0')}`}))};
 const observed={...binding,launchUrl:'http://localhost:3000/sessions/22222222-2222-4222-8222-222222222222'};
 assert.equal(kit.validateApplicationBinding(l,binding,observed).status,'STRUCTURE_MATCH_ONLY');
 for(const edit of [(x:typeof observed)=>{x.sessionId='44444444-4444-4444-8444-444444444444';},(x:typeof observed)=>{x.lessonVersionId='44444444-4444-4444-8444-444444444444';},(x:typeof observed)=>{x.audioSha256=[];},(x:typeof observed)=>{x.launchUrl+='?token=private';},(x:typeof observed)=>{x.launchUrl='https://wrong.example/sessions/'+x.sessionId;},(x:typeof observed)=>{x.activities[1]!.id=x.activities[0]!.id;}]){const x=structuredClone(observed);edit(x);assert.throws(()=>kit.validateApplicationBinding(l,binding,x),/BINDING/);}
 assert.throws(()=>kit.validateApplicationBinding(l,null,observed),/BINDING/);
 assert.throws(()=>kit.validateApplicationBinding(l,binding,{...observed,answers:'private'}),/BINDING/);
 const stale=structuredClone(binding);stale.bundleSha256='a'.repeat(64);assert.throws(()=>kit.validateApplicationBinding(l,stale,{...stale,launchUrl:observed.launchUrl}),/BINDING/);
});
