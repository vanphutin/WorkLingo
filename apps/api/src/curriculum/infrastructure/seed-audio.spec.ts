import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { createSeededAudioArtifact } from './seed-audio.js';

describe('createSeededAudioArtifact', () => {
  it('deletes the stored object when database persistence fails', async () => {
    const storage = {
      delete: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue({
        contentType: 'audio/wav',
        key: 'seeded-audio/orphan.wav',
        size: 64,
      }),
      read: vi.fn(),
    } as unknown as ObjectStorage;
    const database = {
      audioArtifact: {
        create: vi.fn().mockRejectedValue(new Error('database unavailable')),
      },
      lessonVersionAudioArtifact: { create: vi.fn() },
    } as unknown as Prisma.TransactionClient;

    await expect(createSeededAudioArtifact(database, storage, {
      audioScriptSlug: 'dialogue',
      lessonVersionId: '00000000-0000-4000-8000-000000000001',
      script: 'Welcome to the team.',
    })).rejects.toThrow('database unavailable');

    expect(storage.delete).toHaveBeenCalledWith('seeded-audio/orphan.wav');
  });
});
