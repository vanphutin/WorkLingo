import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {parseLessonSource} from '@worklingo/content-format';
import {qualifyPilotSources} from './qualify-content.js';

const root=path.resolve(__dirname,'../../../..');
const read=(p:string)=>readFileSync(path.join(root,p),'utf8');
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const preview=JSON.parse(read('mandate/reports/2026-10-28-beginner-international-names-preview.json'));
const scope=JSON.parse(read('mandate/reports/2026-10-28-beginner-international-names-scope.json'));
const historical=(p:string)=>execFileSync('git',['show','69b559e9475d08c67cb4920b13c8e0f034eabaf3:'+p],{cwd:root,encoding:'utf8'});
const bindings=()=>JSON.parse(read('docs/qualification/beginner-pilot-ai-correction-bindings.json'));
const frozenSnapshot=JSON.parse(read('mandate/reports/2026-10-28-beginner-gate-b-source-audio-snapshot.json'));
const inventory=()=>JSON.parse(read('docs/qualification/beginner-pilot-audio-inventory.json'));

test('historical international revision matches approved committed bytes and successor retains international roles',()=>{
 for(const change of preview.sourceChanges){
  const oldText=historical(change.path);assert.equal(hash(oldText),change.after,change.path);
  assert.equal(hash(oldText),frozenSnapshot.lessons.find((l:{sourcePath:string})=>l.sourcePath===change.path).sourceSha256);
  const text=read(change.path);
  assert.ok(!/\b(?:Linh|Bao|Nam|Mai|An|Bo|Ha Noi|Hue|Da Nang|Can Tho)\b/u.test(text),change.path);
 }
 const article=read('content/beginner/pilot/mg02-l1.lesson.txt');
 assert.equal(hash(historical('content/beginner/pilot/mg02-l1.lesson.txt')),scope.baseline.unchangedLesson.sha256);
 const successor=bindings().lessons.find((l:{code:string})=>l.code==='MG02-L1');
 assert.equal(hash(article),successor.sourceSha256);
 assert.equal(successor.previousSourceSha256,scope.baseline.unchangedLesson.sha256);
 assert.ok(article.includes('An eraser'));assert.ok(article.includes('An đi trước âm nguyên âm'));
 assert.ok(!article.includes('Adam eraser'));
});
test('Ed spelling and Jo distractor evidence agree instead of retaining Bo/B,O',()=>{
 const raw=read('content/beginner/pilot/mg01-l2.lesson.txt'),doc=parseLessonSource(raw).document;
 const script=doc.audioScripts.find(s=>s.slug==='mg01-l2-audio-1');
 assert.equal(script?.script,'Hello. I am Ed. E, D. I am from Hong Kong.');
 assert.ok(raw.includes('E, D đánh vần Ed'));assert.ok(raw.includes('Ed đổi cả hai chữ'));
 assert.ok(!raw.includes('B, O'));assert.ok(!raw.includes('Ed đổi chữ đầu'));
});
test('current inventory binds actual revised scripts while immutable original inventory stays auditable',()=>{
 assert.ok(existsSync(path.join(root,preview.inventory.archive)),'original inventory archive must exist');
 const old=read(preview.inventory.archive);assert.equal(hash(old),preview.inventory.archiveSha256);
 const current=inventory();assert.equal(current.revision,'international-v2');
 assert.equal(hash(read('docs/qualification/beginner-pilot-audio-inventory.json')),preview.inventory.after);
 for(const lesson of current.lessons){
  const oldRaw=historical(lesson.sourcePath);assert.equal(hash(oldRaw),lesson.sourceSha256);
  const raw=read(lesson.sourcePath),doc=parseLessonSource(raw).document;
  const successor=bindings().lessons.find((l:{code:string})=>l.code===lesson.code);
  assert.equal(hash(raw),successor?.sourceSha256??lesson.sourceSha256);
  if(successor)assert.equal(successor.previousSourceSha256,lesson.sourceSha256);
  for(const script of lesson.scripts){
   assert.equal(script.text,doc.audioScripts.find(s=>s.slug===script.slug)?.script);
   assert.equal(hash(script.text),script.scriptSha256);assert.equal(script.asset,null);
  }
 }
 assert.ok(JSON.parse(old).lessons[0].scripts[0].text.includes('Linh'));
});
test('the international corpus retains8 lessons64 activities32 single-skill objectives and24 scripts',()=>{
 const sources=inventory().lessons.map((l:{code:string;sourcePath:string})=>({code:l.code,rawSource:read(l.sourcePath)}));
 const result=qualifyPilotSources(sources);
 assert.equal(result.offlineStatus,'PASS');assert.deepEqual(result.counts,{lessons:8,activities:64,objectives:32,listeningScripts:24});
 assert.equal(result.contentReadiness,'NOT_READY');
 assert.ok(result.lessons.every(l=>l.audioStatus==='NEEDS_AUDIO'&&Object.values(l.checks).every(c=>c==='PASS')));
});

function canonical(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value!==null&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value);
}

