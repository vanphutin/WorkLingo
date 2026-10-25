import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {parseLessonSource} from '@worklingo/content-format';
import {lessonSnapshotSchema,type LessonSnapshot} from '../../curriculum/domain/curriculum.types.js';
import {planBeginnerSession} from '../../learning-sessions/domain/beginner-session-planner.js';
import {projectLearnerActivity} from '../../learning-sessions/domain/learner-activity-projection.js';
import {BadRequestException,ConflictException,ForbiddenException,Inject,Injectable,NotFoundException,UnprocessableEntityException} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {analyzeLessonSource} from '@worklingo/content-format';
import {
 beginnerEditorialPlan,beginnerTargetSchema,beginnerWriteSchema,
 createLearningPathInputSchema,createLevelInputSchema,createMissionInputSchema,updateMissionInputSchema,
 saveFoundationDraftSchema,foundationCommandSchema,
 type BeginnerTarget,type BeginnerAction,type BeginnerWriteInput,type FoundationCommand,type SaveFoundationDraftInput
} from '@worklingo/contracts';
import {PrismaService} from '../../common/database/prisma.service.js';
import {ContentImportsService} from '../../content-authoring/application/content-imports.service.js';
import {ContentPublisherService} from '../../content-authoring/application/content-publisher.service.js';
import {FoundationCurriculumService} from '../../curriculum-foundation/application/foundation-curriculum.service.js';
import {AdminCurriculumCommandService} from '../../admin-curriculum/application/admin-curriculum-command.service.js';
import {ObjectStorage} from '../../storage/domain/object-storage.port.js';
import {BeginnerAuthoringPolicy,beginnerContextDescriptor,lockBeginnerContext,type BeginnerActor,type BeginnerAuthoringContext} from '../domain/beginner-authoring-policy.js';
import {hashBeginnerRecord} from '../domain/beginner-environment-preflight.js';
import {assertBeginnerCurriculumReview,createBeginnerReview,verifyBeginnerAudioSelection} from '../domain/beginner-publication-policy.js';
import {buildBeginnerDraftSnapshot} from '../../curriculum-foundation/application/foundation-validation.js';

