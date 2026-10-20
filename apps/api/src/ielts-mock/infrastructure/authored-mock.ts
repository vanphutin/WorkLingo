import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ieltsMockContentSchema } from '@worklingo/contracts';
import { ieltsContentRoot } from '../../ielts-study/infrastructure/topic-content.js';
import { verifyWave } from '../../ielts-beta-release/safety.js';
import type { PreparedIeltsAudio } from '../../../scripts/prepare-ielts-flow-v3.js';
import type { IeltsMockAudioManifest } from '../domain/mock-content-qualification.js';

export async function readAuthoredMock(options: { verifyBytes?: boolean } = {}) {
  const paper=ieltsMockContentSchema.parse(JSON.parse(await readFile(path.join(ieltsContentRoot,'mocks/academic-02/paper.json'),'utf8')));
  const entries=JSON.parse(await readFile(path.join(ieltsContentRoot,'mocks/academic-02/audio-manifest.json'),'utf8')) as PreparedIeltsAudio[];
  const scripts=(JSON.parse(await readFile(path.join(ieltsContentRoot,'mocks/academic-02/listening-scripts.json'),'utf8')) as {parts:unknown[]}).parts;
  const audioManifest:IeltsMockAudioManifest=[];
  for (const [index,entry] of entries.entries()) {
    if (!/^mock-part-[1-4]\.wav$/u.test(entry.file)) throw new Error('Unsafe audio filename.');
    if (options.verifyBytes) { const body=await readFile(path.join(ieltsContentRoot,'.prepared',entry.file));
      if (createHash('sha256').update(body).digest('hex')!==entry.checksum||body.length!==entry.byteSize||Math.abs(verifyWave(body).durationSeconds-entry.durationSeconds)>0.01) throw new Error('Audio checksum or actual duration mismatch.'); }
    if (createHash('sha256').update(JSON.stringify(scripts[index])).digest('hex')!==entry.provenance.scriptHash) throw new Error('Audio script mismatch.');
    if (entry.provenance.transcriptHash!==createHash('sha256').update(paper.listening.parts[index]?.transcript??'').digest('hex')) throw new Error('Paper transcript and speech manifest differ.');
    audioManifest.push({...entry,mimeType:'audio/wav'});
  }
  return {paper,audioManifest};
}
