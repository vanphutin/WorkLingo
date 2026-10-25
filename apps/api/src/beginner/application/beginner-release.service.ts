import {createHash,randomUUID} from 'node:crypto';
import {closeSync,fsyncSync,linkSync,lstatSync,openSync,readFileSync,realpathSync,unlinkSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {analyzeLessonSource,audioScriptFingerprintText,parseLessonSource} from '@worklingo/content-format';
import {assertBeginnerCurriculumReview,assertBeginnerPublishedReview} from '../domain/beginner-publication-policy.js';
import {BadRequestException,ConflictException,ForbiddenException} from '@nestjs/common';
import {beginnerTargetSchema,beginnerManifestSchema,beginnerReleaseEnvelopeSchema,beginnerEditorialPlan,hashBeginnerManifest,type BeginnerManifestV1,type BeginnerReleaseEnvelope,type BeginnerPermission,type BeginnerAction} from '@worklingo/contracts';
import type {Prisma} from '@prisma/client';
import type {PrismaService} from '../../common/database/prisma.service.js';
import type {ObjectStorage} from '../../storage/domain/object-storage.port.js';
import {lessonSnapshotSchema} from '../../curriculum/domain/curriculum.types.js';
import type {BeginnerAuthoringPolicy,BeginnerActor} from '../domain/beginner-authoring-policy.js';
import {hashBeginnerRecord} from '../domain/beginner-environment-preflight.js';

export interface BeginnerRegistryPort {read(root:string,key:string):Promise<unknown>;write(root:string,key:string,value:unknown):Promise<void>}
const opaque=z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/u),digest=z.string().regex(/^[a-f0-9]{64}$/u);
const approvalSchema=z.object({schemaVersion:z.literal(1),action:z.literal('approve-test-release'),approvalId:opaque,environmentId:z.string().min(1),releaseId:opaque,candidateHash:digest,approvedBy:z.string().min(1),authorizationSource:z.string().min(1),expiresAt:z.iso.datetime(),revoked:z.literal(false),recordHash:digest}).strict();
export type BeginnerReleaseApproval=z.infer<typeof approvalSchema>;
function deny(code:string):never{throw new ConflictException(code);}
function safeFile(root:string,key:string):string{
 if(!path.isAbsolute(root)||!/^[-a-zA-Z0-9_]+\.(?:candidate|approved|json)$/u.test(key))throw new ForbiddenException('BEGINNER_REGISTRY_PATH');
 const real=realpathSync(root);if(path.normalize(real)!==path.normalize(root))throw new ForbiddenException('BEGINNER_REGISTRY_PATH');
 for(let current=path.resolve(root);;current=path.dirname(current)){if(lstatSync(current).isSymbolicLink())throw new ForbiddenException('BEGINNER_REGISTRY_PATH');if(path.dirname(current)===current)break;}
 return path.join(real,key);
}
export const nativeBeginnerRegistry:BeginnerRegistryPort={
 async read(root,key){const file=safeFile(root,key),stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw new ForbiddenException('BEGINNER_REGISTRY_PATH');return JSON.parse(readFileSync(file,'utf8')) as unknown;},
 async write(root,key,value){
  const file=safeFile(root,key),temp=path.join(root,'.'+randomUUID()+'.pending');let fd:number|undefined;
  try{fd=openSync(temp,'wx',0o600);writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);closeSync(fd);fd=undefined;try{linkSync(temp,file);}catch{deny('BEGINNER_REGISTRY_EXISTS');}}
  finally{if(fd!==undefined)closeSync(fd);try{unlinkSync(temp);}catch{/* No recursive cleanup. */}}
 }
};
export async function readTrustedBeginnerReleaseApproval(permission:BeginnerPermission,ref:string):Promise<unknown>{
 opaque.parse(ref);return nativeBeginnerRegistry.read(permission.approvalRoot,ref+'.json');
}
function candidateHash(envelope:Omit<BeginnerReleaseEnvelope,'candidateHash'>|BeginnerReleaseEnvelope):string{
 const {state:_state,approvalRef:_ref,...data}=envelope;
 const clean=Object.fromEntries(Object.entries(data).filter(([key])=>key!=='candidateHash'));
 return hashBeginnerRecord(clean);
}
export class BeginnerReleaseService{
 constructor(private readonly database:PrismaService,private readonly policy:BeginnerAuthoringPolicy,private readonly storage:Pick<ObjectStorage,'read'>,private readonly files:BeginnerRegistryPort=nativeBeginnerRegistry,private readonly approvalReader:(p:BeginnerPermission,ref:string)=>Promise<unknown>=readTrustedBeginnerReleaseApproval){}
 private async permission(actor:BeginnerActor,action:BeginnerAction){
  const permission=await this.policy.permission();if(!permission)throw new ForbiddenException('BEGINNER_PERMISSION_REQUIRED');
  await this.policy.authorize(actor,action,{programId:permission.programId},this.database);return permission;
 }
 private parseManifest(raw:unknown):BeginnerManifestV1{
  try{const input={...(raw as object),hash:hashBeginnerManifest(raw)};opaque.parse(input&&'releaseId'in input?input.releaseId:null);return beginnerManifestSchema.parse(input);}catch{throw new BadRequestException('BEGINNER_INVALID_MANIFEST');}
 }
 private async collect(actor:BeginnerActor,tx:Prisma.TransactionClient,manifest:BeginnerManifestV1,permission:BeginnerPermission){
  if(manifest.programId!==permission.programId)deny('BEGINNER_RELEASE_ENVIRONMENT');
  const selectedPath=await tx.learningPath.findUnique({where:{id:manifest.pathId}});
  if(!selectedPath||selectedPath.programId!==manifest.programId)deny('BEGINNER_RELEASE_PATH');
  const curriculumSnapshots:BeginnerReleaseEnvelope['curriculumSnapshots']=[],snapshots:BeginnerReleaseEnvelope['snapshots']=[],assets:BeginnerReleaseEnvelope['assets']=[],reviewReferences:string[]=[];
  const versions:string[]=[],revisions:string[]=[],assetIds:string[]=[];
  for(const stage of manifest.stages){
   const level=await tx.level.findUnique({where:{id:stage.levelId}}),planned=beginnerEditorialPlan.stages.find(s=>s.path===selectedPath.slug&&s.code.replaceAll('-','_').toUpperCase()===level?.code);
   if(!level||level.pathId!==manifest.pathId||!planned||hashBeginnerRecord(stage.expectedUnitCodes)!==hashBeginnerRecord(planned.units.map(u=>u.code.toLowerCase())))deny('BEGINNER_RELEASE_STAGE');
   for(const unit of stage.units){
    const mission=await tx.mission.findUnique({where:{id:unit.missionId}}),revision=await tx.curriculumRevision.findUnique({where:{id:unit.curriculumRevisionId},include:{lessons:{orderBy:{order:'asc'}}}});
    if(!mission||mission.levelId!==stage.levelId||!stage.expectedUnitCodes.includes(mission.slug)||!revision||revision.missionId!==mission.id||revision.status!=='PUBLISHED'||revision.lessons.length!==unit.lessons.length||revision.lessons.some((binding,i)=>binding.lessonVersionId!==unit.lessons[i]?.lessonVersionId||binding.order!==unit.lessons[i]?.order))deny('BEGINNER_RELEASE_REVISION');
    const unitReview=await tx.auditLog.findFirst({where:{action:'beginner.curriculum.review',resourceId:mission.id,AND:[{metadata:{path:['revision'],equals:revision.revision}},{metadata:{path:['definitionHash'],equals:hashBeginnerRecord(revision.snapshot)}}]},orderBy:{createdAt:'asc'}});
    const unitMetadata=unitReview?.metadata as {editorId?:string}|null;
    if(!unitReview||!unitMetadata?.editorId)deny('BEGINNER_RELEASE_UNIT_REVIEW');
    assertBeginnerCurriculumReview(unitReview.metadata,{environmentId:permission.environmentId,target:{programId:manifest.programId,pathId:manifest.pathId,levelId:stage.levelId,missionId:mission.id},revision:revision.revision,definitionHash:hashBeginnerRecord(revision.snapshot),editorId:unitMetadata.editorId},unitReview.actorId);
    if(!reviewReferences.includes(unitReview.id))reviewReferences.push(unitReview.id);
    curriculumSnapshots.push({curriculumRevisionId:revision.id,snapshotHash:hashBeginnerRecord(revision.snapshot)});
    revisions.push(revision.id);
    for(const member of unit.lessons){
     const target={programId:manifest.programId,pathId:manifest.pathId,levelId:stage.levelId,missionId:mission.id,lessonId:member.lessonId};
     // Relational ancestry/exclusive ownership is checked for each historical version.
     await this.policy.authorize(actor,'read',target,tx);
     const version=await tx.lessonVersion.findUnique({where:{id:member.lessonVersionId}});
     if(!version||version.lessonId!==member.lessonId||version.status!=='PUBLISHED')deny('BEGINNER_RELEASE_VERSION');
     const snapshot=lessonSnapshotSchema.parse(version.parsedContent);if(snapshot.formatVersion!=='WorkLingoLesson/1.2')deny('BEGINNER_RELEASE_FORMAT');
     const audit=await tx.auditLog.findFirst({where:{resourceId:version.id,action:'PUBLISH_LESSON'},orderBy:{createdAt:'asc'}});
     const parsedEvidence=z.object({kind:z.literal('BEGINNER_PUBLICATION_V1'),environmentId:z.string(),sourceHash:digest,validationHash:digest,snapshotHash:digest,rawSource:z.string(),target:beginnerTargetSchema,reviewHash:digest,draftRevision:z.number().int().positive(),selectedAudioArtifacts:z.record(z.string(),z.uuid())}).safeParse(audit?.metadata);
     if(!parsedEvidence.success)deny('BEGINNER_RELEASE_EVIDENCE');const evidence=parsedEvidence.data;
     if(!evidence||evidence.kind!=='BEGINNER_PUBLICATION_V1'||evidence.environmentId!==permission.environmentId||evidence.target?.lessonId!==member.lessonId||evidence.target.missionId!==mission.id||evidence.sourceHash!==version.sourceHash||evidence.validationHash!==version.sourceHash||evidence.snapshotHash!==hashBeginnerRecord(snapshot)||typeof evidence.rawSource!=='string'||createHash('sha256').update(evidence.rawSource).digest('hex')!==version.sourceHash)deny('BEGINNER_RELEASE_EVIDENCE');
     const reviews=await tx.auditLog.findMany({where:{action:'beginner.review',metadata:{path:['reviewHash'],equals:evidence.reviewHash}},take:2});
     if(reviews.length!==1||!reviews[0])deny('BEGINNER_RELEASE_REVIEW');
     const review=reviews[0];
     const normalized=analyzeLessonSource(evidence.rawSource).normalizedDraft;if(!normalized)deny('BEGINNER_RELEASE_EVIDENCE');
     assertBeginnerPublishedReview(review.metadata,{environmentId:permission.environmentId,target:evidence.target,draftRevision:evidence.draftRevision,sourceHash:evidence.sourceHash,validationHash:evidence.validationHash,normalizedSnapshotHash:hashBeginnerRecord(normalized),audioSelectionHash:hashBeginnerRecord(evidence.selectedAudioArtifacts),selectedAudioArtifacts:evidence.selectedAudioArtifacts,reviewHash:evidence.reviewHash});
     if((review.metadata as Record<string,unknown>).actorId!==review.actorId)deny('BEGINNER_RELEASE_REVIEW');
     if(!reviewReferences.includes(review.id))reviewReferences.push(review.id);
     snapshots.push({lessonVersionId:version.id,sourceHash:version.sourceHash,snapshotHash:hashBeginnerRecord(snapshot)});versions.push(version.id);
     const refs=await tx.lessonVersionAudioArtifact.findMany({where:{lessonVersionId:version.id},include:{audioArtifact:true}});
     const doc=parseLessonSource(evidence.rawSource).document,required=[...new Set(doc.activities.filter(a=>a.activityType==='listening').map(a=>a.audioRef))];
     if(required.includes(undefined)||refs.length!==required.length||Object.keys(evidence.selectedAudioArtifacts).length!==required.length||required.some(ref=>!refs.some(a=>a.audioScriptSlug===ref&&a.audioArtifactId===evidence.selectedAudioArtifacts[ref!])))deny('BEGINNER_RELEASE_AUDIO');
     for(const ref of refs){const a=ref.audioArtifact,script=doc.audioScripts.find(s=>s.slug===ref.audioScriptSlug);if(!script||createHash('sha256').update(audioScriptFingerprintText(script)).digest('hex')!==a.scriptHash||a.status!=='READY')deny('BEGINNER_RELEASE_AUDIO');const bytes=await this.storage.read(a.storageKey);if(bytes.length!==a.byteSize||createHash('sha256').update(bytes).digest('hex')!==a.checksum)deny('BEGINNER_RELEASE_ASSET_HASH');
      if(!assetIds.includes(a.id)){assetIds.push(a.id);assets.push({id:a.id,key:a.storageKey,sha256:a.checksum,scriptHash:a.scriptHash});}
     }
    }
   }
  }
  const rows=await tx.mutationReceipt.findMany({where:{operation:{in:['beginner:publish','beginner:foundation:publish','beginner:fixture-audio']},responseStatus:{gte:200,lt:300},OR:[...versions.map(v=>({responseBody:{path:['lessonVersionId'],equals:v}})),...revisions.map(v=>({responseBody:{path:['id'],equals:v}})),...assetIds.map(v=>({responseBody:{path:['audioArtifactId'],equals:v}}))]},take:1000,orderBy:{createdAt:'asc'}});
  const result=(r:typeof rows[number])=>r.responseBody as Record<string,unknown>;
  for(const id of versions)if(!rows.some(r=>r.operation==='beginner:publish'&&result(r).lessonVersionId===id))deny('BEGINNER_RELEASE_RECEIPT');
  for(const id of revisions)if(!rows.some(r=>r.operation==='beginner:foundation:publish'&&result(r).id===id))deny('BEGINNER_RELEASE_RECEIPT');
  for(const id of assetIds)if(!rows.some(r=>r.operation==='beginner:fixture-audio'&&result(r).audioArtifactId===id))deny('BEGINNER_RELEASE_RECEIPT');
  const selected=[...versions.map(id=>rows.find(r=>r.operation==='beginner:publish'&&result(r).lessonVersionId===id)!),...revisions.map(id=>rows.find(r=>r.operation==='beginner:foundation:publish'&&result(r).id===id)!),...assetIds.map(id=>rows.find(r=>r.operation==='beginner:fixture-audio'&&result(r).audioArtifactId===id)!)];
  const receipts=[...new Map(selected.map(r=>[r.id,r])).values()].map(r=>({id:r.id,operation:r.operation,requestHash:r.requestHash}));return {snapshots,curriculumSnapshots,assets,receipts,reviewReferences};
 }
 private async verify(actor:BeginnerActor,record:BeginnerReleaseEnvelope,p:BeginnerPermission){
  if(record.environmentId!==p.environmentId||record.manifest.programId!==p.programId||record.candidateHash!==candidateHash(record))deny('BEGINNER_RELEASE_ENVIRONMENT');
  const evidence=await this.database.$transaction(tx=>this.collect(actor,tx,record.manifest,p),{isolationLevel:'RepeatableRead'});
  for(const key of ['snapshots','curriculumSnapshots','assets','receipts','reviewReferences'] as const)if(hashBeginnerRecord(evidence[key])!==hashBeginnerRecord(record[key]))deny('BEGINNER_RELEASE_MODIFIED');
  await this.policy.authorize(actor,'read',{programId:p.programId,pathId:record.manifest.pathId},this.database);
 }
 async exportTestCandidate(actor:BeginnerActor,raw:unknown):Promise<BeginnerReleaseEnvelope>{
  const manifest=this.parseManifest(raw),p=await this.permission(actor,'export');
  const data=await this.database.$transaction(tx=>this.collect(actor,tx,manifest,p),{isolationLevel:'RepeatableRead'});
  const base={schemaVersion:1 as const,state:'TEST_PUBLISHED' as const,environmentId:p.environmentId,releaseId:manifest.releaseId,fixtureOnly:true as const,contentReadiness:'FIXTURE_ONLY' as const,manifest,...data,approvalRef:null};
  const envelope=beginnerReleaseEnvelopeSchema.parse({...base,candidateHash:candidateHash(base)});
  const fresh=await this.permission(actor,'export');if(fresh.recordHash!==p.recordHash)throw new ForbiddenException('BEGINNER_SCOPE_MISMATCH');
  await this.files.write(p.registryRoot,envelope.releaseId+'.candidate',envelope);return envelope;
 }
 private async approval(p:BeginnerPermission,ref:string,candidate:BeginnerReleaseEnvelope){
  let raw:unknown;try{opaque.parse(ref);raw=await this.approvalReader(p,ref);}catch{deny('BEGINNER_RELEASE_APPROVAL_REQUIRED');}
  const parsed=approvalSchema.safeParse(raw);if(!parsed.success)deny('BEGINNER_RELEASE_APPROVAL_REQUIRED');
  const {recordHash,...data}=parsed.data;
  if(recordHash!==hashBeginnerRecord(data)||data.approvalId!==ref||data.environmentId!==p.environmentId||data.releaseId!==candidate.releaseId||data.candidateHash!==candidate.candidateHash||Date.parse(data.expiresAt)<=Date.now())deny('BEGINNER_RELEASE_APPROVAL_REQUIRED');
 }
 async approveTestRelease(actor:BeginnerActor,releaseId:string,approvalRef:string):Promise<BeginnerReleaseEnvelope>{
  opaque.parse(releaseId);const p=await this.permission(actor,'approve-release');
  const candidate=beginnerReleaseEnvelopeSchema.parse(await this.files.read(p.registryRoot,releaseId+'.candidate'));
  if(candidate.releaseId!==releaseId)deny('BEGINNER_RELEASE_IDENTITY');
  if(candidate.state!=='TEST_PUBLISHED')deny('BEGINNER_RELEASE_STATE');await this.verify(actor,candidate,p);await this.approval(p,approvalRef,candidate);
  const envelope=beginnerReleaseEnvelopeSchema.parse({...candidate,state:'APPROVED_RELEASE',approvalRef});
  const fresh=await this.permission(actor,'approve-release');if(fresh.recordHash!==p.recordHash)throw new ForbiddenException('BEGINNER_SCOPE_MISMATCH');await this.approval(fresh,approvalRef,candidate);
  await this.files.write(p.registryRoot,releaseId+'.approved',envelope);return envelope;
 }
 async loadApprovedBeginnerRelease(actor:BeginnerActor,releaseId:string,environmentId:string):Promise<BeginnerManifestV1>{
  opaque.parse(releaseId);const p=await this.permission(actor,'read');if(environmentId!==p.environmentId)deny('BEGINNER_RELEASE_ENVIRONMENT');
  const record=beginnerReleaseEnvelopeSchema.parse(await this.files.read(p.registryRoot,releaseId+'.approved'));
  if(record.releaseId!==releaseId)deny('BEGINNER_RELEASE_IDENTITY');
  if(record.state!=='APPROVED_RELEASE'||!record.approvalRef)deny('BEGINNER_RELEASE_STATE');await this.verify(actor,record,p);await this.approval(p,record.approvalRef,record);return record.manifest;
 }
}
