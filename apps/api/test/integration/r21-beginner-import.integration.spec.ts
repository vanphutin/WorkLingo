import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, it, expect } from 'vitest';
import { BeginnerProgramImportService } from '../../src/beginner/application/beginner-program-import.service.js';
import { reconcileBeginnerSources } from '../../src/beginner/domain/beginner-program-source.js';
import { programImportHash } from '../../src/beginner/domain/beginner-program-permission.js';
import { BeginnerImportAudioStorage } from '../../src/beginner/infrastructure/beginner-import-audio-storage.js';
import type { PutObjectInput } from '../../src/storage/domain/object-storage.port.js';
import type { PrismaService } from '../../src/common/database/prisma.service.js';

const url = process.env.WL_R21_TEST_DATABASE_URL ?? '';
if (new URL(url).hostname !== '127.0.0.1' || !['55450','55451'].includes(new URL(url).port) || new URL(url).pathname !== '/worklingo_r21') throw new Error('OWNED_R21_TEST_DATABASE_REQUIRED');
const database = new PrismaClient({ datasourceUrl: url });
const runtime = mkdtempSync(path.join(tmpdir(), 'worklingo-r21-integration-'));
const report = path.join(runtime, 'dry-run.json');
const tsx = createRequire(path.resolve('package.json')).resolve('tsx/cli');
const authority = process.env.WL_R21_TEST_AUTHORITY_FILE!;
const backup = process.env.WL_R21_TEST_BACKUP_FILE!;
const storageRoot = path.join(runtime,'data');
const run = (mode: string, actorId?: string, suffix = '1') => spawnSync(process.execPath, [tsx, 'scripts/import-beginner-r21.ts', '--mode', mode, '--report', report, ...(mode === 'apply' ? ['--authority', authority, '--backup', backup, '--actor-id', actorId!, '--permission-file', path.join(runtime, `permission-${suffix}.json`)] : [])], { env: { ...process.env, DATABASE_URL: url, WORKLINGO_DATA_DIR: storageRoot }, encoding: 'utf8', timeout: 150_000, maxBuffer: 100000 });
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
async function masterFingerprint(){
 const tables=['VocabularySource','VocabularyDocument','VocabularySourceEntry','LexicalEntry','LexicalSense','LexicalPronunciation','LexicalCefrAssociation','VocabularyEntryResolution'];
 const rows=await Promise.all(tables.map(async table=>({table,rows:await database.$queryRawUnsafe<{count:number;hash:string}[]>(`SELECT COUNT(*)::int AS count,md5(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text)) AS hash FROM "${table}" t`)})));
 return programImportHash(rows);
}
async function admissionCounts(){
 const [programs,paths,levels,missions,imports,lessons,versions,audio,releases,enrollments,users,audits,receipts]=await Promise.all([database.learningProgram.count(),database.learningPath.count(),database.level.count(),database.mission.count(),database.contentImport.count(),database.lesson.count(),database.lessonVersion.count(),database.audioArtifact.count(),database.programVersion.count(),database.learnerProgramEnrollment.count(),database.user.count(),database.auditLog.count(),database.mutationReceipt.count()]);
 return {programs,paths,levels,missions,imports,lessons,versions,audio,releases,enrollments,users,audits,receipts};
}
class FailAfterFirstAudio extends BeginnerImportAudioStorage {
 override async put(input:PutObjectInput){await super.put(input);throw new Error('ISOLATED_STORAGE_FAILURE_AFTER_AUDIO');}
}
async function authorize(inventoryHash:string,dryRunHash:string,programId:string){
 const [identity]=await database.$queryRaw<{database:string;role:string;serverIdentity:string}[]>`SELECT current_database() AS database,current_user AS role,(SELECT system_identifier::text FROM pg_control_system()) AS "serverIdentity"`;
 if(!identity)throw new Error('MISSING_OWNED_DATABASE_IDENTITY');
 const parsed=new URL(url),issuedAt=new Date();
 const record={schemaVersion:3,mode:'PROGRAM_IMPORT',approvalId:'r21-isolated-rollback',runId:'aabbccddeeff',environmentId:`r21-${identity.serverIdentity}`,programId,database:{host:parsed.hostname,port:Number(parsed.port),name:identity.database,role:identity.role,serverIdentity:identity.serverIdentity},storageRoot,registryRoot:runtime,approvalRoot:runtime,ownedTempRoot:runtime,actions:['read','author','validate','review','publish'],issuedAt:issuedAt.toISOString(),expiresAt:new Date(issuedAt.getTime()+3600000).toISOString(),revoked:false,approvedBy:'WorkLingo product owner (human user mission, isolated AI test execution)',authorizationSource:`R2.1 supplied mission SHA256:${sha(readFileSync(authority))}`,sourceInventoryHash:inventoryHash,backupHash:sha(readFileSync(backup)),dryRunHash};
 const bytes=JSON.stringify({...record,recordHash:programImportHash(record)}),file=path.join(runtime,'permission-rollback.json');
 writeFileSync(file,bytes,{flag:'wx'});
 process.env.DATABASE_URL=url;process.env.WORKLINGO_DATA_DIR=storageRoot;process.env.WORKLINGO_BEGINNER_IMPORT_PERMISSION_FILE=file;process.env.WORKLINGO_BEGINNER_IMPORT_PERMISSION_SHA256=sha(bytes);
}

