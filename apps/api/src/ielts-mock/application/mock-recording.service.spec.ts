import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../common/config/app-config.schema.js';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import type { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import type { MockAttemptClock } from './mock-attempt-clock.js';
import { MockRecordingService } from './mock-recording.service.js';

it('cleans staged captured audio when a concurrent section transition rejects its transaction', async () => {
  const body = Buffer.alloc(44 + 32000); body.write('RIFF'); body.writeUInt32LE(body.length - 8, 4); body.write('WAVE', 8); body.write('fmt ', 12); body.writeUInt32LE(16, 16); body.writeUInt16LE(1, 20); body.writeUInt16LE(1, 22); body.writeUInt32LE(16000, 24); body.writeUInt32LE(32000, 28); body.writeUInt16LE(2, 32); body.writeUInt16LE(16, 34); body.write('data', 36); body.writeUInt32LE(32000, 40);
  const db = { ieltsMockAttempt: { findFirst: vi.fn().mockResolvedValue({ policyVersion: 'v2', mode: 'PRACTICE', status: 'IN_PROGRESS', currentSection: 'SPEAKING', mockTestVersion: { content: INITIAL_IELTS_ACADEMIC_MOCK } }) }, ieltsMockRecording: { findUnique: vi.fn().mockResolvedValue(null) }, $transaction: vi.fn().mockRejectedValue(new Error('section changed')) };
  const storage = { put: vi.fn().mockResolvedValue({ key: 'staged' }), delete: vi.fn() };
  const config = { get: () => ({ recordingMaxBytes: 1_000_000, recordingRetentionDays: 7 }) };
  const service = new MockRecordingService(db as unknown as PrismaService, storage as unknown as ObjectStorage, config as unknown as ConfigService<AppConfig, true>, { now: () => new Date() } as MockAttemptClock, {} as JobDispatcher);
  await expect(service.upload('learner', 'attempt', { clientRecordingId: '11111111-1111-4111-8111-111111111111', part: '1', consent: 'true' }, { body, mimeType: 'audio/wav' })).rejects.toThrow('section changed');
  expect(storage.delete).toHaveBeenCalledWith('staged');
});
