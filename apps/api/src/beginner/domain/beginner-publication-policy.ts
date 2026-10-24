import {createHash} from 'node:crypto';
import type {Prisma} from '@prisma/client';
import {audioScriptFingerprintText,parseLessonSource} from '@worklingo/content-format';
import type {ObjectStorage} from '../../storage/domain/object-storage.port.js';
import type {BeginnerTarget} from '@worklingo/contracts';
import {hashBeginnerRecord} from './beginner-environment-preflight.js';
import {ConflictException} from '@nestjs/common';
export function preserveBeginnerPriorVersion(input:{programSlugs:readonly string[];priorStatus:string|null;topicGroupId:string|null}):boolean{
 if(!input.programSlugs.includes('beginner'))return false;
 if(input.topicGroupId||!input.programSlugs.length||input.programSlugs.some(s=>s!=='beginner'))throw new ConflictException('BEGINNER_SHARED_LESSON');
 if(input.priorStatus==='ARCHIVED')throw new ConflictException('BEGINNER_WITHDRAWN_VERSION');
 return true;
}

export interface BeginnerReviewInput {environmentId:string;selectedAudioArtifacts?:Record<string,string>;actorId:string;editorId:string;target:BeginnerTarget;draftRevision:number;sourceHash:string;validationHash:string;normalizedSnapshotHash:string;audioSelectionHash:string}
export function createBeginnerReview(input:BeginnerReviewInput){
 if(!input.editorId)throw new ConflictException('BEGINNER_SOURCE_PROVENANCE_REQUIRED');
 if(input.actorId===input.editorId)throw new ConflictException('BEGINNER_INDEPENDENT_REVIEW_REQUIRED');
 if(input.sourceHash!==input.validationHash)throw new ConflictException('BEGINNER_REVIEW_STALE');
 const record={schemaVersion:1,kind:'FIXTURE_TECHNICAL_REVIEW',...input};
 return {...record,reviewHash:hashBeginnerRecord(record)};
}

export function assertBeginnerPublishedReview(input:unknown,expected:Omit<BeginnerReviewInput,'actorId'|'editorId'>&{reviewHash:string}):void {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ConflictException('BEGINNER_REVIEW_REQUIRED');
 const record=input as Record<string,unknown>,{reviewHash,...data}=record;
 if(record.kind!=='FIXTURE_TECHNICAL_REVIEW'||record.schemaVersion!==1||reviewHash!==expected.reviewHash||hashBeginnerRecord(data)!==reviewHash||typeof record.editorId!=='string'||record.actorId===record.editorId)throw new ConflictException('BEGINNER_REVIEW_STALE');
 for(const [key,value]of Object.entries(expected))if(hashBeginnerRecord(record[key])!==hashBeginnerRecord(value))throw new ConflictException('BEGINNER_REVIEW_STALE');
}
export async function verifyBeginnerAudioSelection(tx:Prisma.TransactionClient,importId:string,rawSource:string,selection:Record<string,string>,storage:ObjectStorage):Promise<void>{
 const doc=parseLessonSource(rawSource).document;
 const refs=new Set(doc.activities.filter(a=>a.activityType==='listening').map(a=>a.audioRef));
 if(refs.has(undefined)||Object.keys(selection).length!==refs.size||Object.keys(selection).some(k=>!refs.has(k)))throw new ConflictException('BEGINNER_AUDIO_SELECTION_REQUIRED');
 const ids=Object.values(selection);if(new Set(ids).size!==ids.length)throw new ConflictException('BEGINNER_AUDIO_SELECTION_REQUIRED');
 for(const id of [...ids].sort())await tx.$queryRaw`SELECT "id" FROM "AudioArtifact" WHERE "id"=${id}::uuid FOR SHARE`;
 const rows=await tx.audioArtifact.findMany({where:{id:{in:ids}}});
 for(const ref of refs){
  const script=doc.audioScripts.find(a=>a.slug===ref),row=rows.find(a=>a.id===selection[ref!]);
  if(!script||!row||row.contentImportId!==importId||row.audioScriptSlug!==ref||row.status!=='READY'||row.scriptHash!==createHash('sha256').update(audioScriptFingerprintText(script)).digest('hex'))throw new ConflictException('BEGINNER_AUDIO_STALE');
  const bytes=await storage.read(row.storageKey);
  if(bytes.length!==row.byteSize||createHash('sha256').update(bytes).digest('hex')!==row.checksum)throw new ConflictException('BEGINNER_AUDIO_FILE_MISMATCH');
 }
}

export function assertBeginnerCurriculumReview(input:unknown,expected:{environmentId:string;target:BeginnerTarget;revision:number;definitionHash:string;editorId:string},auditActorId:string):void{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ConflictException('BEGINNER_CURRICULUM_REVIEW_REQUIRED');
 const r=input as Record<string,unknown>,{reviewHash,...data}=r;
 if(!expected.editorId||r.kind!=='FIXTURE_TECHNICAL_REVIEW'||r.actorId!==auditActorId||r.actorId===expected.editorId||typeof reviewHash!=='string'||hashBeginnerRecord(data)!==reviewHash)throw new ConflictException('BEGINNER_CURRICULUM_REVIEW_REQUIRED');
 for(const [key,value]of Object.entries(expected))if(hashBeginnerRecord(r[key]??null)!==hashBeginnerRecord(value))throw new ConflictException('BEGINNER_REVIEW_STALE');
}