function parseTarget(raw:unknown){const parsed=beginnerTargetSchema.safeParse(raw);if(!parsed.success)throw new BadRequestException('Invalid Beginner target');return parsed.data;}
const json=(v:unknown)=>v as Prisma.InputJsonValue;
export interface BeginnerBinding {
 editorialCode:string;target:BeginnerTarget;status:string;draftRevision:number;sourceHash:string;reviewHash:string|null;
 lessonVersions:readonly {id:string;version:number;status:string}[];
}
@Injectable()
export class BeginnerAuthoringService {
 constructor(
 @Inject(PrismaService) private readonly database:PrismaService,
 @Inject(BeginnerAuthoringPolicy) private readonly policy:BeginnerAuthoringPolicy,
 @Inject(ContentImportsService) private readonly imports:ContentImportsService,
 @Inject(ContentPublisherService) private readonly publisher:ContentPublisherService,
 @Inject(FoundationCurriculumService) private readonly foundation:FoundationCurriculumService,
 @Inject(AdminCurriculumCommandService) private readonly curriculum:AdminCurriculumCommandService,
 @Inject(ObjectStorage) private readonly storage:ObjectStorage,
 ){}
 private admin(actor:BeginnerActor):void{if(!actor.roles.some(r=>r==='CONTENT_ADMIN'||r==='SYSTEM_ADMIN'))throw new ForbiddenException('BEGINNER_FORBIDDEN');}
 async getWorkspace(actor:BeginnerActor){
  this.admin(actor);
  const permission=await this.policy.permission();
  if(!permission)return {plan:beginnerEditorialPlan,paths:[],bindings:[] as BeginnerBinding[],writesEnabled:false,actions:[] as BeginnerAction[],environmentId:null};
  await this.policy.authorize(actor,'read',{programId:permission.programId},this.database);
  const paths=await this.database.learningPath.findMany({where:{programId:permission.programId},take:3,orderBy:{createdAt:'asc'},include:{levels:{orderBy:{order:'asc'},include:{missions:{orderBy:{order:'asc'},include:{lessons:{include:{lesson:{include:{versions:{select:{id:true,version:true,status:true},orderBy:{version:'desc'}},contentImports:{select:{id:true,sourceHash:true,draftRevision:true,status:true},orderBy:{createdAt:'desc'},take:10}}}}}}}}}}});
  if(paths.length>2||paths.flatMap(p=>p.levels).length>5)throw new ConflictException('BEGINNER_CURRICULUM_REVIEW_REQUIRED');
  const audits=await this.database.auditLog.findMany({where:{action:'beginner.bind'},orderBy:{createdAt:'desc'},take:1000});
  const bindings:BeginnerBinding[]=[],seen=new Set<string>();
  for(const audit of audits){
   const metadata=audit.metadata as {editorialCode?:unknown;target?:unknown}|null;
   if(typeof metadata?.editorialCode!=='string'||seen.has(metadata.editorialCode))continue;
   const parsed=beginnerTargetSchema.safeParse(metadata.target);if(!parsed.success||parsed.data.programId!==permission.programId)continue;
   const t=parsed.data,path=paths.find(p=>p.id===t.pathId),level=path?.levels.find(l=>l.id===t.levelId),mission=level?.missions.find(m=>m.id===t.missionId),binding=mission?.lessons.find(l=>l.lessonId===t.lessonId);
   const item=binding?.lesson.contentImports.find(i=>i.id===t.importId);
   if(!binding||!item)continue;
   seen.add(metadata.editorialCode);
   bindings.push({editorialCode:metadata.editorialCode,target:t,status:item.status,draftRevision:item.draftRevision,sourceHash:item.sourceHash,reviewHash:null,lessonVersions:binding.lesson.versions});
  }
  return {plan:beginnerEditorialPlan,paths,bindings,writesEnabled:permission.actions.includes('author'),actions:permission.actions,environmentId:permission.environmentId,programId:permission.programId};
 }
 private async transact<T>(actor:BeginnerActor,action:BeginnerAction,raw:unknown,operation:string,execute:(tx:Prisma.TransactionClient,context:BeginnerAuthoringContext,input:BeginnerWriteInput)=>Promise<T>):Promise<T>{
  const parsed=beginnerWriteSchema.safeParse(raw);if(!parsed.success)throw new BadRequestException('Invalid Beginner command');
  const input=parsed.data;
  // Permission is checked before opening a transaction, including receipt replays.
  await this.policy.authorize(actor,action,input.target,this.database);
  const permission=await this.policy.permission();if(!permission)throw new ForbiddenException('BEGINNER_PERMISSION_REQUIRED');
  const requestHash=hashBeginnerRecord({actorId:actor.id,environmentId:permission.environmentId,operation,input});
  return this.database.$transaction(async tx=>{
   const context=await this.policy.authorize(actor,action,input.target,tx);
   const receiptLock=actor.id+':beginner:'+operation+':'+input.idempotencyKey;
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${receiptLock},0))`;
   await lockBeginnerContext(tx,context,actor.id,action);
   const key={actorId:actor.id,operation:'beginner:'+operation,idempotencyKey:input.idempotencyKey};
   const receipt=await tx.mutationReceipt.findUnique({where:{actorId_operation_idempotencyKey:key}});
   if(receipt){if(receipt.requestHash!==requestHash)throw new ConflictException('BEGINNER_IDEMPOTENCY_CONFLICT');return receipt.responseBody as T;}
   const result=await execute(tx,context,input);
   await tx.mutationReceipt.create({data:{...key,requestHash,responseStatus:200,responseBody:json(result)}});
   return result;
  },{timeout:15000});
 }
 async createDraft(actor:BeginnerActor,raw:unknown){
  return this.transact(actor,'author',raw,'draft.create',async(tx,_context,input)=>{
   if(!input.rawSource||!input.target.missionId||!input.editorialCode)throw new BadRequestException('BEGINNER_EDITORIAL_CODE_REQUIRED');
   const planned=beginnerEditorialPlan.stages.flatMap(s=>s.units).find(u=>u.lessons.some(l=>l.code===input.editorialCode));
   const mission=await tx.mission.findUniqueOrThrow({where:{id:input.target.missionId},include:{level:true}});
   if(!planned||mission.slug!==planned.code.toLowerCase())throw new ConflictException('BEGINNER_EDITORIAL_TARGET_MISMATCH');
   const slug=parseLessonSource(input.rawSource).document.lesson?.slug;
   if(!slug)throw new UnprocessableEntityException('BEGINNER_SOURCE_SLUG_REQUIRED');
   let lessonId=input.target.lessonId;
   if(!lessonId){
    const collision=await tx.lesson.findUnique({where:{slug}});
    if(collision)throw new ConflictException('BEGINNER_LESSON_SLUG_COLLISION');
    const lesson=await tx.lesson.create({data:{slug}});lessonId=lesson.id;
    const order=Number(input.editorialCode.slice(-1));
    await tx.missionLesson.create({data:{missionId:mission.id,lessonId,order}});
   }else{
    const lesson=await tx.lesson.findUniqueOrThrow({where:{id:lessonId}});
    if(lesson.slug!==slug)throw new ConflictException('BEGINNER_LESSON_SLUG_MISMATCH');
   }
   const target={...input.target,lessonId};delete target.importId;
   const context=await this.policy.authorize(actor,'author',target,tx);
   const draft=await this.imports.create(actor.id,input.rawSource,undefined,context,tx);
   const bound={...target,importId:draft.id};
   await tx.auditLog.create({data:{actorId:actor.id,action:'beginner.source',resourceType:'ContentImport',resourceId:draft.id,contentImportId:draft.id,metadata:{sourceHash:draft.sourceHash,draftRevision:draft.draftRevision,target:bound}}});
   await tx.auditLog.create({data:{actorId:actor.id,action:'beginner.bind',resourceType:'ContentImport',resourceId:draft.id,contentImportId:draft.id,metadata:{editorialCode:input.editorialCode,target:bound}}});
   return {draft,target:bound};
  });
 }
 async updateSource(actor:BeginnerActor,raw:unknown){
  return this.transact(actor,'author',raw,'draft.update',async(tx,context,input)=>{
   if(!input.target.importId||!input.rawSource||input.expectedRevision===null)throw new BadRequestException('BEGINNER_DRAFT_REQUIRED');
   const draft=await this.imports.updateSource(input.target.importId,actor.id,{rawSource:input.rawSource,expectedDraftRevision:input.expectedRevision},context,tx);
   await tx.auditLog.create({data:{actorId:actor.id,action:'beginner.source',resourceType:'ContentImport',resourceId:draft.id,contentImportId:draft.id,metadata:{sourceHash:draft.sourceHash,draftRevision:draft.draftRevision,target:input.target}}});
   return draft;
  });
 }
 async validate(actor:BeginnerActor,raw:unknown){
  return this.transact(actor,'validate',raw,'draft.validate',async(tx,context,input)=>{
   if(!input.target.importId||input.expectedRevision===null)throw new BadRequestException('BEGINNER_DRAFT_REQUIRED');
   return this.imports.validate(input.target.importId,actor.id,input.expectedRevision,context,tx);
  });
 }
 async getImport(actor:BeginnerActor,rawTarget:unknown){
  const target=parseTarget(rawTarget);await this.policy.authorize(actor,'read',target,this.database);
  if(!target.importId)throw new BadRequestException('BEGINNER_DRAFT_REQUIRED');
  const draft=await this.imports.get(target.importId,actor.id);
  const audit=await this.database.auditLog.findFirst({where:{contentImportId:target.importId,action:'beginner.review'},orderBy:{createdAt:'desc'}});
  const metadata=audit?.metadata as {sourceHash?:string;draftRevision?:number;reviewHash?:string;selectedAudioArtifacts?:Record<string,string>}|null;
  const reviewHash=metadata?.sourceHash===draft.sourceHash&&metadata.draftRevision===draft.draftRevision?metadata.reviewHash??null:null;
  const audioArtifacts=await this.database.audioArtifact.findMany({where:{contentImportId:target.importId},select:{id:true,audioScriptSlug:true,scriptHash:true,status:true,checksum:true},take:100});
  return {draft,reviewHash,reviewKind:reviewHash?'FIXTURE_TECHNICAL_REVIEW':null,selectedAudioArtifacts:reviewHash?metadata?.selectedAudioArtifacts??{}:{},audioArtifacts};
 }
 async review(actor:BeginnerActor,raw:unknown){
  return this.transact(actor,'review',raw,'draft.review',async(tx,_context,input)=>{
   if(!input.target.importId||input.expectedRevision===null)throw new BadRequestException('BEGINNER_DRAFT_REQUIRED');
   const draft=await tx.contentImport.findUnique({where:{id:input.target.importId}});
   if(!draft)throw new NotFoundException('Beginner draft not found');
   if(draft.draftRevision!==input.expectedRevision||draft.sourceHash!==input.expectedSourceHash||draft.validationHash!==draft.sourceHash||draft.status!=='VALIDATED')throw new ConflictException('BEGINNER_REVIEW_STALE');
   const edit=await tx.auditLog.findFirst({where:{contentImportId:draft.id,action:'beginner.source'},orderBy:{createdAt:'desc'}});
   const sourceMetadata=edit?.metadata as {sourceHash?:string}|null;
   const provenance=sourceMetadata?.sourceHash===draft.sourceHash?edit?.actorId??'':'';
   const analysis=analyzeLessonSource(draft.rawSource);if(!analysis.canPublish||!analysis.normalizedDraft)throw new UnprocessableEntityException('BEGINNER_NOT_READY');
   const record=createBeginnerReview({environmentId:beginnerContextDescriptor(_context).environmentId,selectedAudioArtifacts:input.selectedAudioArtifacts,actorId:actor.id,editorId:provenance,target:input.target,draftRevision:draft.draftRevision,sourceHash:draft.sourceHash,validationHash:draft.validationHash,normalizedSnapshotHash:hashBeginnerRecord(analysis.normalizedDraft),audioSelectionHash:hashBeginnerRecord(input.selectedAudioArtifacts)});
   buildBeginnerDraftSnapshot(analysis.normalizedDraft);
   const parsed=await this.imports.getPreview(draft.id,actor.id);if(!parsed.canPublish)throw new ConflictException('BEGINNER_REVIEW_STALE');
   await verifyBeginnerAudioSelection(tx,draft.id,draft.rawSource,input.selectedAudioArtifacts,this.storage);
   await tx.auditLog.create({data:{actorId:actor.id,action:'beginner.review',resourceType:'ContentImport',resourceId:draft.id,contentImportId:draft.id,metadata:json(record)}});
   return {reviewHash:record.reviewHash,reviewKind:record.kind};
  });
 }
 async publish(actor:BeginnerActor,raw:unknown){
  const parsed=beginnerWriteSchema.safeParse(raw);if(!parsed.success)throw new BadRequestException('Invalid Beginner publication');
  const input=parsed.data;
  if(!input.target.importId||input.expectedRevision===null||!input.expectedSourceHash||!input.reviewHash)throw new BadRequestException('BEGINNER_REVIEW_REQUIRED');
  const context=await this.policy.authorize(actor,'publish',input.target,this.database);
  return this.publisher.publish(input.target.importId,actor.id,{expectedDraftRevision:input.expectedRevision,expectedSourceHash:input.expectedSourceHash,idempotencyKey:input.idempotencyKey,selectedAudioArtifacts:input.selectedAudioArtifacts},{context,reviewHash:input.reviewHash});
 }
 async node(actor:BeginnerActor,kind:string,rawTarget:unknown,raw:unknown){
  const target=parseTarget(rawTarget),context=await this.policy.authorize(actor,'author',target,this.database);
  const body=raw as Record<string,unknown>;
  switch(kind){
   case 'create-path':{
    const input=createLearningPathInputSchema.parse(raw);
    if(input.programId!==target.programId||!['mat-goc','co-ban'].includes(input.slug))throw new BadRequestException('BEGINNER_WRONG_PATH');
    return this.curriculum.createPath(actor.id,input,context);
   }
   case 'create-stage':{
    if(!target.pathId)throw new BadRequestException('BEGINNER_PATH_REQUIRED');
    const input=createLevelInputSchema.parse(raw),stage=beginnerEditorialPlan.stages.find(s=>s.code.replaceAll('-','_').toUpperCase()===input.code);
    const path=await this.database.learningPath.findUnique({where:{id:target.pathId}});
    if(!stage||path?.slug!==stage.path)throw new BadRequestException('BEGINNER_WRONG_STAGE');
    return this.curriculum.createLevel(actor.id,input,context);
   }
   case 'create-unit':{
    if(!target.levelId)throw new BadRequestException('BEGINNER_STAGE_REQUIRED');
    const input=createMissionInputSchema.parse(raw),level=await this.database.level.findUnique({where:{id:target.levelId}});
    if(!beginnerEditorialPlan.stages.find(s=>s.code.replaceAll('-','_').toUpperCase()===level?.code)?.units.some(u=>u.code.toLowerCase()===input.slug))throw new BadRequestException('BEGINNER_WRONG_UNIT');
    return this.curriculum.createMission(actor.id,input,context);
   }
   case 'edit-unit':
    if(!target.missionId)throw new BadRequestException('BEGINNER_UNIT_REQUIRED');
    return this.curriculum.updateMission(target.missionId,actor.id,updateMissionInputSchema.parse(body),context);
   default:throw new BadRequestException('Unsupported Beginner curriculum command');
  }
 }
 async getFoundation(actor:BeginnerActor,rawTarget:unknown){
  const target=parseTarget(rawTarget);await this.policy.authorize(actor,'read',target,this.database);
  if(!target.missionId)throw new BadRequestException('BEGINNER_UNIT_REQUIRED');
  const draft=await this.foundation.getDraft(target.missionId);
  const [review,edit]=await Promise.all([
   this.database.auditLog.findFirst({where:{resourceId:target.missionId,action:'beginner.curriculum.review'},orderBy:{createdAt:'desc'}}),
   this.database.auditLog.findFirst({where:{resourceId:target.missionId,action:'curriculum.foundation.save'},orderBy:{createdAt:'desc'}}),
  ]);
  let reviewHash:string|null=null;
  if(draft.revision&&draft.definition&&draft.status==='VALIDATED'&&review&&edit){
   const permission=await this.policy.permission();
   if(permission)try{assertBeginnerCurriculumReview(review.metadata,{environmentId:permission.environmentId,target,revision:draft.revision,definitionHash:hashBeginnerRecord(draft.definition),editorId:edit.actorId},review.actorId);reviewHash=(review.metadata as {reviewHash:string}).reviewHash;}catch{/* A stale review never enables publication. */}
  }
  return {...draft,reviewHash,reviewedRevision:reviewHash?draft.revision:null};
 }
 async foundationCommand(actor:BeginnerActor,action:'save'|'validate'|'review'|'publish',rawTarget:unknown,raw:unknown){
  const target=parseTarget(rawTarget);
  if(!target.missionId)throw new BadRequestException('BEGINNER_UNIT_REQUIRED');
  const scopeAction=action==='save'?'author':action;
  const context=await this.policy.authorize(actor,scopeAction,target,this.database);
  if(action==='save')return this.foundation.saveDraft(target.missionId,actor.id,saveFoundationDraftSchema.parse(raw) as SaveFoundationDraftInput,context);
  const input=foundationCommandSchema.parse(raw) as FoundationCommand;
  if(action!=='review')return action==='validate'?this.foundation.validateDraft(target.missionId,actor.id,input,context):this.foundation.publishDraft(target.missionId,actor.id,input,context);
  return this.transact(actor,'review',{target,expectedRevision:input.expectedRevision,idempotencyKey:input.idempotencyKey},'curriculum.review',async(tx,reviewContext)=>{
   const draft=await tx.curriculumDefinition.findUnique({where:{missionId:target.missionId!}});
   const edit=await tx.auditLog.findFirst({where:{resourceId:target.missionId!,action:'curriculum.foundation.save'},orderBy:{createdAt:'desc'}});
   if(!draft||draft.revision!==input.expectedRevision||draft.status!=='VALIDATED')throw new ConflictException('BEGINNER_REVIEW_STALE');
   if(!edit)throw new ConflictException('BEGINNER_SOURCE_PROVENANCE_REQUIRED');
   if(edit.actorId===actor.id)throw new ConflictException('BEGINNER_INDEPENDENT_REVIEW_REQUIRED');
   const data={kind:'FIXTURE_TECHNICAL_REVIEW',environmentId:beginnerContextDescriptor(reviewContext).environmentId,target,revision:draft.revision,definitionHash:hashBeginnerRecord(draft.content),actorId:actor.id,editorId:edit.actorId};
   const reviewHash=hashBeginnerRecord(data);
   await tx.auditLog.create({data:{actorId:actor.id,action:'beginner.curriculum.review',resourceType:'CurriculumDefinition',resourceId:target.missionId!,metadata:json({...data,reviewHash})}});
   return {reviewHash,reviewKind:data.kind};
  });
 }

 async learnerPreview(actor:BeginnerActor,rawTarget:unknown,explicitVersionId?:string,selectedAudioArtifacts:Record<string,string>={}){
  const target=parseTarget(rawTarget);
  await this.policy.authorize(actor,'read',target,this.database);
  if(!target.missionId||!target.lessonId||!target.importId)throw new BadRequestException('BEGINNER_DRAFT_REQUIRED');
  let snapshot:LessonSnapshot,rawSource:string,sourceHash:string,versionId:string,version=0;
  const audioByRef=new Map<string,string>();
  if(explicitVersionId){
   if(!z.uuid().safeParse(explicitVersionId).success)throw new BadRequestException('Invalid lesson version');
   const row=await this.database.lessonVersion.findUnique({where:{id:explicitVersionId}});
   if(!row||row.lessonId!==target.lessonId||row.status!=='PUBLISHED')throw new NotFoundException('BEGINNER_EXACT_VERSION_UNAVAILABLE');
   snapshot=lessonSnapshotSchema.parse(row.parsedContent);versionId=row.id;version=row.version;sourceHash=row.sourceHash;
   const audit=await this.database.auditLog.findFirst({where:{resourceId:row.id,action:'PUBLISH_LESSON'},orderBy:{createdAt:'asc'}});
   const evidence=audit?.metadata as {kind?:string;environmentId?:string;target?:BeginnerTarget;rawSource?:string;sourceHash?:string;snapshotHash?:string}|null;
   const permission=await this.policy.permission();
   if(!evidence||evidence.kind!=='BEGINNER_PUBLICATION_V1'||evidence.environmentId!==permission?.environmentId||evidence.target?.lessonId!==target.lessonId||evidence.target.missionId!==target.missionId||evidence.sourceHash!==row.sourceHash||evidence.snapshotHash!==hashBeginnerRecord(snapshot)||typeof evidence.rawSource!=='string')throw new ConflictException('BEGINNER_EXACT_SOURCE_UNAVAILABLE');
   rawSource=evidence.rawSource;
   if(createHash('sha256').update(rawSource).digest('hex')!==sourceHash)throw new ConflictException('BEGINNER_SOURCE_HASH_MISMATCH');
   const assets=await this.database.lessonVersionAudioArtifact.findMany({where:{lessonVersionId:row.id},include:{audioArtifact:true}});
   for(const ref of assets)if(ref.audioArtifact.status==='READY')audioByRef.set(ref.audioScriptSlug,ref.audioArtifactId);
  }else{
   const row=await this.database.contentImport.findUnique({where:{id:target.importId}});
   if(!row||row.lessonId!==target.lessonId)throw new NotFoundException('Beginner draft not found');
   rawSource=row.rawSource;sourceHash=row.sourceHash;
   const analysis=analyzeLessonSource(rawSource);if(!analysis.canPublish||!analysis.normalizedDraft)throw new UnprocessableEntityException({code:'BEGINNER_NOT_READY',issues:analysis.issues});
   snapshot=buildBeginnerDraftSnapshot(analysis.normalizedDraft);versionId=randomUUID();
   const selected=z.record(z.string(),z.uuid()).parse(selectedAudioArtifacts);
   const assets=await this.database.audioArtifact.findMany({where:{contentImportId:target.importId,id:{in:Object.values(selected)},status:'READY'}});
   for(const [ref,id]of Object.entries(selected))if(assets.some(a=>a.id===id&&a.audioScriptSlug===ref))audioByRef.set(ref,id);
  }
  const mission=await this.database.mission.findUnique({where:{id:target.missionId},include:{level:true}});
  if(!mission||mission.purpose!=='LEARNING')throw new NotFoundException('Beginner learning Unit not found');
  const plan=planBeginnerSession({mission:{id:mission.id,slug:mission.slug,title:mission.title,objective:mission.objective,levelCode:mission.level.code,purpose:'learning',lessonVersion:{...snapshot,id:versionId,version}},expectedLessonVersionId:versionId,durationMinutes:45});
  const doc=parseLessonSource(rawSource).document;
  const audio=snapshot.activities.filter(a=>a.activityType==='listening').map(activity=>{
   const ref=doc.activities.find(a=>a.slug===activity.slug)?.audioRef,id=ref?audioByRef.get(ref):undefined;
   return {activityId:activity.id,artifactId:id??null};
  });
  return {kind:explicitVersionId?'PUBLISHED_PREVIEW':'DRAFT_PREVIEW',title:snapshot.title,sourceHash,lessonVersionId:versionId,previewOnly:true as const,plan,activities:snapshot.activities.map(a=>projectLearnerActivity(snapshot,a.id)),audio};
 }
 async previewAudio(actor:BeginnerActor,rawTarget:unknown,artifactId:string,explicitVersionId?:string){
  const target=parseTarget(rawTarget);await this.policy.authorize(actor,'read',target,this.database);
  if(!target.importId||!target.lessonId)throw new BadRequestException('BEGINNER_DRAFT_REQUIRED');
  const artifact=await this.database.audioArtifact.findUnique({where:{id:artifactId}});
  if(!artifact||artifact.status!=='READY'||!artifact.mimeType.startsWith('audio/'))throw new NotFoundException('Beginner preview audio not found');
  if(explicitVersionId){
   const binding=await this.database.lessonVersionAudioArtifact.findFirst({where:{lessonVersionId:explicitVersionId,audioArtifactId:artifactId,lessonVersion:{lessonId:target.lessonId,status:'PUBLISHED'}}});
   if(!binding)throw new NotFoundException('Beginner exact-version audio not found');
  }else if(artifact.contentImportId!==target.importId)throw new NotFoundException('Beginner draft audio not found');
  const audioBytes=await this.storage.read(artifact.storageKey);
  if(audioBytes.length!==artifact.byteSize||createHash('sha256').update(audioBytes).digest('hex')!==artifact.checksum)throw new ConflictException('BEGINNER_AUDIO_FILE_MISMATCH');
  return {audioBytes,mimeType:artifact.mimeType};
 }


}
