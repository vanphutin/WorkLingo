import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { orientationContentSchema } from '@worklingo/contracts';
import { readAuthoredIeltsTopics, ieltsContentRoot } from '../../ielts-study/infrastructure/topic-content.js';
import { qualifyIeltsTopicPack } from '../../ielts-study/domain/ielts-topic-validation.js';
import { readAuthoredMock } from '../../ielts-mock/infrastructure/authored-mock.js';
import { qualifyIeltsMockPaper } from '../../ielts-mock/domain/mock-content-qualification.js';
import { verifyWave } from '../../ielts-beta-release/safety.js';

function canonical(value:unknown):unknown {if(value instanceof Date)return value.toISOString();if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));return value;}
export const releaseHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const releaseName='ielts-flow-v3-original-2026-10-15';
interface TopicAudio {assetId:string;file:string;checksum:string;byteSize:number;durationSeconds:number;provenance:{adapterName:string;scriptHash:string;voices:string[];rate:number;original:boolean}}
export async function loadIeltsV3Bundle() {
  const [topics,mock,introduction,review]=await Promise.all([readAuthoredIeltsTopics(),readAuthoredMock({verifyBytes:true}),readFile(path.join(ieltsContentRoot,'introduction.json'),'utf8').then(value=>orientationContentSchema.parse(JSON.parse(value))),readFile(path.join(ieltsContentRoot,'mocks/academic-02/qualification.json'),'utf8').then(value=>JSON.parse(value) as unknown)]);
  const qualified=qualifyIeltsMockPaper(mock.paper,mock.audioManifest);if(!qualified.canPublish)throw new Error('Mock content qualification failed: '+qualified.issues.map(issue=>issue.code).join(','));
  const topicAudio:TopicAudio[]=[];
  for(const topic of topics){
    if(!qualifyIeltsTopicPack(topic.manifest.packs[0]!,topic.publishedLesson).canPublish)throw new Error('Topic content does not qualify.');
    const entry=JSON.parse(await readFile(path.join(ieltsContentRoot,'.prepared',`${topic.slug}-audio.json`),'utf8')) as TopicAudio;
    if(entry.file!==`${topic.slug}.wav`||entry.provenance.scriptHash!==createHash('sha256').update(topic.ast.audioScripts[0]!.script).digest('hex')||entry.provenance.adapterName!=='local-windows-speech'||!entry.provenance.original)throw new Error('Topic audio source/provenance mismatch.');
    const body=await readFile(path.join(ieltsContentRoot,'.prepared',entry.file));
    if(body.length!==entry.byteSize||createHash('sha256').update(body).digest('hex')!==entry.checksum||Math.abs(verifyWave(body).durationSeconds-entry.durationSeconds)>0.01)throw new Error('Topic audio bytes mismatch.');topicAudio.push(entry);
  }
  const contentFingerprint=releaseHash({introduction,topics:topics.map(topic=>({source:topic.source,manifest:topic.manifest})),paper:mock.paper,mockAudio:mock.audioManifest,topicAudio});
  return {topics,topicAudio,...mock,introduction,review,contentFingerprint};
}
export type IeltsV3Bundle=Awaited<ReturnType<typeof loadIeltsV3Bundle>>;
