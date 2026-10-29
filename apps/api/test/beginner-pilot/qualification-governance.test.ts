import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,existsSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=resolve(__dirname,'../../../..');
const read=(p:string)=>readFileSync(resolve(root,p));
const sorted=(x:unknown):unknown=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted((x as Record<string,unknown>)[k])])):x;
const sha=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const digest=(x:unknown)=>sha(JSON.stringify(sorted(x)));
const scope=JSON.parse(read('mandate/reports/2026-10-29-beginner-engineering-umbrella-scope.json').toString());
test('current exact scope,plan,protected files and24WAV are independently validated',()=>{
 const {fingerprint,...base}=scope.baseline;assert.equal(digest(base),fingerprint);
 const {fingerprint:allow,...paths}=scope.allowlist;assert.equal(digest(paths),allow);
 assert.equal(sha(read(scope.plan.path).toString().replace(/\r\n/g,'\n')),scope.plan.sha256LF);
 assert.equal(execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),scope.baseline.branch);execFileSync('git',['merge-base','--is-ancestor',scope.baseline.head,'HEAD'],{cwd:root});
 const mutable=new Set(scope.allowlist.modify);
 for(const f of scope.baseline.files as {path:string;sha256:string}[])if(!mutable.has(f.path))assert.equal(sha(read(f.path)),f.sha256,f.path);
 for(const f of scope.baseline.selectedAudio as {path:string;sha256:string}[])assert.equal(sha(readFileSync(f.path)),f.sha256,f.path);
});
test('current CLI matching approval and permitted lifecycle do not grant readiness',async()=>{
 const path='mandate/items/MND-20261029-005-architecture-bound-autonomous-beginner-qualification-engineering-with-durable-accou.md';
 const [,raw,body]=read(path).toString().split(/^---\s*$/m);const item=JSON.parse(raw!);
 // Dynamic import preserves the repository CLI hash algorithm rather than reimplementing it.
 const moduleUrl=pathToFileURL(resolve(root,'.agents/skills/mandate-steward/scripts/model.mjs')).href;const {proposalHash}=await import(moduleUrl) as {proposalHash:(item:Record<string,unknown>,body:string)=>string};
 assert.equal(proposalHash(item,body!),'dd46620a1f1224803d138a16b7c7870124479c43a13de788e61c51b25fe9e1d8');
 assert.equal(item.approval.proposal_hash,proposalHash(item,body!));assert.ok(['implementing','verified'].includes(item.status));assert.equal(scope.authority.realProviderCalls,false);assert.equal(scope.authority.database,false);
});
test('historical47-file fingerprint remains bound to its actual committed revision,never relabeled current106PASS',()=>{
 const old=JSON.parse(read('mandate/reports/2026-10-29-beginner-post-context-requalification-scope.json').toString());assert.equal(old.baseline.files.length,47);
 for(const f of old.baseline.files as {path:string;sha256:string}[]){const bytes=execFileSync('git',['show','a4211bf:'+f.path],{cwd:root,maxBuffer:10485760});assert.equal(sha(read(f.path)),f.sha256,f.path);assert.equal(read(f.path).toString().replace(/\r\n/g,'\n'),bytes.toString().replace(/\r\n/g,'\n'),f.path+' git LF identity');}
 const oldTest='apps/api/test/beginner-pilot/post-context-requalification.spec.ts';assert.equal(read(oldTest).toString().replace(/\r\n/g,'\n'),execFileSync('git',['show','a4211bf:'+oldTest],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n'));
});
test('mock regression config is standalone,no .env or database fallback and only named suites',()=>{
 const path='apps/api/test/beginner-pilot/qualification-vitest.config.ts';assert.ok(existsSync(resolve(root,path)),'MISSING_NO_ENV_CONFIG');const text=read(path).toString();assert.ok(text.includes('envDir: false'));assert.ok(!/process\.loadEnvFile\s*\(|from ['"]\.\/?(?:.*\/)?vitest\.config|DATABASE_URL\s*\?\?/u.test(text));assert.ok(text.includes("DATABASE_URL: ''"));assert.ok(text.includes('beginner-evaluator-context.setup.ts'));assert.equal((text.match(/\.spec\.ts'/g)||[]).length,9);
});
test('all actual source mutations stay in exact allowlist or CLI bookkeeping',()=>{
 const files=execFileSync('git',['diff','--name-only','93683aa'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
 files.push(...execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean));
 const permitted=new Set([...scope.allowlist.modify,...scope.allowlist.create,'mandate/INDEX.md','mandate/items/MND-20261029-005-architecture-bound-autonomous-beginner-qualification-engineering-with-durable-accou.md']);for(const p of files)assert.ok(permitted.has(p),'OUTSIDE_ALLOWLIST:'+p);
});

test('all created runtime objects belong to the exact146-path namespace; no reparse traversal',()=>{
 const allowed=new Set(scope.runtime.exactPaths);assert.equal(allowed.size,146);const walk=(path:string)=>{assert.ok(!lstatSync(path).isSymbolicLink(),'RUNTIME_REPARSE');assert.ok(allowed.has(relative(root,path).replace(/\\/g,'/')),'UNAPPROVED_RUNTIME_PATH');if(lstatSync(path).isDirectory())for(const name of readdirSync(path))walk(resolve(path,name));};const start=resolve(root,scope.runtime.root);if(existsSync(start))walk(start);
});
