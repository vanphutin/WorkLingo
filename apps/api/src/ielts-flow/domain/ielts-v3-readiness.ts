import type { Prisma } from '@prisma/client';
import { ieltsMockContentSchema, orientationContentSchema } from '@worklingo/contracts';
import type { IeltsTopicAdminService } from '../../ielts-study/application/ielts-topic-admin.service.js';
import { qualifyIeltsMockPaper, type IeltsMockAudioManifest } from '../../ielts-mock/domain/mock-content-qualification.js';

type TopicQualifier=Pick<IeltsTopicAdminService,'qualify'>;
const current={status:'PUBLISHED',currentPublishedVersion:{is:{status:'PUBLISHED',archivedAt:null}}} as const;
export async function readIeltsV3Readiness(db:Prisma.TransactionClient,topics:TopicQualifier) {
  const [intro,firstTopics,firstMocks]=await Promise.all([
    db.ieltsOrientation.findUnique({where:{slug:'ielts-orientation',...current},include:{currentPublishedVersion:true}}),
    db.ieltsTopic.findMany({where:current,include:{currentPublishedVersion:true},orderBy:{id:'asc'},take:16}),
    db.ieltsMockTest.findMany({where:current,include:{currentPublishedVersion:true},orderBy:{id:'asc'},take:16}),
  ]);
  const parsed=orientationContentSchema.safeParse(intro?.currentPublishedVersion?.content);
  let introduction=parsed.success;
  if (parsed.success) {
    const assets=[...new Set(parsed.data.slides.flatMap(slide=>[slide.audioAssetId,slide.imageAssetId].filter((id):id is string=>!!id)))];
    if (assets.length) introduction=await db.orientationMediaAsset.count({where:{id:{in:assets},orientationId:intro!.id}})===assets.length;
  }
  let study=false;let topicPage=firstTopics;
  while (topicPage.length) {
    for (const topic of topicPage) if (topic.currentPublishedVersion && (await topics.qualify(db,topic.currentPublishedVersion.content)).canPublish) {study=true;break;}
    if (study||topicPage.length<16) break;
    topicPage=await db.ieltsTopic.findMany({where:current,include:{currentPublishedVersion:true},orderBy:{id:'asc'},take:16,cursor:{id:topicPage.at(-1)!.id},skip:1});
  }
  let mock=false;let mockPage=firstMocks;
  while (mockPage.length) {
    for (const candidate of mockPage) {
      const paper=ieltsMockContentSchema.safeParse(candidate.currentPublishedVersion?.content);
      if (!paper.success) continue;
      const ids=paper.data.listening.parts.flatMap(part=>part.audioAssetId?[part.audioAssetId]:[]);
      if (paper.data.allowedModes.includes('PRACTICE') && ids.length===paper.data.listening.parts.length && await db.audioArtifact.count({where:{id:{in:ids},status:'READY',adapterName:{not:'fake-tts'}}})===new Set(ids).size) {mock=true;break;}
      if(paper.data.schemaVersion!==2) continue;
      const artifacts=await db.audioArtifact.findMany({where:{id:{in:ids},status:'READY',adapterName:'local-windows-speech'}});
      const manifest=artifacts.map(row=>(row.voiceConfig as Record<string,unknown>).ieltsV3).filter(Boolean) as IeltsMockAudioManifest;
      if (qualifyIeltsMockPaper(paper.data,manifest).canPublish) {mock=true;break;}
    }
    if (mock||mockPage.length<16) break;
    mockPage=await db.ieltsMockTest.findMany({where:current,include:{currentPublishedVersion:true},orderBy:{id:'asc'},take:16,cursor:{id:mockPage.at(-1)!.id},skip:1});
  }
  return {introduction,study,mock,ready:introduction||study||mock};
}
