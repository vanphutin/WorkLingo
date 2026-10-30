import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,existsSync,lstatSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=resolve(__dirname,'../../../..');
const read=(p:string)=>readFileSync(resolve(root,p));
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const scopePath='mandate/reports/2026-10-30-r12b-mission-scope.json';
const scope=JSON.parse(read(scopePath).toString());
const old=JSON.parse(read('mandate/reports/2026-10-29-beginner-engineering-umbrella-scope.json').toString());
const itemPath=scope.allowlist.cliBookkeeping[1];
const buildItemPath='mandate/items/MND-20261030-002-bug-repair-authentication-css-module-pure-selectors-blocking-the-r12b-prod.md';
const buildPaths=[buildItemPath,'mandate/reports/2026-10-30-r12b-auth-css-proposal.json','apps/web/src/features/auth/auth.module.css'];
const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024}).trim();

test('successor approval binds finite scope while old mandate and protected assets stay exact',async()=>{
 const [,raw,body]=read(itemPath).toString().split(/^---\s*$/m);const item=JSON.parse(raw!);
 const {proposalHash}=await import(pathToFileURL(resolve(root,'.agents/skills/mandate-steward/scripts/model.mjs')).href) as {proposalHash:(v:Record<string,unknown>,body:string)=>string};
 assert.equal(item.approval.proposal_hash,proposalHash(item,body!));assert.ok(['implementing','verified'].includes(item.status));
 assert.ok(body!.includes('Scope JSON SHA256 '+sha(read(scopePath))));
 assert.equal(scope.authority.realProviderCalls,false);assert.equal(scope.authority.database,false);assert.equal(scope.authority.study,false);
 assert.equal(git('branch','--show-current'),scope.baseline.branch);git('merge-base','--is-ancestor',scope.baseline.head,'HEAD');
 const mutable=new Set(scope.allowlist.modify);
 for(const file of scope.baseline.files as {path:string;sha256:string}[])if(!mutable.has(file.path))assert.equal(sha(read(file.path)),file.sha256,file.path);
 for(const file of scope.baseline.selectedAudio as {path:string;sha256:string}[])assert.equal(sha(readFileSync(file.path)),file.sha256,file.path);
});

test('historical005 source mutations and governance tests are frozen at their own final revision',()=>{
 const previous=new Set([...old.allowlist.modify,...old.allowlist.create,'mandate/INDEX.md','mandate/items/MND-20261029-005-architecture-bound-autonomous-beginner-qualification-engineering-with-durable-accou.md']);
 for(const path of git('diff','--name-only','93683aa',scope.baseline.head).split('\n').filter(Boolean))assert.ok(previous.has(path),'OLD_SCOPE:'+path);
 const path='apps/api/test/beginner-pilot/qualification-governance.test.ts';
 assert.equal(read(path).toString().replace(/\r\n/g,'\n'),git('show',scope.baseline.head+':'+path).replace(/\r\n/g,'\n')+'\n');
});

test('every new tracked or untracked mutation belongs only to the successor exact paths',()=>{
 const permitted=new Set([...scope.allowlist.modify,...scope.allowlist.create,...scope.allowlist.cliBookkeeping,...buildPaths]);
 const files=[...git('diff','--name-only',scope.baseline.head).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean);
 for(const path of files)assert.ok(permitted.has(path),'SUCCESSOR_OUTSIDE_ALLOWLIST:'+path);
});

test('build successor binds its own finite authorization and exact preexisting CSS baseline',async()=>{
 const [,raw,body]=read(buildItemPath).toString().split(/^---\s*$/m);const item=JSON.parse(raw!);
 const {proposalHash}=await import(pathToFileURL(resolve(root,'.agents/skills/mandate-steward/scripts/model.mjs')).href) as {proposalHash:(v:Record<string,unknown>,body:string)=>string};
 assert.equal(item.approval.proposal_hash,'a7b6d5e55bab6aba854823074891eafd85dbf72da19bb99a8b6527511427653d');
 assert.equal(item.approval.proposal_hash,proposalHash(item,body!));assert.ok(['implementing','verified'].includes(item.status));
 const baseline=execFileSync('git',['show','88d6379:apps/web/src/features/auth/auth.module.css'],{cwd:root});
 assert.equal(sha(baseline),'19738c4206710279c0490696f89da60ef53ac29d09d12aefd258e4a38950c06e');
 assert.equal(sha(baseline.toString().replace(/\n/g,'\r\n')),'81a3c7cd819da788a3a2945dabf7b377c7e9f92f8bb1bcc981b5271dad2e1591');
 assert.equal(item.risk.data_change,false);assert.equal(item.risk.external_effect,false);
});

test('existing synthetic runtime namespace remains bounded and never follows reparse points',()=>{
 const allowed=new Set(old.runtime.exactPaths);
 const walk=(path:string)=>{assert.ok(!lstatSync(path).isSymbolicLink(),'RUNTIME_REPARSE');assert.ok(allowed.has(relative(root,path).replace(/\\/g,'/')),'UNAPPROVED_RUNTIME_PATH');if(lstatSync(path).isDirectory())for(const name of readdirSync(path))walk(resolve(path,name));};
 const start=resolve(root,old.runtime.root);if(existsSync(start))walk(start);
});
