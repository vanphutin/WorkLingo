import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import type { MockAttemptClock } from './mock-attempt-clock.js';
import { MockPlaybackService } from './mock-playback.service.js';

it('does not consume a one-play allowance when stored bytes are unavailable or corrupt', async () => {
  const assetId = '11111111-1111-4111-8111-111111111111';
  const content = structuredClone(INITIAL_IELTS_ACADEMIC_MOCK);
  content.listening.parts[0]!.audioAssetId = assetId;
  const db = { ieltsMockAttempt: { findFirst: vi.fn().mockResolvedValue({ policyVersion: 'v2', mode: 'EXAM_SIMULATION', status: 'IN_PROGRESS', currentSection: 'LISTENING', sectionDeadlineAt: new Date('2030-01-01'), mockTestVersion: { content } }) }, audioArtifact: { findFirst: vi.fn().mockResolvedValue({ storageKey: 'missing', byteSize: 500, checksum: 'expected', mimeType: 'audio/wav' }) }, $transaction: vi.fn() };
  const storage = { read: vi.fn().mockRejectedValueOnce(new Error('storage offline')).mockResolvedValue(Buffer.from('corrupt')) };
  const service = new MockPlaybackService(db as unknown as PrismaService, storage as unknown as ObjectStorage, { now: () => new Date('2026-10-15') } as MockAttemptClock);
  await expect(service.start('learner', 'attempt', assetId, 'play')).rejects.toThrow('storage offline');
  await expect(service.start('learner', 'attempt', assetId, 'play')).rejects.toThrow('unavailable');
  expect(db.$transaction).not.toHaveBeenCalled();
});
