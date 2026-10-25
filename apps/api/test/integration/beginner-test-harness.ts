import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {audioScriptFingerprintText,parseLessonSource} from '@worklingo/content-format';
import {beginnerTargetSchema,type BeginnerTarget,type BeginnerPermission} from '@worklingo/contracts';
import {installBeginnerNetworkGuard,readApprovedBeginnerPermissionSync,preflightBeginnerEnvironment,verifyBeginnerDatabaseIdentity,hashBeginnerRecord} from '../../src/beginner/domain/beginner-environment-preflight.js';
import {BeginnerAuthoringPolicy,verifyBeginnerTarget,lockBeginnerContext,type BeginnerActor} from '../../src/beginner/domain/beginner-authoring-policy.js';
import {PrismaService} from '../../src/common/database/prisma.service.js';
import {LocalObjectStorageAdapter} from '../../src/storage/infrastructure/local-object-storage.adapter.js';
import {ContentImportsService} from '../../src/content-authoring/application/content-imports.service.js';
import {ContentPublisherService} from '../../src/content-authoring/application/content-publisher.service.js';
import {FoundationCurriculumService} from '../../src/curriculum-foundation/application/foundation-curriculum.service.js';
import {AdminCurriculumCommandService} from '../../src/admin-curriculum/application/admin-curriculum-command.service.js';
import {BeginnerAuthoringService} from '../../src/beginner/application/beginner-authoring.service.js';
import {BeginnerReleaseService} from '../../src/beginner/application/beginner-release.service.js';

