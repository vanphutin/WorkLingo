import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, open, stat } from 'node:fs/promises';
import path from 'node:path';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { LocalObjectStorageAdapter } from '../src/storage/infrastructure/local-object-storage.adapter.js';
import { ieltsContentRoot } from '../src/ielts-study/infrastructure/topic-content.js';
import { loadIeltsV3Bundle, releaseName } from '../src/ielts-flow/release/release-content.js';
import { assertIeltsV3LocalTarget, assertIeltsV3Review, localIeltsStorage, parseIeltsV3ReleaseOptions } from '../src/ielts-flow/release/release-policy.js';
import { executeIeltsV3Release, inspectIeltsV3Release } from '../src/ielts-flow/release/release-v3.js';

async function privateSnapshot(value:unknown) {
  const directory=path.join(ieltsContentRoot,'.private');await mkdir(directory,{recursive:true,mode:0o700});
  if(process.platform==='win32'){
    const identity=execFileSync('whoami.exe',[],{encoding:'utf8',windowsHide:true}).trim();
    execFileSync('icacls.exe',[directory,'/inheritance:r','/grant:r',`${identity}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{stdio:'pipe',windowsHide:true});
  }
  const file=path.join(directory,`before-${Date.now()}.json`),handle=await open(file,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(value,null,2));await handle.sync();}finally{await handle.close();}
  return directory;
}
export async function releaseIeltsFlowV3(args:string[]) {
  const env=path.resolve(__dirname,'../../../.env');if(existsSync(env))process.loadEnvFile(env);
  const options=parseIeltsV3ReleaseOptions(args),storageRoot=process.env.WORKLINGO_DATA_DIR??localIeltsStorage;
  assertIeltsV3LocalTarget(process.env.DATABASE_URL??'',storageRoot);
  if(!(await stat(storageRoot)).isDirectory())throw new Error('Existing local storage is required.');
  const bundle=await loadIeltsV3Bundle();let reviewReady=true;
  try{assertIeltsV3Review(bundle.review,bundle.contentFingerprint);}catch{reviewReady=false;}
  const db=new PrismaService({log:[],errorFormat:'minimal'});
  try{
    const target=await db.$queryRaw<Array<{name:string;schema:string;topic:string|null}>>`SELECT current_database() AS name,current_schema() AS schema,to_regclass('"IeltsTopic"')::text AS topic`;
    if(target[0]?.name!=='worklingo'||target[0].schema!=='public')throw new Error('Unexpected database/schema.');
    const actor=await db.user.findFirst({where:{role:{in:['CONTENT_ADMIN','SYSTEM_ADMIN']},status:'ACTIVE'},orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true}});
    if(!actor)throw new Error('An active local administrator is required.');
    const inspection=target[0].topic?await db.$transaction(tx=>inspectIeltsV3Release(tx,bundle,actor.id),{isolationLevel:'RepeatableRead'}):null;
    console.log(JSON.stringify({release:releaseName,mode:options.execute?'EXECUTE':'DRY_RUN',schemaReady:!!inspection,reviewReady,contentFingerprint:bundle.contentFingerprint,fingerprint:inspection?.fingerprint??null,complete:inspection?.complete??false,proposed:{introductionSlides:bundle.introduction.slides.length,topics:bundle.topics.length,chunks:144,durations:[90,120,150],listeningQuestions:40,readingQuestions:40,listeningSeconds:bundle.audioManifest.reduce((sum,entry)=>sum+entry.durationSeconds,0),mockModes:['PRACTICE','EXAM_SIMULATION'],preservesLearnerEvidence:true},pending:[...(!inspection?['Back up and apply the three additive V3/media/playback migrations.']:[]),...(!reviewReady?['Record actual source-bound human audio audition and final content qualification.']:[])]},null,2));
    if(!options.execute)return 'DRY_RUN';
    if(!inspection)throw new Error('Additive migrations must be reviewed/applied after backup before execute.');
    assertIeltsV3Review(bundle.review,bundle.contentFingerprint);
    if(options.expect!==inspection.fingerprint)throw new Error('Reviewed dry-run fingerprint changed.');
    if(inspection.complete)return executeIeltsV3Release(db,new LocalObjectStorageAdapter(storageRoot),bundle,actor.id,inspection.fingerprint);
    const directory=await privateSnapshot({release:releaseName,createdAt:new Date().toISOString(),contentFingerprint:bundle.contentFingerprint,inspection});
    // Backup tool already validates schema/paths and uses the exact requested local
    // endpoint. Credentials stay in the environment and out of arguments/output.
    execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.resolve(__dirname,'../../../scripts/backup-local.ps1'),'-BackupRoot',path.join(directory,'backups'),'-AllowedRoot',directory,'-DataDir',storageRoot,'-Schema','public'],{env:{...process.env},stdio:'pipe',windowsHide:true,timeout:120000});
    const result=await executeIeltsV3Release(db,new LocalObjectStorageAdapter(storageRoot),bundle,actor.id,inspection.fingerprint);
    console.log(`Result: ${result}. Set WORKLINGO_IELTS_FLOW=v3 only after final verification. Roll back with legacy; keep immutable versions and learner pins.`);return result;
  }finally{await db.$disconnect();}
}
if(require.main===module)void releaseIeltsFlowV3(process.argv.slice(2)).catch(error=>{console.error(error instanceof Error&& !/prisma|postgresql:\/\//iu.test(error.message)?error.message:'IELTS V3 release stopped; inspect private diagnostics.');process.exitCode=1;});
