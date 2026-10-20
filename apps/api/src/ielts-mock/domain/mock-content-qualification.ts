import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { IeltsContentQualificationResult, IeltsMockContent } from '@worklingo/contracts';

export interface IeltsMockAudioEntry {
  assetId: string; checksum: string; byteSize: number; durationSeconds: number; speechSeconds: number; mimeType: string;
  provenance: { adapterName: string; scriptHash: string; voices: string[]; rate: number; original: boolean; transcriptHash: string };
  timeline: Array<{ kind: string; seconds: number; purpose?: string; questionOrders?: number[] }>;
}
export type IeltsMockAudioManifest = IeltsMockAudioEntry[];
const words = (value: string) => value.trim().split(/\s+/u).length;
const numbers: Record<string,string> = { '6':'six','60':'sixty','2019':'2019' };
const audioManifestSchema=z.array(z.object({assetId:z.uuid(),checksum:z.string(),byteSize:z.number().int().positive(),durationSeconds:z.number().positive(),speechSeconds:z.number().positive(),mimeType:z.string(),provenance:z.object({adapterName:z.string(),scriptHash:z.string(),voices:z.array(z.string()),rate:z.number().finite(),original:z.boolean(),transcriptHash:z.string()}),timeline:z.array(z.object({kind:z.enum(['speech','pause']),seconds:z.number().positive(),purpose:z.string().optional(),questionOrders:z.array(z.number().int()).optional()}))}));