/** No .env, fallback database, provisioning, migrations, seed or automatic cleanup. */
export function requireBeginnerTestEnvironment():BeginnerPermission{
 const p=readApprovedBeginnerPermissionSync();
 if(!p||!p.actions.includes('read'))throw Error('BLOCKED: separate Beginner environment authorization required');
 const url=process.env.TEST_DATABASE_URL;
 if(!url||process.env.DATABASE_URL!==url||process.env.NODE_ENV!=='test'||process.env.WORKLINGO_BEGINNER_ISOLATED_TEST!=='1')throw Error('BLOCKED: explicit isolated test configuration required');
 return preflightBeginnerEnvironment(p,url);
}
export function sanitizedBeginnerChildEnvironment(p:BeginnerPermission,url:string):Record<string,string>{
 preflightBeginnerEnvironment(p,url);
 const result:Record<string,string>={NODE_ENV:'test',DATABASE_URL:url,TEST_DATABASE_URL:url,WORKLINGO_BEGINNER_ISOLATED_TEST:'1',WORKLINGO_BEGINNER_APPROVAL_ROOT:p.approvalRoot,WORKLINGO_BEGINNER_PERMISSION_ID:p.approvalId,WORKLINGO_DATA_DIR:p.storageRoot,JOB_WORKER_ENABLED:'false',WORKLINGO_LANGUAGE_EVALUATION_PROVIDER:'fake',WORKLINGO_STT_PROVIDER:'fake',WORKLINGO_TTS_PROVIDER:'fake-tts',OPENAI_API_KEY:'',OPENAI_BASE_URL:'',MICROSOFT_SPEECH_KEY:'',MICROSOFT_SPEECH_REGION:'',DISCOVERY_API_KEY:''};
 for(const name of ['SystemRoot','WINDIR','PATH','Path','TEMP','TMP'])if(process.env[name])result[name]=process.env[name]!;
 return result;
}
const fixtureSchema=z.object({target:beginnerTargetSchema,editorId:z.uuid(),reviewerId:z.uuid(),manifest:z.unknown(),historicalSessionId:z.uuid().optional(),learnerId:z.uuid().optional(),historicalVersionId:z.uuid().optional()}).strict();
export function readBeginnerFixtureDescriptor(p:BeginnerPermission){
 const root=path.join(p.ownedTempRoot,p.runId),file=path.join(root,'fixture-descriptor.json');
 if(lstatSync(file).isSymbolicLink()||realpathSync(file)!==file)throw Error('BLOCKED: unsafe fixture descriptor');
 const fixture=fixtureSchema.parse(JSON.parse(readFileSync(file,'utf8')));
 if(fixture.target.programId!==p.programId||fixture.editorId===fixture.reviewerId)throw Error('BLOCKED: fixture target/reviewer mismatch');return fixture;
}
export async function openBeginnerHarness(){
 const permission=requireBeginnerTestEnvironment(),fixture=readBeginnerFixtureDescriptor(permission);
 const restoreNetwork=installBeginnerNetworkGuard();
 const db=new PrismaService({datasourceUrl:process.env.TEST_DATABASE_URL!});
 // The first live statement is read-only identity validation, before any test write.
 try{await verifyBeginnerDatabaseIdentity(db,permission);}catch(error){await db.$disconnect();restoreNetwork();throw error;}
 const policy=new BeginnerAuthoringPolicy({readPermission:async()=>readApprovedBeginnerPermissionSync(),verifyEnvironment:verifyBeginnerDatabaseIdentity,verifyTarget:verifyBeginnerTarget});
 const storage=new LocalObjectStorageAdapter(permission.storageRoot),imports=new ContentImportsService(db),foundation=new FoundationCurriculumService(db),publisher=new ContentPublisherService(db,undefined,storage),curriculum=new AdminCurriculumCommandService(db);
 const authoring=new BeginnerAuthoringService(db,policy,imports,publisher,foundation,curriculum,storage),registry=new BeginnerReleaseService(db,policy,storage);
 const editor:BeginnerActor={id:fixture.editorId,roles:['CONTENT_ADMIN']},reviewer:BeginnerActor={id:fixture.reviewerId,roles:['CONTENT_ADMIN']};
 for(const actor of [editor,reviewer]){const row=await db.user.findUnique({where:{id:actor.id}});if(!row||row.status!=='ACTIVE'||!['SYSTEM_ADMIN','CONTENT_ADMIN'].includes(row.role)){await db.$disconnect();throw Error('BLOCKED: owner-provisioned synthetic Admin missing');}}
 await policy.authorize(editor,'read',fixture.target,db);
 return {permission,fixture,db,policy,storage,imports,foundation,authoring,registry,editor,reviewer,close:async()=>{try{await db.$disconnect();}finally{restoreNetwork();}}};
}
/** Future authorized fixture attachment only. Real PCM bytes/checksums, never a provider. */
export async function attachBeginnerFixtureAudio(h:Awaited<ReturnType<typeof openBeginnerHarness>>,actor:BeginnerActor,target:BeginnerTarget,rawSource:string){
 await h.policy.authorize(actor,'fixture-audio',target,h.db);
 if(!target.importId)throw Error('Explicit fixture import required');
 const selection:Record<string,string>={};
 for(const script of parseLessonSource(rawSource).document.audioScripts){
  const body=Buffer.alloc(44+1600);body.write('RIFF');body.writeUInt32LE(body.length-8,4);body.write('WAVEfmt ',8);body.writeUInt32LE(16,16);body.writeUInt16LE(1,20);body.writeUInt16LE(1,22);body.writeUInt32LE(8000,24);body.writeUInt32LE(16000,28);body.writeUInt16LE(2,32);body.writeUInt16LE(16,34);body.write('data',36);body.writeUInt32LE(1600,40);
  const scriptHash=createHash('sha256').update(audioScriptFingerprintText(script)).digest('hex'),checksum=createHash('sha256').update(body).digest('hex');
  let key:string|undefined;
  try{const artifact=await h.db.$transaction(async tx=>{
   const context=await h.policy.authorize(actor,'fixture-audio',target,tx);await lockBeginnerContext(tx,context,actor.id,'fixture-audio');
   const current=await tx.contentImport.findUniqueOrThrow({where:{id:target.importId!}});if(current.rawSource!==rawSource)throw Error('BEGINNER_FIXTURE_SOURCE_CHANGED');
   const stored=await h.storage.put({body,contentType:'audio/wav',prefix:'beginner/'+h.permission.runId+'/fixture-audio'});key=stored.key;
   const row=await tx.audioArtifact.create({data:{contentImportId:target.importId!,audioScriptSlug:script.slug,scriptHash,variantKey:'synthetic-fixture',generationKey:randomUUID(),adapterName:'fixture-pcm',voiceConfig:{fixtureOnly:true},mimeType:'audio/wav',byteSize:body.length,checksum,storageKey:key,status:'READY'}});
   await tx.mutationReceipt.create({data:{actorId:actor.id,operation:'beginner:fixture-audio',idempotencyKey:randomUUID(),requestHash:hashBeginnerRecord({environmentId:h.permission.environmentId,target,scriptHash,checksum}),responseStatus:200,responseBody:{audioArtifactId:row.id,fixtureOnly:true}}});return row;
  });selection[script.slug]=artifact.id;}catch(error){if(key)await h.storage.delete(key);throw error;}
 }
 return selection;
}
