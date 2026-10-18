import { createHash } from 'node:crypto';
import { ConflictException, GoneException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IeltsMockRecording } from '@prisma/client';
import { ieltsMockContentSchema, ieltsMockRecordingSchema, mockRecordingUploadSchema, type IeltsMockRecordingDto } from '@worklingo/contracts';
import type { AppConfig } from '../../common/config/app-config.schema.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import { AudioUploadPolicyError, validateAudioUpload, type AudioUpload } from '../../media/domain/audio-upload-policy.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { MockAttemptClock } from './mock-attempt-clock.js';
import { lockMockAttempt, mockAttemptInclude, type MockAttemptRecord } from './mock-attempt-state.js';

@Injectable()
export class MockRecordingService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(ObjectStorage) private readonly storage: ObjectStorage, @Inject(ConfigService) private readonly config: ConfigService<AppConfig, true>, @Inject(MockAttemptClock) private readonly clock: MockAttemptClock, @Inject(JobDispatcher) private readonly jobs: JobDispatcher) {}

  async upload(learnerId: string, attemptId: string, input: unknown, file: AudioUpload): Promise<IeltsMockRecordingDto> {
    // Multipart values arrive as strings under tsx as well as compiled Nest.
    // Do not depend on emitted decorator metadata for consent or part parsing.
    const raw = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
    const result = mockRecordingUploadSchema.safeParse({ ...raw, part: typeof raw.part === 'string' && /^[1-3]$/u.test(raw.part) ? Number(raw.part) : raw.part, consent: raw.consent === 'true' ? true : raw.consent === 'false' ? false : raw.consent });
    if (!result.success) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_RECORDING_INPUT_INVALID' });
    const parsed = result.data;
    const attempt = await this.db.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: mockAttemptInclude });
    if (!attempt) throw new NotFoundException('Mock attempt not found.');
    if (!parsed.consent) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_RECORDING_CONSENT_REQUIRED' });
    const ai = this.config.get('ai', { infer: true });
    const part = ieltsMockContentSchema.parse(attempt.mockTestVersion.content).speaking.parts.find(part => part.part === parsed.part);
    if (!part) throw new UnprocessableEntityException({ code: 'IELTS_MOCK_SPEAKING_PART_INVALID' });
    let durationSeconds: number;
    try { ({ durationSeconds } = await validateAudioUpload(file, { maxBytes: ai.recordingMaxBytes, maxDurationSeconds: part.responseSeconds })); }
    catch (error) { if (error instanceof AudioUploadPolicyError) throw new UnprocessableEntityException({ code: error.code, message: error.message }); throw error; }
    const checksum = createHash('sha256').update(file.body).digest('hex');
    const prior = await this.db.ieltsMockRecording.findUnique({ where: { attemptId_clientRecordingId: { attemptId, clientRecordingId: parsed.clientRecordingId } } });
    if (prior) { if (prior.deletedAt || prior.retainUntil.getTime() <= this.clock.now().getTime()) throw new GoneException({ code: 'IELTS_MOCK_RECORDING_EXPIRED' }); if (prior.part !== parsed.part || prior.checksum !== checksum) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT' }); return this.dto(prior); }
    this.requireWritable(attempt);
    const staged = await this.storage.put({ body: file.body, contentType: file.mimeType, prefix: 'ielts-mock-recordings' });
    let keep = false;
    try {
      const outcome = await this.db.$transaction(async tx => {
        const current = await lockMockAttempt(tx, learnerId, attemptId);
        const duplicate = await tx.ieltsMockRecording.findUnique({ where: { attemptId_clientRecordingId: { attemptId, clientRecordingId: parsed.clientRecordingId } } });
        if (duplicate) { if (duplicate.part !== parsed.part || duplicate.checksum !== checksum) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT' }); return { recording: duplicate, created: false }; }
        this.requireWritable(current);
        const now = this.clock.now();
        const recording = await tx.ieltsMockRecording.create({ data: { attemptId, clientRecordingId: parsed.clientRecordingId, part: parsed.part, storageKey: staged.key, mimeType: file.mimeType, byteSize: file.body.length, checksum, durationSeconds, consentedAt: now, createdAt: now, retainUntil: new Date(now.getTime() + ai.recordingRetentionDays * 86_400_000) } });
        const job = await this.jobs.enqueue({ createdById: learnerId, idempotencyKey: `ielts-mock-recording-retention:${recording.id}`, type: 'IELTS_MOCK_RECORDING_RETENTION', payload: { recordingId: recording.id }, resourceId: recording.id, resourceType: 'IeltsMockRecording' }, tx);
        await tx.job.update({ where: { id: job.id }, data: { availableAt: recording.retainUntil } });
        await tx.auditLog.create({ data: { actorId: learnerId, action: 'UPLOAD_IELTS_MOCK_RECORDING', resourceType: 'IeltsMockRecording', resourceId: recording.id, metadata: { attemptId, part: parsed.part, consentPolicyVersion: recording.consentPolicyVersion } } });
        return { recording, created: true };
      });
      keep = outcome.created;
      return this.dto(outcome.recording);
    } finally { if (!keep) await this.storage.delete(staged.key); }
  }

  async listOwned(learnerId: string, attemptId: string): Promise<IeltsMockRecordingDto[]> {
    if (!await this.db.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId } })) throw new NotFoundException('Mock attempt not found.');
    return (await this.db.ieltsMockRecording.findMany({ where: { attemptId, deletedAt: null, retainUntil: { gt: this.clock.now() } }, orderBy: [{ part: 'asc' }, { createdAt: 'desc' }] })).map(recording => this.dto(recording));
  }
  async read(learnerId: string, attemptId: string, recordingId: string, reviewer = false) {
    if (reviewer) {
      const actor = await this.db.user.findUnique({ where: { id: learnerId } });
      if (!actor || actor.status !== 'ACTIVE' || !['CONTENT_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) throw new NotFoundException('Mock recording not found.');
    }
    const recording = await this.db.ieltsMockRecording.findFirst({ where: { id: recordingId, attemptId, ...(reviewer ? {} : { attempt: { learnerId } }) } });
    if (!recording) throw new NotFoundException('Mock recording not found.');
    if (recording.deletedAt || recording.retainUntil.getTime() <= this.clock.now().getTime()) throw new GoneException({ code: 'IELTS_MOCK_RECORDING_EXPIRED' });
    return { body: await this.storage.read(recording.storageKey), mimeType: recording.mimeType };
  }
  private requireWritable(attempt: MockAttemptRecord) {
    if (attempt.policyVersion !== 'v2' || attempt.status !== 'IN_PROGRESS' || attempt.currentSection !== 'SPEAKING' || attempt.pausedAt || (attempt.mode === 'EXAM_SIMULATION' && attempt.sectionDeadlineAt.getTime() <= this.clock.now().getTime())) throw new ConflictException({ code: 'IELTS_MOCK_SPEAKING_NOT_WRITABLE' });
  }
  private dto(recording: IeltsMockRecording): IeltsMockRecordingDto { return ieltsMockRecordingSchema.parse({ id: recording.id, part: recording.part, durationSeconds: recording.durationSeconds, createdAt: recording.createdAt.toISOString() }); }
}
