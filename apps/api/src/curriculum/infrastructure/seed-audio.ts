import { createHash } from 'node:crypto';
import path from 'node:path';

import type { Prisma } from '@prisma/client';

import { FakeTextToSpeechAdapter } from '../../ai-gateway/infrastructure/fake-tts.adapter.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { LocalObjectStorageAdapter } from '../../storage/infrastructure/local-object-storage.adapter.js';

interface SeedAudioInput {
  readonly audioScriptSlug: string;
  readonly lessonVersionId: string;
  readonly script: string;
}

export async function createSeededAudioArtifact(
  database: Prisma.TransactionClient,
  storage: ObjectStorage,
  input: SeedAudioInput,
): Promise<void> {
  const textToSpeech = new FakeTextToSpeechAdapter();
  const synthesized = await textToSpeech.synthesize({ script: input.script });
  const stored = await storage.put({
    body: synthesized.audioBytes,
    contentType: synthesized.mimeType,
    prefix: 'seeded-audio',
  });
  const scriptHash = createHash('sha256').update(input.script).digest('hex');
  try {
    const artifact = await database.audioArtifact.create({
      data: {
        adapterName: textToSpeech.providerName,
        audioScriptSlug: input.audioScriptSlug,
        byteSize: stored.size,
        checksum: synthesized.checksum,
        mimeType: synthesized.mimeType,
        scriptHash,
        status: 'READY',
        storageKey: stored.key,
        voiceConfig: { voice: synthesized.provider?.voice ?? 'fake-neutral' },
      },
    });
    await database.lessonVersionAudioArtifact.create({
      data: {
        audioArtifactId: artifact.id,
        audioScriptSlug: input.audioScriptSlug,
        lessonVersionId: input.lessonVersionId,
      },
    });
  } catch (error) {
    await storage.delete(stored.key).catch(() => undefined);
    throw error;
  }
}

export function createLocalSeedStorage(): ObjectStorage {
  return new LocalObjectStorageAdapter(
    path.resolve(process.env.WORKLINGO_DATA_DIR ?? './data'),
  );
}