function assertAudioManifest(b:ReturnType<typeof bindings>):void {
 const frozenSlugs:string[]=frozenSnapshot.lessons.flatMap((l:{audio:{slug:string}[]})=>l.audio.map(a=>a.slug));
 const actualSlugs:string[]=b.audioReuse.map((a:{slug:string})=>a.slug);
 assert.equal(frozenSlugs.length,24);assert.equal(new Set(frozenSlugs).size,24);
 assert.equal(actualSlugs.length,24);assert.equal(new Set(actualSlugs).size,24,'audio reuse slugs must be unique');
 assert.deepEqual([...actualSlugs].sort(),[...frozenSlugs].sort(),'audio reuse must equal the exact frozen selection');
 for(const lesson of b.lessons){
  assert.deepEqual(lesson.audio,b.audioReuse.filter((a:{lesson:string})=>a.lesson===lesson.code),lesson.code+' nested audio must equal top-level reuse bindings');
 }
}
test('successor binds seven new sources and all24 immutable scripts and WAV bytes without old verdict transfer',()=>{
 const b=bindings();assert.equal(b.lessons.length,7);assertAudioManifest(b);
 assert.equal(b.qualificationStatus,'BLOCKED');
 const codes=new Set<string>();
 for(const l of b.lessons){
  assert.ok(!codes.has(l.code));codes.add(l.code);
  assert.notEqual(l.code,'MG02-L2');
  const raw=read(l.sourcePath),doc=parseLessonSource(raw).document;
  assert.equal(hash(raw),l.sourceSha256);
  assert.equal(hash(historical(l.sourcePath)),l.previousSourceSha256);
  assert.notEqual(l.sourceSha256,l.previousSourceSha256);
  const old=frozenSnapshot.lessons.find((x:{code:string})=>x.code===l.code);
  assert.equal(l.previousBundleSha256,old.reviewedBundleSha256);
  assert.equal(l.rubricCodeSha256,hash(read(frozenSnapshot.rubricCode.path)));
  assert.equal(l.rubricCodeSha256,frozenSnapshot.rubricCode.sha256);
  for(const r of l.rubrics){
   const a=doc.activities.find(a=>a.slug===r.slug)!;
   assert.equal(hash(a.rubric!),r.textSha256);assert.equal(a.rubricId,r.id);assert.equal(a.rubricVersion,r.version);
  }
  assert.deepEqual(l.responseTasks,JSON.parse(JSON.stringify(doc.activities.filter(a=>a.activityType==='speaking'||a.activityType==='writing'))));
  const {reviewedBundleSha256,previousSourceSha256:_previousSource,previousBundleSha256:_previousBundle,...projection}=l;
  assert.equal(hash(canonical(projection)),reviewedBundleSha256);
  assert.notEqual(reviewedBundleSha256,l.previousBundleSha256);
 }
 for(const a of b.audioReuse){
  const old=frozenSnapshot.lessons.flatMap((l:{code:string;audio:unknown[]})=>l.audio).find((x:{slug:string})=>x.slug===a.slug);
  const historicalSource=historical(a.sourcePath),currentSource=read(a.sourcePath);
  assert.equal(hash(historicalSource),a.previousSourceSha256);assert.equal(old.sourceSha256,a.previousSourceSha256);
  assert.equal(hash(currentSource),a.successorSourceSha256);
  assert.equal(hash(parseLessonSource(currentSource).document.audioScripts.find(s=>s.slug===a.slug)!.script),a.scriptSha256);
  assert.equal(a.scriptSha256,old.scriptSha256);assert.equal(a.requestSha256,old.requestSha256);
  assert.equal(a.fileSha256,old.fileSha256);assert.equal(a.filePath,old.filePath);
  assert.equal(hash(readFileSync(a.filePath)),a.fileSha256);
  assert.equal(a.reuseStatus,'BYTE_IDENTICAL_SCRIPT_AND_WAV');
 }
 assert.equal(hash(read('content/beginner/pilot/mg02-l2.lesson.txt')),'46ab7eb3f512c5f9a4177b475bbb45283b2d107cf0693d3e8cb0b3cdc234eb2a');
});

test('all seven successor files equal historical bytes plus exactly the25 approved field edits',()=>{
 const captured=JSON.parse(read('mandate/reports/2026-10-28-beginner-successor-content-corrections-scope.json'));
 const edits=captured.details.exactFieldEdits;assert.equal(edits.length,25);
 const paths=new Set<string>(edits.map((e:{path:string})=>e.path));assert.equal(paths.size,7);
 for(const p of paths){
  const raw=historical(p),lines=raw.split('\n');
  const changes=edits.filter((e:{path:string})=>e.path===p).sort((a:{line:number},b:{line:number})=>b.line-a.line);
  assert.equal(hash(raw),changes[0].sourceSha256,p);
  for(const e of changes){
   const oldLines=e.before.split('\n'),newLines=e.after.split('\n');
   const original=lines[e.line-1]!;assert.ok(original.includes(oldLines[0]),e.slug+':'+e.field);
   for(let n=1;n<oldLines.length;n++)assert.equal(lines[e.line-1+n],oldLines[n]);
   const prefix=original.slice(0,original.indexOf(oldLines[0]));
   const suffix=original.slice(original.indexOf(oldLines[0])+oldLines[0].length);
   lines.splice(e.line-1,oldLines.length,prefix+newLines[0]+suffix,...newLines.slice(1));
  }
  assert.equal(read(p),lines.join('\n'),p+' contains an unapproved byte change');
 }
});

test('audio manifest rejects a duplicate replacing an omitted frozen asset',()=>{
 const mutated=structuredClone(bindings());
 mutated.audioReuse[1]=structuredClone(mutated.audioReuse[0]);
 assert.throws(()=>assertAudioManifest(mutated));
});
test('audio manifest rejects an omitted frozen asset',()=>{
 const mutated=structuredClone(bindings());mutated.audioReuse.pop();
 assert.throws(()=>assertAudioManifest(mutated));
});
test('audio manifest rejects a nested lesson binding differing from the top-level reuse binding',()=>{
 const mutated=structuredClone(bindings());
 mutated.lessons[0].audio[0].requestSha256='0'.repeat(64);
 assert.throws(()=>assertAudioManifest(mutated));
});
