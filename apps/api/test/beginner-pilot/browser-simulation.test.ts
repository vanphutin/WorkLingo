/* eslint-disable @typescript-eslint/no-explicit-any -- Assertions inspect heterogeneous mock wire DTOs. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BrowserSimulation} from './browser-simulation.js';

test('canonical eight sources produce24isolated source-bound learner sessions',async()=>{
 const sim=new BrowserSimulation();assert.equal(sim.seeds.length,24);assert.equal(new Set(sim.seeds.map(s=>s.sessionId)).size,24);
 assert.equal(new Set(sim.seeds.map(s=>s.sourceSha256)).size,8);
 for(const seed of sim.seeds){const result=await sim.handle('GET','/api/v1/learning-sessions/'+seed.sessionId,seed.namespace);assert.equal(result.status,200);assert.equal((result.body as any).plan.blocks.flatMap((b:any)=>b.activityIds).length,8);}
});
test('unknown and cross namespace requests fail closed',async()=>{
 const sim=new BrowserSimulation(),a=sim.seeds[0]!,b=sim.seeds[8]!;
 assert.equal((await sim.handle('GET','/api/v1/not-real',a.namespace)).status,404);
 assert.equal((await sim.handle('GET','/api/v1/learning-sessions/'+a.sessionId,b.namespace)).status,403);
 assert.equal((await sim.handle('GET','/api/v1/me','')).status,401);
});
test('draft revision and session progression enforce real ordering and preserve text',async()=>{
 const sim=new BrowserSimulation(),s=sim.seeds[0]!,ids=s.activities.map(a=>a.id),path='/api/v1/learning-sessions/'+s.sessionId;
 const draft=path+'/activities/'+ids[7]+'/draft';
 assert.equal((await sim.handle('PUT',draft,s.namespace,{expectedRevision:0,text:'My synthetic draft'})).status,200);
 assert.equal((await sim.handle('PUT',draft,s.namespace,{expectedRevision:0,text:'stale'})).status,409);
 assert.equal((await sim.handle('GET',draft,s.namespace)).body.text,'My synthetic draft');
 await sim.handle('POST',path+'/start',s.namespace);
 assert.equal((await sim.handle('POST','/api/v1/activities/'+ids[0]+'/attempts',s.namespace,{sessionId:s.sessionId,clientAttemptId:crypto.randomUUID(),response:{answerIndexes:[999]}})).status,400);
 await sim.handle('POST',path+'/start',s.namespace);
 for(const activity of s.activities){const response=activity.activityType==='reading'||activity.activityType==='listening'?{answerIndexes:(activity.payload.questions as any[]).map(()=>0)}:{text:'Synthetic browser response only'};const r=await sim.handle('POST','/api/v1/activities/'+activity.id+'/attempts',s.namespace,{sessionId:s.sessionId,clientAttemptId:crypto.randomUUID(),response});assert.equal(r.status,200);}
 const done=await sim.handle('GET',path,s.namespace);assert.equal(done.body.status,'completed');assert.equal(done.body.currentCheckpoint,8);
});
test('learner projection never exposes answer keys or private criteria',()=>{
 const sim=new BrowserSimulation();for(const s of sim.seeds)for(const a of s.activities){const raw=JSON.stringify(a);for(const key of ['answerIndex"','sampleAnswer"','rubricId"','taskCriteria"','requiredPhrases"'])assert.equal(raw.includes(key),false,key);}
});


test('recording requires explicit synthetic audio and policy consent at the speaking checkpoint',async()=>{
 const sim=new BrowserSimulation(),s=sim.seeds[0]!;await sim.handle('POST','/api/v1/learning-sessions/'+s.sessionId+'/start',s.namespace);
 for(const a of s.activities.slice(0,6))await sim.handle('POST','/api/v1/activities/'+a.id+'/attempts',s.namespace,{sessionId:s.sessionId,clientAttemptId:crypto.randomUUID(),response:{answerIndexes:(a.payload.questions as any[]).map(()=>0)}});
 const url='/api/v1/activities/'+s.activities[6]!.id+'/recordings',body={sessionId:s.sessionId,clientAttemptId:crypto.randomUUID(),audioBytes:20,audioSha256:'a'.repeat(64),consentPolicyVersion:'recording-v1',consentScope:'teacher-ai'};
 assert.equal((await sim.handle('POST',url,s.namespace,body)).status,400);
 assert.equal((await sim.handle('POST',url,s.namespace,{...body,consentAccepted:'true'})).body.status,'processing');
});
test('frontend dashboard overview exposes synthetic progress without readiness claims',async()=>{
 const {dashboardOverviewSchema}=await import('@worklingo/contracts');const sim=new BrowserSimulation();const r=await sim.handle('GET','/api/v1/me/dashboard/overview',sim.seeds[0]!.namespace);assert.equal(r.status,200);assert.doesNotThrow(()=>dashboardOverviewSchema.parse(r.body));
});

test('actual loopback HTTP serves cookie launch and hash-bound WAV with no upstream fallback',async()=>{
 const {startSimulationServer}=await import('./browser-simulation.test-server.js');const {server,simulation}=startSimulationServer(0);await new Promise<void>(r=>server.once('listening',r));
 try{const address=server.address() as {port:number},base='http://127.0.0.1:'+address.port;const seed=simulation.seeds[0]!;
 const launch=await fetch(base+seed.sessionUrl,{redirect:'manual'});assert.equal(launch.status,302);const cookie=launch.headers.get('set-cookie')!.split(';')[0]!;assert.match(cookie,/WL_SIMULATION_ONLY=P01-MG01-L1/);
 const session=await fetch(base+'/api/v1/learning-sessions/'+seed.sessionId,{headers:{cookie}});assert.equal(session.status,200);
 const audio=await fetch(base+'/api/v1/learning-sessions/'+seed.sessionId+'/activities/'+seed.activities[3]!.id+'/audio',{headers:{cookie}});assert.equal(audio.status,200);assert.equal(audio.headers.get('content-type'),'audio/wav');assert.equal(Buffer.from(await audio.arrayBuffer()).subarray(0,4).toString(),'RIFF');
 const unknown=await fetch(base+'/api/v1/not-a-route',{headers:{cookie}});assert.equal(unknown.status,404);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});

test('replayed attempt is idempotent after checkpoint advances and mismatched reuse is denied',async()=>{
 const sim=new BrowserSimulation(),s=sim.seeds[0]!,a=s.activities[0]!,url='/api/v1/activities/'+a.id+'/attempts',body={sessionId:s.sessionId,clientAttemptId:crypto.randomUUID(),response:{answerIndexes:[0]}};
 await sim.handle('POST','/api/v1/learning-sessions/'+s.sessionId+'/start',s.namespace);
 const first=await sim.handle('POST',url,s.namespace,body);const again=await sim.handle('POST',url,s.namespace,body);assert.equal(again.status,200);assert.equal(again.body.id,first.body.id);
 const changed=await sim.handle('POST',url,s.namespace,{...body,response:{answerIndexes:[1]}});assert.equal(changed.status,409);
});

test('session creation validates45minutes and never resets an existing namespace',async()=>{
 const sim=new BrowserSimulation(),s=sim.seeds[0]!;
 assert.equal((await sim.handle('POST','/api/v1/learning-sessions',s.namespace,{clientSessionId:crypto.randomUUID(),durationMinutes:60})).status,400);
 const created=await sim.handle('POST','/api/v1/learning-sessions',s.namespace,{clientSessionId:crypto.randomUUID(),durationMinutes:45});assert.equal(created.status,200);assert.equal(created.body.id,s.sessionId);
});

test('objective mock score reflects canonical answer key instead of flat positive feedback',async()=>{
 for(const correct of [false,true]){const sim=new BrowserSimulation(),s=sim.seeds[0]!,a=s.snapshot.activities[0]!;if(a.activityType!=='reading')throw Error('fixture');const key=a.payload.questions[0]!.answerIndex;await sim.handle('POST','/api/v1/learning-sessions/'+s.sessionId+'/start',s.namespace);const result=await sim.handle('POST','/api/v1/activities/'+a.id+'/attempts',s.namespace,{sessionId:s.sessionId,clientAttemptId:crypto.randomUUID(),response:{answerIndexes:[correct?key:(key+1)%a.payload.questions[0]!.options.length]}});assert.equal(result.body.score,correct?1:0);}
});


test('multipart HTTP recording rejects absent consent and accepts synthetic Blob only',async()=>{
 const {startSimulationServer}=await import('./browser-simulation.test-server.js');const {server,simulation}=startSimulationServer(0);await new Promise<void>(r=>server.once('listening',r));
 try{const base='http://127.0.0.1:'+(server.address() as {port:number}).port,s=simulation.seeds[0]!,cookie='WL_SIMULATION_ONLY='+s.namespace;
 await simulation.handle('POST','/api/v1/learning-sessions/'+s.sessionId+'/start',s.namespace);
 for(const a of s.activities.slice(0,6))await simulation.handle('POST','/api/v1/activities/'+a.id+'/attempts',s.namespace,{sessionId:s.sessionId,clientAttemptId:crypto.randomUUID(),response:{answerIndexes:(a.payload.questions as any[]).map(()=>0)}});
 const form=new FormData();form.set('audio',new Blob(['SYNTHETIC_NOT_HUMAN'],{type:'audio/webm'}),'synthetic.webm');form.set('sessionId',s.sessionId);form.set('clientAttemptId',crypto.randomUUID());form.set('consentPolicyVersion','recording-v1');form.set('consentScope','teacher-ai');
 const url=base+'/api/v1/activities/'+s.activities[6]!.id+'/recordings';assert.equal((await fetch(url,{method:'POST',headers:{cookie},body:form})).status,400);
 form.set('consentAccepted','true');const response=await fetch(url,{method:'POST',headers:{cookie},body:form});assert.equal(response.status,200);const {recordingSubmissionResultSchema}=await import('@worklingo/contracts');const result=await response.json();assert.doesNotThrow(()=>recordingSubmissionResultSchema.parse(result)); const retry=await fetch(url,{method:'POST',headers:{cookie},body:form});assert.equal(retry.status,200);assert.deepEqual(await retry.json(),result);
 assert.equal(Buffer.byteLength('SYNTHETIC_NOT_HUMAN'),Buffer.byteLength('SYNTHETIC_NEW_BYTES'));
 form.set('audio',new Blob(['SYNTHETIC_NEW_BYTES'],{type:'audio/webm'}),'synthetic.webm');assert.equal((await fetch(url,{method:'POST',headers:{cookie},body:form})).status,409);
 form.set('consentAccepted','false');assert.equal((await fetch(url,{method:'POST',headers:{cookie},body:form})).status,400);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});


test('progress aggregates completed lessons of one persona and isolates other personas',async()=>{
 const sim=new BrowserSimulation();for(const s of sim.seeds.filter(s=>s.persona==='P01').slice(0,3)){await sim.handle('POST','/api/v1/learning-sessions/'+s.sessionId+'/start',s.namespace);for(const a of s.activities){const response=a.activityType==='reading'||a.activityType==='listening'?{answerIndexes:(a.payload.questions as any[]).map(()=>0)}:{text:'Synthetic response'};assert.equal((await sim.handle('POST','/api/v1/activities/'+a.id+'/attempts',s.namespace,{sessionId:s.sessionId,clientAttemptId:crypto.randomUUID(),response})).status,200);}}
 const p1=await sim.handle('GET','/api/v1/me/progress',sim.seeds[0]!.namespace);assert.equal(p1.body.completedActivities,24);assert.equal(p1.body.sessions.completed,3);
 const p2=await sim.handle('GET','/api/v1/me/progress',sim.seeds[8]!.namespace);assert.equal(p2.body.completedActivities,0);assert.equal(p2.body.sessions.completed,0);
});
