import {describe,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {executeMainPhases,mainPhases,readPrivateDirectoryAcl,type MainPhaseHandlers} from './run.js';
import {validateServerInputs} from './server.js';
import {verifyPasswordLogging,mainCommandBudget,assertRecoveryShutdown} from './run.js';
const window={startedAt:'2030-01-01T00:00:00Z',deadline:'2030-01-01T04:00:00Z'};
describe('single main coordinator',()=>{
 it('still invokes shutdown after hard expiry, without authorizing cleanup writes',async()=>{
  let now=Date.parse('2030-01-01T00:01:00Z'),shutdown=false;
  const handlers=Object.fromEntries(mainPhases.map(p=>[p,async()=>{if(p==='audit')now=Date.parse(window.deadline);if(p==='cleanup')shutdown=true;}])) as MainPhaseHandlers;
  await expect(executeMainPhases(handlers,window,()=>now)).rejects.toThrow('MAIN_WINDOW_EXPIRED');expect(shutdown).toBe(true);
 });
 it('reports an executed integration assertion as FAIL and preserves a separate cleanup blocker',async()=>{
  const handlers=Object.fromEntries(mainPhases.map(p=>[p,async()=>{if(p==='integration')throw Error('ASSERTION_FAILED');if(p==='cleanup')throw Error('CLEANUP_DENIED');}])) as MainPhaseHandlers;
  try{await executeMainPhases(handlers,window,()=>Date.parse('2030-01-01T00:01:00Z'));throw Error('expected failure');}catch(e){expect(e).toMatchObject({phase:'integration',status:'FAIL',cleanupError:expect.any(Error)});}
 });
 it('bounds commands to the original test cutoff and rejects uncertain crash ownership before DB cleanup',()=>{
  expect(mainCommandBudget(window,'test',Date.parse('2030-01-01T03:29:59Z'))).toBe(1000);
  expect(()=>mainCommandBudget(window,'test',Date.parse('2030-01-01T03:30:00Z'))).toThrow('MAIN_WINDOW_EXPIRED');
  expect(()=>assertRecoveryShutdown([{label:'api',pid:1234,startedAt:'2030-01-01T00:00:00Z',state:'running'}])).toThrow('MAIN_PROCESS_RECOVERY_QUARANTINE');
  expect(()=>assertRecoveryShutdown([{label:'api',startedAt:'2030-01-01T00:00:00Z',state:'intent'}])).toThrow('MAIN_PROCESS_RECOVERY_QUARANTINE');
  expect(()=>assertRecoveryShutdown([{label:'api',pid:1234,startedAt:'2030-01-01T00:00:00Z',state:'closed'}])).not.toThrow();
 });
 it('blocks password provisioning when duration or transaction sampling could log statements',()=>{
  const safe={log_statement:'none',log_min_duration_statement:'-1',log_min_duration_sample:'-1',log_statement_sample_rate:'1',log_transaction_sample_rate:'0',log_duration:'off',password_encryption:'scram-sha-256',shared_preload_libraries:'',debug_print_parse:'off',debug_print_rewritten:'off',debug_print_plan:'off',log_min_error_statement:'panic'};
  expect(()=>verifyPasswordLogging(safe)).not.toThrow();
  for(const changes of [{log_min_duration_sample:'0'},{log_transaction_sample_rate:'0.01'},{log_min_duration_sample:undefined},{log_transaction_sample_rate:undefined}])expect(()=>verifyPasswordLogging({...safe,...changes})).toThrow('MAIN_PASSWORD_LOGGING');
 });
 it('never inherits PowerShell 7 module paths into Windows PowerShell ACL verification',()=>{
  const result=readPrivateDirectoryAcl('C:/synthetic',(_binary,_args,options)=>{
   expect(options.env).toBeDefined();expect(options.env?.PSModulePath).toBeUndefined();
   return '{"owner":"synthetic","protected":true,"rules":[]}';
  });expect(result.owner).toBe('synthetic');
 });
 it('requires exactly three fresh fixture cookies and an explicit test-only API port',()=>{
  expect(()=>validateServerInputs({API_PORT:'47771',WORKLINGO_BEGINNER_MAIN_TEST:'1',WORKLINGO_BEGINNER_MAIN_COOKIES:JSON.stringify(['a'.repeat(64),'b'.repeat(64),'c'.repeat(64)])})).not.toThrow();
  expect(()=>validateServerInputs({API_PORT:'4000'})).toThrow('MAIN_SERVER_INPUT');
  expect(()=>validateServerInputs({API_PORT:'47771',WORKLINGO_BEGINNER_MAIN_TEST:'1',WORKLINGO_BEGINNER_MAIN_COOKIES:'[]'})).toThrow('MAIN_SERVER_INPUT');
 });
 it('runs all phases in one lifetime and cleanup once',async()=>{const calls:string[]=[];const handlers=Object.fromEntries(mainPhases.map(p=>[p,async()=>{calls.push(p);}])) as MainPhaseHandlers;await executeMainPhases(handlers,window,()=>Date.parse('2030-01-01T00:01:00Z'));expect(calls).toEqual(mainPhases);});
 it('stops writes after failure and still cleans while authority is valid',async()=>{const calls:string[]=[];const handlers=Object.fromEntries(mainPhases.map(p=>[p,async()=>{calls.push(p);if(p==='audit')throw Error('AUDIT_FAILED');}])) as MainPhaseHandlers;await expect(executeMainPhases(handlers,window,()=>Date.parse('2030-01-01T00:01:00Z'))).rejects.toThrow('AUDIT_FAILED');expect(calls).toEqual(['prepare-paths','start-existing','audit','cleanup']);});
 it('refuses expired or incomplete plans before any side effect',async()=>{let calls=0;const handlers=Object.fromEntries(mainPhases.map(p=>[p,async()=>{calls++;}])) as MainPhaseHandlers;await expect(executeMainPhases(handlers,window,()=>Date.parse('2030-01-01T04:00:00Z'))).rejects.toThrow('MAIN_WINDOW_EXPIRED');expect(calls).toBe(0);await expect(executeMainPhases({} as MainPhaseHandlers,window,()=>Date.parse('2030-01-01T00:00:00Z'))).rejects.toThrow('MAIN_PHASE_MISSING');});
 it('preload allows only approved network targets and denies env/backup reads before I/O',()=>{
  const guard=path.resolve('test/beginner-main/egress-guard.cjs');
  const script="const g=require(process.argv[1]); if(!g.allowNetwork('127.0.0.1',47771)||g.allowNetwork('outside.invalid',443)||g.allowNetwork('127.0.0.1',5432))process.exit(2);try{require('fs').readFileSync('C:/missing/.env');process.exit(3)}catch(e){if(e.message!=='MAIN_FILE_EGRESS')throw e}try{require('fs').readFileSync('C:/private-backup/a.dump');process.exit(4)}catch(e){if(e.message!=='MAIN_FILE_EGRESS')throw e}";
  expect(()=>execFileSync(process.execPath,['-e',script,guard],{env:{SystemRoot:process.env.SystemRoot,WORKLINGO_BEGINNER_BACKUP_ROOT:'C:/private-backup'}})).not.toThrow();
 });
});
