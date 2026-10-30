import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const repo=path.resolve(__dirname,'../../../..');
const baseline='a4685e7cd42d8dbbe949b9d5d1e8429d8bb1694c';
const git=(...args:string[])=>execFileSync('git',args,{cwd:repo,maxBuffer:24*1024*1024});
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const read=(p:string)=>fs.readFileSync(path.join(repo,p));
test('successor binds exact approved scope and leaves all historical authority unchanged',async()=>{
 const sp='mandate/reports/2026-10-30-r12b-browser-cost-scope.json',scope=JSON.parse(read(sp).toString());
 const ip=scope.allowlist.cliBookkeeping[1],match=read(ip).toString().match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u)!;
 const item=JSON.parse(match[1]!);const model=await import(pathToFileURL(path.join(repo,'.agents/skills/mandate-steward/scripts/model.mjs')).href);
 assert.equal(item.approval.proposal_hash,model.proposalHash(item,match[2]));assert.ok(match[2]!.includes(sha(read(sp))));assert.ok(['implementing','verified'].includes(item.status));
 assert.equal(scope.baseline.head,baseline);assert.equal(scope.authority.realProviderCalls,false);assert.equal(scope.authority.realParticipants,false);assert.equal(scope.authority.database,false);assert.equal(scope.authority.release,false);
 const permitted=new Set([...scope.allowlist.modify,...scope.allowlist.create,...scope.allowlist.cliBookkeeping]);
 const changed=git('diff','--name-only',baseline).toString().trim().split('\n').filter(Boolean);const untracked=git('ls-files','--others','--exclude-standard').toString().trim().split('\n').filter(Boolean);
 for(const file of [...changed,...untracked])assert.ok(permitted.has(file),'OUTSIDE_SCOPE:'+file);
 for(const file of ['apps/api/test/beginner-pilot/qualification-governance.test.ts','apps/api/test/beginner-pilot/autonomous-governance.test.ts','mandate/reports/2026-10-29-beginner-engineering-umbrella-scope.json','mandate/reports/2026-10-30-r12b-mission-scope.json',...git('ls-tree','-r','--name-only',baseline,'mandate/items').toString().trim().split('\n')]){
  assert.equal(read(file).toString().replace(/\r\n/gu,'\n'),git('show',baseline+':'+file).toString().replace(/\r\n/gu,'\n'),file);
 }
 for(const prefix of ['content/beginner/','packages/','apps/api/src/teacher-ai/','apps/api/src/learning-sessions/','apps/web/src/'])assert.ok(!changed.some(p=>p.startsWith(prefix)),prefix);
});
test('snapshot verifier rejects changed source and wrong dependency junctions on resume',async()=>{
 const mod=await import(pathToFileURL(path.join(repo,'tools/beginner-pilot/browser-qualification.mjs')).href);
 assert.equal(typeof mod.assertSnapshotSource,'function');
 const temp='C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-browser-cost-001/harness/snapshot-check';
 const file='apps/web/src/features/learning-session/activity-workspace.tsx',dest=path.join(temp,file);fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,git('show',baseline+':'+file));mod.assertSnapshotSource(repo,temp,baseline,[file]);
 const original=fs.readFileSync(dest);try{fs.appendFileSync(dest,'\n// altered fixture\n');assert.throws(()=>mod.assertSnapshotSource(repo,temp,baseline,[file]),/SNAPSHOT_SOURCE_DRIFT/u);}finally{fs.writeFileSync(dest,original);}
 assert.throws(()=>mod.assertDependencyLink(temp,path.join(repo,'node_modules')),/SNAPSHOT_DEPENDENCY/u);
});
