import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { curriculumDefinitionInputSchema } from '@worklingo/contracts';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../common/database/prisma.service.js';
import { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import { ContentImportsService } from '../../content-authoring/application/content-imports.service.js';
import { ContentPublisherService } from '../../content-authoring/application/content-publisher.service.js';
import { IeltsTopicAdminService } from '../../ielts-study/application/ielts-topic-admin.service.js';
import { OrientationAdminService } from '../../ielts-orientation/application/orientation-admin.service.js';
import { IeltsMockAdminService } from '../../ielts-mock/application/ielts-mock-admin.service.js';
import { contentUuid, ieltsContentRoot } from '../../ielts-study/infrastructure/topic-content.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { publisherDatabase } from '../../ielts-beta-release/release.js';
import { readIeltsV3Readiness } from '../domain/ielts-v3-readiness.js';
import { assertIeltsV3Review } from './release-policy.js';
import { releaseHash, releaseName, type IeltsV3Bundle } from './release-content.js';

const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const bytesHash=(value:Buffer)=>createHash('sha256').update(value).digest('hex');
export async function inspectIeltsV3Release(db:Prisma.TransactionClient,bundle:IeltsV3Bundle,actorId:string){
  const [actor,program,orientation,topics,mock,lessons,audio,pathRow,revisions]=await Promise.all([
    db.user.findUnique({where:{id:actorId},select:{id:true,role:true,status:true}}),db.learningProgram.findUniqueOrThrow({where:{slug:'ielts'}}),
    db.ieltsOrientation.findUniqueOrThrow({where:{slug:'ielts-orientation'},include:{currentPublishedVersion:true}}),
    db.ieltsTopic.findMany({where:{slug:{in:bundle.topics.map(topic=>topic.slug)}},include:{currentPublishedVersion:true},orderBy:{slug:'asc'}}),
    db.ieltsMockTest.findUnique({where:{slug:'ielts-academic-original-02'},include:{currentPublishedVersion:true}}),
    db.lesson.findMany({where:{slug:{in:bundle.topics.map(topic=>topic.draft.slug)}},include:{currentPublishedVersion:true},orderBy:{slug:'asc'}}),
    db.audioArtifact.findMany({where:{id:{in:[...bundle.topicAudio.map(entry=>entry.assetId),...bundle.audioManifest.map(entry=>entry.assetId)]}},orderBy:{id:'asc'}}),
    db.learningPath.findUnique({where:{slug:'ielts-contextual-topics'},include:{levels:{include:{missions:true}}}}),
    db.curriculumRevision.findMany({where:{id:{in:bundle.topics.map(topic=>topic.manifest.packs[0]!.curriculumRevisionId)}},include:{lessons:true},orderBy:{id:'asc'}}),
  ]);
  if(!actor||actor.status!=='ACTIVE'||!['CONTENT_ADMIN','SYSTEM_ADMIN'].includes(actor.role))throw new Error('An active local content/system admin is required.');
  if(program.availabilityStatus==='DISABLED'||orientation.status==='ARCHIVED'||topics.some(topic=>topic.status==='ARCHIVED')||mock?.status==='ARCHIVED')throw new Error('Archived/disabled content requires an explicit reopening decision.');
  const same=(row:{status:string;currentPublishedVersion:{status:string;archivedAt:Date|null;content:Prisma.JsonValue}|null}|null,value:unknown)=>row?.status==='PUBLISHED'&&row.currentPublishedVersion?.status==='PUBLISHED'&&!row.currentPublishedVersion.archivedAt&&releaseHash(row.currentPublishedVersion.content)===releaseHash(value);
  const expectedAudio=[...bundle.topicAudio,...bundle.audioManifest];
  const audioReady=audio.length===16&&expectedAudio.every(entry=>audio.some(row=>row.id===entry.assetId&&row.status==='READY'&&row.adapterName==='local-windows-speech'&&row.checksum===entry.checksum&&row.byteSize===entry.byteSize&&row.scriptHash===entry.provenance.scriptHash));
  const complete=audioReady&&same(orientation,bundle.introduction)&&same(mock,bundle.paper)&&bundle.topics.every(topic=>same(topics.find(row=>row.slug===topic.slug)??null,topic.manifest))&&program.availabilityStatus==='BETA';
  return {actor,program,orientation,topics,mock,lessons,audio,pathRow,revisions,complete,fingerprint:releaseHash({releaseName,actor,program,orientation,topics,mock,lessons,audio,pathRow,revisions,contentFingerprint:bundle.contentFingerprint})};
}

/** Call with a reviewed bundle and an outer snapshot already safely persisted. */
export async function executeIeltsV3Release(db:PrismaService,storage:ObjectStorage,bundle:IeltsV3Bundle,actorId:string,expected:string) {
  assertIeltsV3Review(bundle.review,bundle.contentFingerprint);
  const staged:string[]=[];
  try{
    return await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('worklingo:ielts-flow-v3-release'))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('worklingo:ielts-orientation'))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ielts-mock:'||${contentUuid('academic-02:mock')}))`;
      for(const topic of bundle.topics.slice().sort((a,b)=>a.slug.localeCompare(b.slug))) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${topic.draft.slug}))`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-topic:'+topic.slug}))`;
      }
      const state=await inspectIeltsV3Release(tx,bundle,actorId);
      if(state.complete){for(const row of state.audio)if(bytesHash(await storage.read(row.storageKey))!==row.checksum)throw new Error('Published stored audio mismatch.');return 'ALREADY_RELEASED' as const;}
      if(state.fingerprint!==expected)throw new Error('Reviewed release state changed. Run dry run again.');
      await tx.$queryRaw`SELECT id FROM "LearningProgram" WHERE id=${state.program.id}::uuid FOR UPDATE`;
      const scoped=publisherDatabase(tx),key=(operation:string)=>contentUuid(`${releaseName}:${expected}:${operation}`);
      const store=async(entry:IeltsV3Bundle['topicAudio'][number] | IeltsV3Bundle['audioManifest'][number],audioScriptSlug:string,contentImportId?:string)=>{
        const prior=await tx.audioArtifact.findUnique({where:{id:entry.assetId}});
        if(prior){if(prior.checksum!==entry.checksum||prior.status!=='READY'||prior.scriptHash!==entry.provenance.scriptHash||bytesHash(await storage.read(prior.storageKey))!==entry.checksum)throw new Error('Existing V3 audio differs.');return prior;}
        const filename='file' in entry ? String(entry.file) : `mock-part-${bundle.audioManifest.indexOf(entry as IeltsV3Bundle['audioManifest'][number])+1}.wav`;
        if(!/^(?:ielts-[a-z-]+|mock-part-[1-4])\.wav$/u.test(filename))throw new Error('Unsafe prepared filename.');
        const body=await readFile(path.join(ieltsContentRoot,'.prepared',filename));if(bytesHash(body)!==entry.checksum)throw new Error('Prepared file changed.');
        const object=await storage.put({body,contentType:'audio/wav',prefix:'ielts-flow-v3'});staged.push(object.key);
        if(bytesHash(await storage.read(object.key))!==entry.checksum)throw new Error('Stored audio mismatch.');
        return tx.audioArtifact.create({data:{id:entry.assetId,...(contentImportId?{contentImportId}:{}),audioScriptSlug,scriptHash:entry.provenance.scriptHash,adapterName:'local-windows-speech',variantKey:releaseName,generationKey:`${releaseName}:${entry.assetId}:${entry.checksum}`,voiceConfig:json({voices:entry.provenance.voices,rate:entry.provenance.rate,provenance:'Original local content; offline System.Speech synthesis',...('timeline' in entry?{ieltsV3:entry}:{})}),mimeType:'audio/wav',byteSize:entry.byteSize,checksum:entry.checksum,storageKey:object.key,status:'READY'}});
      };
      const pathRecord=state.pathRow??await tx.learningPath.create({data:{id:contentUuid('topics:path'),programId:state.program.id,slug:'ielts-contextual-topics',name:'IELTS contextual topics',status:'PUBLISHED'}});
      if(pathRecord.programId!==state.program.id||pathRecord.status!=='PUBLISHED')throw new Error('IELTS topic path ownership/status changed.');
      const level=await tx.level.findUnique({where:{code:'IELTS_TOPIC_FOUNDATION'}})??await tx.level.create({data:{id:contentUuid('topics:foundation-level'),pathId:pathRecord.id,code:'IELTS_TOPIC_FOUNDATION',name:'IELTS contextual foundation',cefrReference:'B1–B2 language practice; not a calibrated band',order:1,status:'PUBLISHED'}});
      if(level.pathId!==pathRecord.id||level.status!=='PUBLISHED')throw new Error('IELTS topic level ownership/status changed.');
      const topicPublisher=new IeltsTopicAdminService(scoped,new CurriculumService(scoped));
      for(const [index,topic] of bundle.topics.entries()){
        const previous=state.topics.find(row=>row.slug===topic.slug);
        if(previous?.currentPublishedVersion&&releaseHash(previous.currentPublishedVersion.content)===releaseHash(topic.manifest))continue;
        if(previous||state.lessons.some(lesson=>lesson.slug===topic.draft.slug))throw new Error('Existing authored source needs an explicit versioned update plan.');
        const imports=new ContentImportsService(scoped),imported=await imports.create(actorId,topic.source);
        if(!(await imports.validate(imported.id,actorId,imported.draftRevision)).canPublish)throw new Error('Lesson source validation failed.');
        const audio=await store(bundle.topicAudio[index]!,topic.ast.audioScripts[0]!.slug,imported.id);
        const published=await new ContentPublisherService(scoped).publish(imported.id,actorId,{expectedDraftRevision:imported.draftRevision,expectedSourceHash:imported.sourceHash,idempotencyKey:key(`lesson:${topic.slug}`),selectedAudioArtifacts:{[topic.ast.audioScripts[0]!.slug]:audio.id}});
        const mission=await tx.mission.create({data:{id:contentUuid(`${topic.slug}:mission`),levelId:level.id,slug:topic.slug,title:topic.manifest.title,objective:topic.draft.objective,order:index+1,status:'PUBLISHED'}});
        await tx.missionLesson.create({data:{missionId:mission.id,lessonId:published.lessonId,order:1}});
        await tx.curriculumRevision.create({data:{id:topic.manifest.packs[0]!.curriculumRevisionId,missionId:mission.id,revision:1,snapshot:json(curriculumDefinitionInputSchema.parse({category:topic.draft.foundation!.category,prerequisiteRevisionIds:[],objectives:topic.draft.foundation!.objectives.map(objective=>({...objective,evidence:topic.draft.activities.filter(activity=>topic.draft.foundation!.activityObjectives[activity.slug]?.includes(objective.slug)).map(activity=>({lessonVersionId:published.lessonVersionId,activitySlug:activity.slug,languageBlockSlugs:activity.languageBlockReferences}))}))})),lessons:{create:{lessonVersionId:published.lessonVersionId,order:1}}}});
        const draft=await topicPublisher.saveDraft(actorId,null,{expectedRevision:null,idempotencyKey:key(`topic:${topic.slug}`),content:topic.manifest});
        await topicPublisher.publish(actorId,draft.id,{expectedRevision:draft.draftRevision,idempotencyKey:key(`topic-publish:${topic.slug}`)});
      }
      const intro=new OrientationAdminService(scoped);const saved=await intro.updateDraft({expectedRevision:state.orientation.draftRevision,content:bundle.introduction});
      await intro.publish(actorId,{expectedRevision:saved.draftRevision,idempotencyKey:key('introduction')});
      for(const [index,entry] of bundle.audioManifest.entries())await store(entry,`ielts-academic-02-part-${index+1}`);
      const mock=state.mock??await tx.ieltsMockTest.create({data:{id:contentUuid('academic-02:mock'),slug:'ielts-academic-original-02',draftContent:json(bundle.paper)}});
      const mockPublisher=new IeltsMockAdminService(scoped,storage);
      const mockDraft=await mockPublisher.save(actorId,mock.id,{expectedRevision:mock.draftRevision,idempotencyKey:key('mock-save'),content:bundle.paper});
      if(!(await mockPublisher.validate(mock.id,{expectedRevision:mockDraft.draftRevision})).canPublish)throw new Error('Actual mock content/media qualification failed.');
      await mockPublisher.publish(actorId,mock.id,{expectedRevision:mockDraft.draftRevision,idempotencyKey:key('mock-publish')});
      const readiness=await readIeltsV3Readiness(tx,topicPublisher);
      if(!readiness.introduction||!readiness.study||!readiness.mock)throw new Error('All three release sections must qualify.');
      await tx.learningProgram.update({where:{id:state.program.id},data:{availabilityStatus:'BETA'}});
      await tx.auditLog.create({data:{actorId,action:'RELEASE_IELTS_FLOW_V3',resourceType:'LearningProgram',resourceId:state.program.id,metadata:{release:releaseName,reviewedFingerprint:expected,contentFingerprint:bundle.contentFingerprint,topics:12,chunks:144,policyVersion:'v2'},oldState:{availabilityStatus:state.program.availabilityStatus},newState:{availabilityStatus:'BETA'}}});
      return 'RELEASED' as const;
    },{isolationLevel:'RepeatableRead',timeout:120000,maxWait:30000});
  }catch(error){for(const key of staged)await storage.delete(key).catch(()=>undefined);throw error;}
}