describe('official transactional Beginner admission on restored isolated primary', () => {
 afterAll(async()=>{await database.$disconnect();});
 it('rolls back failed audio admission then publishes exact content and replays without master drift', async () => {
  const editor = await database.user.findFirstOrThrow({ where: { role: 'CONTENT_ADMIN', status: 'ACTIVE' } });
  const before=await admissionCounts(), masterBefore=await masterFingerprint();
  const dry = run('dry-run');expect(dry.status,dry.stderr||dry.stdout).toBe(0);
  expect(await admissionCounts()).toEqual(before);
  const dryReport=JSON.parse(readFileSync(report,'utf8'));
  const source=await reconcileBeginnerSources(path.resolve('../..'));
  expect(source.lessons.flatMap(row=>row.vocabulary)).toHaveLength(41);
  expect(source.lessons.flatMap(row=>row.vocabulary).filter(row=>row.relationship==='CONTEXTUAL_SENSE_MATCH')).toHaveLength(20);
  await authorize(source.inventoryHash,dryReport.dryRun.hash,dryReport.dryRun.programId);
  const service=new BeginnerProgramImportService(database as unknown as PrismaService,new BeginnerImportAudioStorage(storageRoot));
  for(const mutate of [(value:typeof source)=>{value.inventoryHash='changed';},(value:typeof source)=>{value.lessons[0]!.rawSource+='\nchanged';},(value:typeof source)=>{value.lessons[0]!.audio[0]!.bytes[100]^=1;}]){
   const changed=structuredClone(source);mutate(changed);
   await expect(service.apply(changed,dryReport.dryRun.hash,{editorId:editor.id})).rejects.toThrow();
   expect(await admissionCounts()).toEqual(before);
  }
  const failing=new BeginnerProgramImportService(database as unknown as PrismaService,new FailAfterFirstAudio(storageRoot));
  await expect(failing.apply(source,dryReport.dryRun.hash,{editorId:editor.id})).rejects.toThrow('ISOLATED_STORAGE_FAILURE_AFTER_AUDIO');
  expect(await admissionCounts()).toEqual(before);
  expect(await masterFingerprint()).toBe(masterBefore);
  const stagedFiles=readdirSync(path.join(storageRoot,'beginner-r21-reviewed-audio'));
  expect(stagedFiles).toHaveLength(1);
  const first=source.lessons[0]!.audio[0]!;
  expect(sha(readFileSync(path.join(storageRoot,'beginner-r21-reviewed-audio',stagedFiles[0]!)))).toBe(first.fileSha256);
  const applied = run('apply', editor.id);expect(applied.status,applied.stderr||applied.stdout).toBe(0);
  const receipt=JSON.parse(readFileSync(report,'utf8')).result;
  expect(receipt.lessonBindings).toHaveLength(8);
  expect(receipt.inventoryHash).toBe(source.inventoryHash);
  const release=await database.programVersion.findUniqueOrThrow({where:{id:receipt.programVersionId}});
  expect(release.status).toBe('PUBLISHED');expect(release.curriculumRevisionIds).toHaveLength(2);
  expect(await database.learningProgram.findUnique({where:{id:receipt.programId}})).toMatchObject({availabilityStatus:'BETA',progressionPolicy:'ACTIVITY_COMPLETION'});
  const ids=receipt.lessonBindings.map((row:{lessonVersionId:string})=>row.lessonVersionId);
  expect(await database.activity.count({where:{lessonVersionId:{in:ids}}})).toBe(64);
  expect(await database.lessonVersionAudioArtifact.count({where:{lessonVersionId:{in:ids}}})).toBe(24);
  expect(readdirSync(path.join(storageRoot,'beginner-r21-reviewed-audio'))).toHaveLength(24);
  const evidence=await database.auditLog.findMany({where:{action:'beginner.r21.source-admitted',resourceId:{in:ids}}});
  const mappings=evidence.flatMap(row=>(row.metadata as {vocabulary:unknown[]}).vocabulary);
  expect(mappings).toHaveLength(41);
  expect(programImportHash(mappings.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))))).toBe(programImportHash(source.lessons.flatMap(row=>row.vocabulary).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))));
  expect(await masterFingerprint()).toBe(masterBefore);
  expect(await database.learnerProgramEnrollment.count()).toBe(before.enrollments);
  await expect(database.programVersion.update({where:{id:release.id},data:{snapshot:{}}})).rejects.toThrow(/immutable/u);
  const replay=run('apply',editor.id,'2');expect(replay.status,replay.stderr||replay.stdout).toBe(0);
  expect(JSON.parse(readFileSync(report,'utf8')).result).toEqual(receipt);
  expect(await database.programVersion.count({where:{programId:receipt.programId}})).toBe(1);
  expect(await masterFingerprint()).toBe(masterBefore);
  expect(await database.learnerProgramEnrollment.count()).toBe(before.enrollments);
  writeFileSync(path.join(runtime,'verification.json'),JSON.stringify({kind:'R21_HARDENED_IMPORT_VERIFIED',runtime,storageRoot,report,inventoryHash:source.inventoryHash,vocabularyEvidenceHash:source.vocabularyEvidence.sha256,masterFingerprint:masterBefore,before,after:await admissionCounts(),receipt,checks:['dry-run-zero-writes','changed-inventory-source-audio-rejected','rollback-after-first-audio','content-addressed-retry-reuse','exact41mappings20contextual','master-fingerprint-preserved','existing-enrollments-preserved','immutable-release','idempotent-replay']},null,2));
  console.log('R21_HARDENED_IMPORT_EVIDENCE '+path.join(runtime,'verification.json'));
 },300000);
});
