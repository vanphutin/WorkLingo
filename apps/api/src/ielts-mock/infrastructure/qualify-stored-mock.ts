import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { IeltsContentQualificationResult, IeltsMockContent } from '@worklingo/contracts';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { verifyWave } from '../../ielts-beta-release/safety.js';
import { qualifyIeltsMockPaper, type IeltsMockAudioManifest } from '../domain/mock-content-qualification.js';

/** Resolve verified bytes; never trust a client-provided duration or qualification label. */
export async function qualifyStoredMock(db: Prisma.TransactionClient, storage: ObjectStorage | undefined, paper: IeltsMockContent): Promise<IeltsContentQualificationResult> {
  if (paper.schemaVersion!==2) return {canPublish:true,supportedDurations:[],qualifiedModes:[],issues:[]};
  const unavailable=()=>({canPublish:false,supportedDurations:[],qualifiedModes:[],issues:[{code:'IELTS_MOCK_VERIFIED_AUDIO_REQUIRED',path:'audio',message:'V2 publication requires verified real audio and its original timeline manifest.'}]} satisfies IeltsContentQualificationResult);
  if (!storage) return unavailable();
  const manifest:IeltsMockAudioManifest=[];
  for (const part of paper.listening.parts) {
    const row=part.audioAssetId ? await db.audioArtifact.findUnique({where:{id:part.audioAssetId}}):null;
    if (!row||row.status!=='READY'||row.adapterName!=='local-windows-speech') return unavailable();
    const config=row.voiceConfig as Record<string,unknown>;
    const entry=config.ieltsV3 as IeltsMockAudioManifest[number] | undefined;
    if (!entry||entry.assetId!==row.id||entry.checksum!==row.checksum||entry.byteSize!==row.byteSize||entry.provenance?.scriptHash!==row.scriptHash) return unavailable();
    try {
      const body=await storage.read(row.storageKey);
      if (body.length!==row.byteSize||createHash('sha256').update(body).digest('hex')!==row.checksum||Math.abs(verifyWave(body).durationSeconds-entry.durationSeconds)>0.01) return unavailable();
      manifest.push({...entry,mimeType:row.mimeType});
    } catch {return unavailable();}
  }
  return qualifyIeltsMockPaper(paper,manifest);
}
