import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {parseLessonSource} from '@worklingo/content-format';
import {qualifyPilotSources} from './qualify-content.js';

const root=path.resolve(__dirname,'../../../..');
const read=(p:string)=>readFileSync(path.join(root,p),'utf8');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const preview=JSON.parse(read('mandate/reports/2026-10-28-beginner-international-names-preview.json'));
const scope=JSON.parse(read('mandate/reports/2026-10-28-beginner-international-names-scope.json'));
const inventory=()=>JSON.parse(read('docs/qualification/beginner-pilot-audio-inventory.json'));

test('international revision matches exact approved source bytes and removes local role/place values',()=>{
 for(const change of preview.sourceChanges){
  const text=read(change.path);assert.equal(hash(text),change.after,change.path);
  assert.ok(!/\b(?:Linh|Bao|Nam|Mai|An|Bo|Ha Noi|Hue|Da Nang|Can Tho)\b/u.test(text),change.path);
 }
 const article=read('content/beginner/pilot/mg02-l1.lesson.txt');
 assert.equal(hash(article),scope.baseline.unchangedLesson.sha256);
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
  const raw=read(lesson.sourcePath),doc=parseLessonSource(raw).document;
  assert.equal(hash(raw),lesson.sourceSha256);
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
