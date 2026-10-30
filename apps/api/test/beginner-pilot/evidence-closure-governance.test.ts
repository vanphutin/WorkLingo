import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=resolve(__dirname,'../../../..'),base='3e120a81239e623209b3ba61889947e9a97cae86';
const git=(...args:string[])=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024}).toString().trim();
const read=(p:string)=>readFileSync(resolve(root,p),'utf8');
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
test('current finite successor validates approval and all delta paths without extending historical authority',async()=>{
 const path='mandate/reports/2026-10-30-r12b-evidence-closure-scope.json',scope=JSON.parse(read(path));
 assert.equal(scope.mission,'WL-R12B-EVIDENCE-CLOSURE-001');assert.equal(scope.baseline.head,base);
 const itemPath=scope.allowlist.cliBookkeeping.find((p:string)=>p.startsWith('mandate/items/'));
 const parts=read(itemPath).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u)!;
 const item=JSON.parse(parts[1]!);
 const model=await import(pathToFileURL(resolve(root,'.agents/skills/mandate-steward/scripts/model.mjs')).href);
 assert.equal(item.approval.proposal_hash,model.proposalHash(item,parts[2]));
 assert.ok(parts[2]!.includes(sha(read(path))));assert.ok(['implementing','verified'].includes(item.status));
 assert.equal(scope.authority.credentialsOrEnv,false);assert.equal(scope.authority.productionData,false);
 assert.equal(scope.budget.inkPoints,'1.5');assert.equal(scope.budget.additionalUSD,'0');
 const allowed=new Set<string>([...scope.allowlist.modify,...scope.allowlist.create,...scope.allowlist.cliBookkeeping]);
 const current=[...git('diff','--name-only',base).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean);
 for(const file of current)assert.ok(allowed.has(file),'OUTSIDE_FINITE_SCOPE:'+file);
 const historical=git('ls-tree','-r','--name-only',base,'mandate/items','mandate/reports','apps/api/test/beginner-pilot').split('\n');
 for(const file of historical.filter(Boolean)){const original=execFileSync('git',['show',base+':'+file],{cwd:root,maxBuffer:32*1024*1024}).toString();assert.equal(read(file).replace(/\r\n/gu,'\n'),original.replace(/\r\n/gu,'\n'),file);}
});
test('final lesson bindings reject stale source, rubric, audio and evidence receipts without transferring qualification',()=>{
 const path='docs/qualification/beginner-r12b-lesson-qualification-final.json';
 assert.ok(existsSync(resolve(root,path)),'FINAL_LESSON_BINDINGS_REQUIRED');
 const final=JSON.parse(read(path));
 const oracle=JSON.parse(read('docs/qualification/beginner-r12b-oracle-adjudication-final.json'));
 const qa=JSON.parse(read('docs/qualification/beginner-r12b-expert-qa-final.json'));
 const pinned=JSON.parse(read('docs/qualification/beginner-pilot-post-context-requalification.json'));
 assert.equal(final.lessons.length,8);assert.equal(new Set(final.lessons.map((l:{lesson:string})=>l.lesson)).size,8);
 assert.equal(final.aiQualifiedLessonCount,0);assert.equal(final.releasePermitted,false);
 for(const lesson of final.lessons){
  assert.deepEqual(lesson.sourceBundle,pinned.sourceBundles.find((b:{lesson:string})=>b.lesson===lesson.lesson));
  assert.equal(sha(read(lesson.sourceBundle.sourcePath)),lesson.sourceBundle.sourceSha256);
  assert.equal(sha(read(lesson.rubric.path)),lesson.rubric.sha256);
  assert.equal(lesson.oracle.fileSha256,sha(read(lesson.oracle.path)));
  assert.equal(lesson.oracle.freezeSha256,oracle.freezeSha256);
  const decisions=oracle.decisions.filter((d:{sourcePath:string})=>d.sourcePath===lesson.sourceBundle.sourcePath);
  assert.equal(decisions.length,16);assert.deepEqual(lesson.oracle.decisionIds,decisions.map((d:{decisionId:string})=>d.decisionId));
  assert.equal(lesson.qa.fileSha256,sha(read(lesson.qa.path)));assert.equal(lesson.qa.closureSha256,qa.closureSha256);
  assert.equal(lesson.audio.length,3);
  for(const audio of lesson.audio){assert.equal(sha(readFileSync(audio.path)),audio.sha256);assert.equal(sha(audio.script),audio.scriptSha256);}
  assert.equal(lesson.aiQualified,false);assert.equal(lesson.humanReview.decisions,0);assert.equal(lesson.providerCalibration.realStarts,0);assert.equal(lesson.gateC.validObservations,0);
 }
});
test('historical browser scope was exact at its checkpoint and new corpus preserves live and human denial',()=>{
 const scope=JSON.parse(read('mandate/reports/2026-10-30-r12b-browser-cost-scope.json'));
 const permitted=new Set([...scope.allowlist.modify,...scope.allowlist.create,...scope.allowlist.cliBookkeeping]);
 for(const file of git('diff','--name-only',scope.baseline.head,base).split('\n').filter(Boolean))assert.ok(permitted.has(file),'HISTORICAL_SCOPE:'+file);
 const oracle=JSON.parse(read('docs/qualification/beginner-r12b-oracle-adjudication-final.json'));
 const qa=JSON.parse(read('docs/qualification/beginner-r12b-expert-qa-final.json'));
 const cost=JSON.parse(read('docs/qualification/beginner-r12b-cost-accounting-final.json'));
 assert.equal(oracle.decisions.length,128);assert.equal(oracle.repeats.length,32);assert.equal(oracle.schedule.length,160);
 assert.equal(oracle.humanAdjudicatedCount,0);assert.equal(oracle.liveOracleReady,false);
 assert.equal(qa.items.length,82);assert.equal(qa.counts.humanExpertVerified,0);assert.equal(qa.counts.phoneticVerified,0);
 assert.equal(cost.liveStarts,0);assert.equal(cost.livePermitted,false);assert.equal(cost.full.reservedInkPoints,'1291.1464');
});