/** Source/media checks, not external calibration or a replacement for audio audition. */
export function qualifyIeltsMockPaper(paper: IeltsMockContent, audio: IeltsMockAudioManifest): IeltsContentQualificationResult {
  const issues:IeltsContentQualificationResult['issues']=[];
  const fail=(code:string,path:string,message:string)=>issues.push({code,path,message});
  if(!audioManifestSchema.safeParse(audio).success)return {canPublish:false,supportedDurations:[],qualifiedModes:[],issues:[{code:'IELTS_MOCK_AUDIO_METADATA',path:'audio',message:'Malformed or missing audio metadata cannot qualify a paper.'}]};
  if (paper.schemaVersion!==2 || !paper.disclosure.toLowerCase().includes('uncalibrated') || !paper.disclosure.toLowerCase().includes('teacher review')) fail('IELTS_MOCK_DISCLOSURE','disclosure','V2 papers must state their local band and productive review limitations.');
  const ids=new Set<string>(), prompts=new Set<string>(), types=new Set<string>();
  const sources=[...paper.listening.parts.map(part=>({questions:part.questions,text:part.transcript??'',path:`listening.${part.part}`})),...paper.reading.passages.map(passage=>({questions:passage.questions,text:passage.passage,path:`reading.${passage.section}`}))];
  for (const source of sources) {
    if (words(source.text)<500) fail('IELTS_MOCK_SOURCE_DEPTH',source.path,'Each original source requires at least five hundred meaningful words.');
    for (const question of source.questions) {
      const at=`${source.path}.questions.${question.order}`;types.add(question.type);
      if (ids.has(question.id)||prompts.has(question.prompt)) fail('IELTS_MOCK_DUPLICATE_TASK',at,'Question identities and prompts must be distinct.');
      ids.add(question.id);prompts.add(question.prompt);
      const evidence=[...question.explanation.matchAll(/“([^”]+)”/gu)].map(match=>match[1]!);
      if (!evidence.length||evidence.some(quote=>!source.text.toLowerCase().includes(quote.toLowerCase()))) fail('IELTS_MOCK_EVIDENCE',at,'Quote exact evidence from this question’s source.');
      const selected=question.type==='multiple_choice'||question.type==='matching';
      if (selected && (question.options.length<3 || new Set(question.options).size!==question.options.length || question.answerPolicy.acceptedAnswers.length!==1 || !question.options.includes(question.answerPolicy.acceptedAnswers[0]!))) fail('IELTS_MOCK_OPTION_POLICY',at,'Use distinct complete options and one supported accepted option.');
      for (const answer of question.answerPolicy.acceptedAnswers) {
        if (question.answerPolicy.maxWords!==null && words(answer)>question.answerPolicy.maxWords) fail('IELTS_MOCK_ANSWER_LIMIT',at,'Every accepted alternative must fit its stated limit.');
        if (!selected && !evidence.some(quote=>quote.toLowerCase().includes((numbers[answer]??answer).toLowerCase()))) fail('IELTS_MOCK_ANSWER_EVIDENCE',at,'Every short answer and alternative needs explicit source support.');
      }
    }
  }
  if (types.size<3) fail('IELTS_MOCK_QUESTION_VARIETY','questions','Author at least three supported objective task types.');
  if (audio.length!==4||new Set(audio.map(entry=>entry.assetId)).size!==4||new Set(audio.map(entry=>entry.checksum)).size!==4) fail('IELTS_MOCK_AUDIO_SET','audio','Four distinct real audio artifacts are required.');
  const total=audio.reduce((sum,entry)=>sum+entry.durationSeconds,0);
  if (total<1780||total>1800) fail('IELTS_MOCK_AUDIO_TIMELINE','audio','The meaningful Listening timeline must be approximately thirty minutes.');
  for (const [index,part] of paper.listening.parts.entries()) {
    const entry=audio.find(entry=>entry.assetId===part.audioAssetId);const at=`audio.${index+1}`;
    if (!entry) {fail('IELTS_MOCK_AUDIO_MISSING',at,'Every part must use its own verified artifact.');continue;}
    if (entry.provenance.transcriptHash!==createHash('sha256').update(part.transcript??'').digest('hex')) fail('IELTS_MOCK_AUDIO_SOURCE',at,'Verified speech must belong to this part’s original transcript.');
    if (entry.provenance.adapterName!=='local-windows-speech'||!entry.provenance.original||!entry.provenance.voices.length||!/^[a-f0-9]{64}$/u.test(entry.provenance.scriptHash)||!/^[a-f0-9]{64}$/u.test(entry.checksum)||entry.mimeType!=='audio/wav'||entry.byteSize<100000||entry.speechSeconds<entry.durationSeconds*0.7) fail('IELTS_MOCK_AUDIO_PROVENANCE',at,'Require real original speech provenance and a majority speech timeline.');
    if (Math.abs(entry.timeline.reduce((sum,segment)=>sum+segment.seconds,0)-entry.durationSeconds)>0.05||Math.abs(entry.timeline.filter(segment=>segment.kind==='speech').reduce((sum,segment)=>sum+segment.seconds,0)-entry.speechSeconds)>0.05) fail('IELTS_MOCK_AUDIO_TIMELINE',at,'Timeline must match actual bytes and spoken duration.');
    const orders=new Set(part.questions.map(question=>question.order));
    for (const segment of entry.timeline) if (segment.kind!=='speech'&&(segment.kind!=='pause'||!segment.purpose||!segment.questionOrders?.length||segment.questionOrders.some(order=>!orders.has(order))||segment.seconds<=0||segment.seconds>90)) fail('IELTS_MOCK_AUDIO_PADDING',at,'Only bounded question-linked read/check pauses are allowed.');
  }
  const task1=paper.writing.tasks[0]!.prompt;
  if (task1.split('\n').filter(line=>line.includes('|')&&/\d/u.test(line)).length<3||!paper.writing.tasks[1]!.prompt.includes('Discuss both views')) fail('IELTS_MOCK_WRITING_DATA','writing','Task 1 needs real visible data and Task 2 an authored argument task.');
  if (paper.speaking.parts.reduce((sum,part)=>sum+part.preparationSeconds+part.responseSeconds,0)>840||paper.speaking.parts.some(part=>part.responseSeconds>300)) fail('IELTS_MOCK_SPEAKING_TIMELINE','speaking','Three real spoken parts must fit the fourteen-minute policy and recording limit.');
  return {canPublish:issues.length===0,supportedDurations:[],qualifiedModes:issues.length?[]:['PRACTICE','EXAM_SIMULATION'],issues};
}
