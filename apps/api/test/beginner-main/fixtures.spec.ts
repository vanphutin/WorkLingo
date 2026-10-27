import {describe,it,expect} from 'vitest';
import {newRunLedger,planCreate,authorizeFixtureWrite,authorizeProtectedRead,namespaceFixtureSource,cleanupMainFixtures,captureHistoricalHashes,verifyHistoricalHashes} from './fixtures.js';
import {syntheticBeginnerSource} from '../fixtures/beginner/authoring/fixture-factory.js';
import {parseLessonSource} from '@worklingo/content-format';
import {readMainScope} from './environment.js';
describe('fixture ownership before mutation',()=>{
 it('detects V1, C1 or pinned snapshot changes against hashes captured before successor publication',()=>{
  const rows={version:{id:'v1',parsedContent:{title:'Original'}},curriculum:{id:'c1',definition:{objectives:['original']}},snapshot:{versionId:'v1',items:['original']}};
  const before=captureHistoricalHashes(rows);expect(()=>verifyHistoricalHashes(before,rows)).not.toThrow();
  for(const key of ['version','curriculum','snapshot'])expect(()=>verifyHistoricalHashes(before,{...rows,[key]:{changed:true}})).toThrow('MAIN_HISTORICAL_CONTENT_CHANGED');
 });
 it('cleanup rejects a non-primary-key selector before touching PostgreSQL',()=>{
  const ledger=newRunLedger(readMainScope());ledger.rows.push({model:'User',keys:{email:'fixture-user'}});
  let called=false;
  expect(()=>cleanupMainFixtures(readMainScope(),{query:()=>{called=true;return [] as never;}},ledger,Array.from({length:97},()=>({schema:'public',table:'User',count:'2',digest:'a'.repeat(64)})))).toThrow('MAIN_CLEANUP_OWNERSHIP');
  expect(called).toBe(false);
 });
 it('never reads existing identities through an unbounded or foreign selector',()=>{
  const ledger=newRunLedger(readMainScope());ledger.rows.push({model:'User',keys:{id:'fixture-id'}});
  expect(()=>authorizeProtectedRead(ledger,'User','findUnique',{where:{id:'fixture-id'}},[])).not.toThrow();
  expect(()=>authorizeProtectedRead(ledger,'User','findMany',{},[])).toThrow('MAIN_PROTECTED_READ');
  expect(()=>authorizeProtectedRead(ledger,'User','groupBy',{by:['email']},[])).toThrow('MAIN_PROTECTED_READ');
  expect(()=>authorizeProtectedRead(ledger,'User','aggregate',{_min:{email:true}},[])).toThrow('MAIN_PROTECTED_READ');
  expect(()=>authorizeProtectedRead(ledger,'UserSession','findUnique',{where:{tokenHash:'other'}},['owned-token-hash'])).toThrow('MAIN_PROTECTED_READ');
 });
 it('namespaces actual parsed source fields and cross references, preserving the format',()=>{
  const source=namespaceFixtureSource(syntheticBeginnerSource(),'261026a00003','mg01-l2'),doc=parseLessonSource(source).document;
  expect(doc.lesson?.slug).toBe('fixture-261026a00003-mg01-l2');
  expect(doc.wordBanks.every(w=>w.slug.includes('261026a00003'))).toBe(true);
  expect(doc.activities.every(a=>a.slug.includes('261026a00003'))).toBe(true);
 });
 it('preallocates parent and nested row keys without inventing a public release',()=>{
  const ledger=newRunLedger(readMainScope());const row={slug:'fixture-261026a00003',versions:{create:{version:1,title:'Synthetic',sourceHash:'a'.repeat(64),parsedContent:{}}}};
  planCreate(ledger,'Lesson',row);expect(ledger.rows.some(r=>r.model==='Lesson')).toBe(true);expect(ledger.rows.some(r=>r.model==='LessonVersion')).toBe(true);expect(ledger.rows.every(r=>Object.values(r.keys).every(v=>typeof v==='string'&&v.length>0))).toBe(true);
  expect(row.versions.create).not.toHaveProperty('lessonId');
  expect(ledger.rows.find(r=>r.model==='LessonVersion')?.keys.id).toBe((row.versions.create as {id?:string}).id);
 });
 it('never permits protected identity writes or unbounded updates/deletes',()=>{
  const ledger=newRunLedger(readMainScope());
  for(const model of ['User','UserSession','LearnerProfile','VocabularySourceEntry'])expect(()=>authorizeFixtureWrite(ledger,model,'updateMany',{where:{}})).toThrow('MAIN_FIXTURE_SCOPE');
  expect(()=>authorizeFixtureWrite(ledger,'Lesson','deleteMany',{where:{status:'PUBLISHED'}})).toThrow('MAIN_FIXTURE_SCOPE');
 });
 it('permits exact owned keys but rejects foreign IDs and an unbounded OR branch',()=>{
  const ledger=newRunLedger(readMainScope()),data={slug:'fixture-261026a00003'};planCreate(ledger,'Lesson',data);const id=ledger.rows.find(r=>r.model==='Lesson')!.keys.id;
  expect(()=>authorizeFixtureWrite(ledger,'Lesson','update',{where:{id},data:{currentPublishedVersionId:null}})).not.toThrow();
  expect(()=>authorizeFixtureWrite(ledger,'Lesson','update',{where:{id:'10000000-0000-4000-8000-000000000099'},data:{}})).toThrow('MAIN_FIXTURE_SCOPE');
  expect(()=>authorizeFixtureWrite(ledger,'Lesson','deleteMany',{where:{OR:[{id},{status:'PUBLISHED'}]}})).toThrow('MAIN_FIXTURE_SCOPE');
 });
});
