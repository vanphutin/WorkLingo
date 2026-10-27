import {describe,it,expect} from 'vitest';
import {readMainScope,verifyMainPreflight,assertRuntimeSql,verifyCleanupKeys,verifyWindow,mainChildEnvironment,verifyContainer,verifyAudit} from './environment.js';
const scope=()=>readMainScope();
const proof=()=>({phase:'runtime',host:'127.0.0.1',port:55432,database:'worklingo',databaseOid:'16384',systemIdentifier:'7692646346822291490',clusterName:'',role:'wl_r12a_main_202610260003',roleOid:'40000',superuser:false,createDb:false,createRole:false,replication:false,bypassRls:false,owner:false,memberships:0,createSchema:false,truncate:false,protectedDml:false,unsafeDefiner:false,foreignClients:0});
describe('controlled main preflight',()=>{
 it('rejects a shared-volume process or container identity drift before startup',()=>{
  const s=scope(),d=s.environment.docker;
  const record={Id:d.id,Image:d.image,Config:{Entrypoint:d.entrypoint,Cmd:d.cmd},HostConfig:{RestartPolicy:{Name:'no'},PortBindings:{'5432/tcp':[{HostIp:'',HostPort:'55432'}]}},Mounts:[{Name:d.volume,Destination:d.destination}],State:{Running:false}};
  expect(()=>verifyContainer(s,record,[])).not.toThrow();
  expect(()=>verifyContainer(s,record,['foreign'])).toThrow('MAIN_VOLUME_ACTIVE');
  expect(()=>verifyContainer(s,{...record,Id:'wrong'},[])).toThrow('MAIN_CONTAINER_IDENTITY');
 });
 it('refuses changed counts, unsafe SQL logging, unexpected migrations and an existing runtime role',()=>{
  const s=scope(),a={counts:s.dataPreservation.tableCounts,migrationsMatch:true,roleExists:false,unsafeLogging:false};
  expect(()=>verifyAudit(s,a)).not.toThrow();
  for(const key of ['roleExists','unsafeLogging'])expect(()=>verifyAudit(s,{...a,[key]:true})).toThrow('MAIN_AUDIT_BLOCKED');
  expect(()=>verifyAudit(s,{...a,migrationsMatch:false})).toThrow('MAIN_AUDIT_BLOCKED');
  expect(()=>verifyAudit(s,{...a,counts:[]})).toThrow('MAIN_AUDIT_BLOCKED');
 });
 it('accepts only the exact captured main target and least-privilege role',()=>{expect(()=>verifyMainPreflight(scope(),proof())).not.toThrow();});
 it('denies identity drift and every dangerous runtime privilege',()=>{
  for(const field of ['database','databaseOid','systemIdentifier','role','clusterName'])expect(()=>verifyMainPreflight(scope(),{...proof(),[field]:'wrong'})).toThrow('MAIN_IDENTITY');
  for(const field of ['superuser','createDb','createRole','replication','bypassRls','owner','createSchema','truncate','protectedDml','unsafeDefiner'])expect(()=>verifyMainPreflight(scope(),{...proof(),[field]:true})).toThrow('MAIN_PRIVILEGE');
  expect(()=>verifyMainPreflight(scope(),{...proof(),foreignClients:1})).toThrow('MAIN_FOREIGN_CLIENT');
 });
 it('does not accept a caller-selected scope or fallback environment',()=>{expect(()=>readMainScope('../.env')).toThrow('MAIN_SCOPE_PATH');});
 it('rejects DDL, role changes and unsafe statements before a query is sent',()=>{
  expect(()=>assertRuntimeSql('SELECT "id" FROM "Lesson" WHERE "id"=$1 FOR UPDATE')).not.toThrow();
  for(const sql of ['SELECT * FROM public."User"','SELECT * FROM public."UserSession"','TRUNCATE "User"','DROP DATABASE worklingo','CREATE TEMP TABLE x(id int)','SET ROLE worklingo','DELETE FROM "Lesson"','SELECT 1; DELETE FROM "User"',"SELECT set_config('role','worklingo',false)"])expect(()=>assertRuntimeSql(sql)).toThrow('MAIN_UNSAFE_SQL');
 });
 it('cleanup accepts only exact created keys and rejects a foreign reference',()=>{
  expect(()=>verifyCleanupKeys(['new-id'],['new-id'],[])).not.toThrow();
  expect(()=>verifyCleanupKeys(['new-id'],['original-id'],[])).toThrow('MAIN_CLEANUP_OWNERSHIP');
  expect(()=>verifyCleanupKeys(['new-id'],['new-id'],['foreign-child'])).toThrow('MAIN_CLEANUP_OWNERSHIP');
 });
 it('reserves cleanup time, never renews an expired window and strips inherited secrets',()=>{
  const window={startedAt:'2030-01-01T00:00:00Z',deadline:'2030-01-01T04:00:00Z'};
  expect(()=>verifyWindow(window,'test',Date.parse('2030-01-01T03:30:00Z'))).toThrow('MAIN_WINDOW_EXPIRED');
  expect(()=>verifyWindow(window,'cleanup',Date.parse('2030-01-01T03:59:00Z'))).not.toThrow();
  expect(()=>verifyWindow(window,'cleanup',Date.parse('2030-01-01T04:00:00Z'))).toThrow('MAIN_WINDOW_EXPIRED');
  const env=mainChildEnvironment(scope(),'postgresql://wl_r12a_main_202610260003:synthetic@127.0.0.1:55432/worklingo?schema=public','unit','x'.repeat(64));
  expect(env.OPENAI_API_KEY).toBe('');expect(env.WORKLINGO_BEGINNER_ISOLATED_TEST).toBe('0');expect(env.WORKLINGO_BEGINNER_MAIN_TEST).toBe('1');expect(env.PGPASSWORD).toBeUndefined();
 });
});
