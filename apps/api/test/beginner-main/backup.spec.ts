import {describe,it,expect} from 'vitest';
import {createMainBackup,validateMainBackup,type BackupIO} from './backup.js';
import {readMainScope} from './environment.js';
function memoryIO(){const calls:string[]=[];let bad=false;const io:BackupIO={archive:async request=>{calls.push('archive:'+request.database);return {path:request.path,bytes:120,sha256:'a'.repeat(64),exitCode:0};},globals:async request=>{calls.push('globals:'+request.database);return {path:request.path,bytes:80,sha256:'b'.repeat(64),exitCode:0};},inspect:async file=>({path:file,bytes:bad?0:file.endsWith('.dump')?120:80,sha256:file.endsWith('.dump')?'a'.repeat(64):'b'.repeat(64),exitCode:0}),list:async()=>{calls.push('list');return 0;},decode:async()=>{calls.push('decode');return 0;}};return {io,calls,corrupt:()=>{bad=true;}};}
describe('complete private main backup',()=>{
 it('dumps the exact whole database and decodes the complete archive without claiming restore',async()=>{
  const m=memoryIO(),s=readMainScope(),r=await createMainBackup(s,m.io);await validateMainBackup(s,r,m.io);
  expect(r.restoreStatus).toBe('NOT_TESTED');expect(r.status).toBe('ARCHIVE_READABLE');expect(m.calls).toEqual(['archive:worklingo','globals:worklingo','list','decode','list','decode']);
 });
 it('refuses incomplete/corrupt backup before any dependent write phase',async()=>{
  const m=memoryIO(),s=readMainScope(),r=await createMainBackup(s,m.io);m.corrupt();await expect(validateMainBackup(s,r,m.io)).rejects.toThrow('MAIN_BACKUP_INVALID');
 });
 it('refuses decode errors and a backup path outside the approved private root',async()=>{
  const m=memoryIO(),s=readMainScope();m.io.decode=async()=>1;await expect(createMainBackup(s,m.io)).rejects.toThrow('MAIN_BACKUP_INVALID');
  const n=memoryIO(),r=await createMainBackup(s,n.io);await expect(validateMainBackup(s,{...r,archive:{...r.archive,path:'C:/unapproved.dump'}},n.io)).rejects.toThrow('MAIN_BACKUP_INVALID');
 });
});
