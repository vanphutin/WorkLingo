import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IeltsMockPlayback } from '@prisma/client';
import { ieltsMockContentSchema, playbackLeaseSchema, type PlaybackLeaseDto } from '@worklingo/contracts';
import { parseBuffer } from 'music-metadata';
import { PrismaService } from '../../common/database/prisma.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { MockAttemptClock } from './mock-attempt-clock.js';
import { lockMockAttempt, mockAttemptInclude, mockSubmitted, type MockAttemptRecord } from './mock-attempt-state.js';

@Injectable()
export class MockPlaybackService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(ObjectStorage) private readonly storage: ObjectStorage, @Inject(MockAttemptClock) private readonly clock: MockAttemptClock) {}

  async start(learnerId: string, attemptId: string, assetId: string, clientPlayId: string): Promise<PlaybackLeaseDto> {
    const initial = await this.db.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: mockAttemptInclude });
    this.requireListening(initial, assetId);
    const artifact = await this.artifact(assetId);
    // Verify readable bytes before consuming a play. No external storage call
    // runs while holding the attempt row lock.
    const bytes = await this.storage.read(artifact.storageKey);
    if (bytes.length !== artifact.byteSize || createHash('sha256').update(bytes).digest('hex') !== artifact.checksum) throw new NotFoundException('Mock audio is unavailable.');
    const durationSeconds = (await parseBuffer(bytes, { mimeType: artifact.mimeType })).format.duration;
    if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new NotFoundException('Mock audio duration is unavailable.');
    return this.db.$transaction(async tx => {
      const attempt = await lockMockAttempt(tx, learnerId, attemptId);
      const index = this.requireListening(attempt, assetId);
      const now = this.clock.now();
      if (attempt.mode === 'PRACTICE') return playbackLeaseSchema.parse({ id: clientPlayId, streamUrl: this.streamUrl(attemptId, assetId), expiresAt: new Date(now.getTime() + 86_400_000).toISOString(), remainingSeconds: durationSeconds });
      const existing = await tx.ieltsMockPlayback.findUnique({ where: { attemptId_assetId: { attemptId, assetId } } });
      if (existing) {
        if (existing.clientPlayId !== clientPlayId) throw new ConflictException({ code: 'IELTS_MOCK_AUDIO_PLAY_LIMIT' });
        this.requireLiveLease(existing, now);
        return this.dto(existing, now);
      }
      const parts = ieltsMockContentSchema.parse(attempt.mockTestVersion.content).listening.parts;
      for (const earlier of parts.slice(0, index)) {
        const prior = earlier.audioAssetId ? await tx.ieltsMockPlayback.findUnique({ where: { attemptId_assetId: { attemptId, assetId: earlier.audioAssetId } } }) : null;
        if (!prior?.activatedAt || prior.activatedAt.getTime() + prior.durationSeconds * 1000 > now.getTime()) throw new ConflictException({ code: 'IELTS_MOCK_AUDIO_PART_ORDER' });
      }
      const lease = await tx.ieltsMockPlayback.create({ data: { attemptId, assetId, clientPlayId, durationSeconds, createdAt: now, expiresAt: attempt.sectionDeadlineAt } });
      return this.dto(lease, now);
    });
  }

  /** Reserve at the user gesture; begin elapsed playback only once actual audio plays. */
  async activate(learnerId:string,attemptId:string,assetId:string,leaseId:string):Promise<PlaybackLeaseDto>{
    return this.db.$transaction(async tx=>{
      const attempt=await lockMockAttempt(tx,learnerId,attemptId);this.requireListening(attempt,assetId);
      const lease=await tx.ieltsMockPlayback.findFirst({where:{id:leaseId,attemptId,assetId}});
      if(!lease||attempt.mode!=='EXAM_SIMULATION')throw new NotFoundException('Mock playback not found.');
      const now=this.clock.now();this.requireLiveLease(lease,now);
      if(lease.activatedAt)return this.dto(lease,now);
      const active=await tx.ieltsMockPlayback.update({where:{id:lease.id},data:{activatedAt:now,expiresAt:new Date(Math.min(attempt.sectionDeadlineAt.getTime(),now.getTime()+(lease.durationSeconds+30)*1000))}});
      return this.dto(active,now);
    });
  }

  async current(learnerId: string, attemptId: string, assetId: string): Promise<PlaybackLeaseDto | null> {
    const attempt = await this.db.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: mockAttemptInclude });
    this.requireListening(attempt, assetId);
    const lease = await this.db.ieltsMockPlayback.findUnique({ where: { attemptId_assetId: { attemptId, assetId } } });
    if (!lease) return null;
    this.requireLiveLease(lease, this.clock.now());
    return this.dto(lease, this.clock.now());
  }

  async stream(learnerId: string, attemptId: string, assetId: string, leaseId?: string): Promise<{ body: Buffer; mimeType: string }> {
    const attempt = await this.db.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: mockAttemptInclude });
    this.requireListening(attempt, assetId);
    if (attempt!.mode === 'EXAM_SIMULATION') {
      const lease = leaseId ? await this.db.ieltsMockPlayback.findFirst({ where: { id: leaseId, attemptId, assetId } }) : null;
      if (!lease) throw new ConflictException({ code: 'IELTS_MOCK_AUDIO_LEASE_REQUIRED' });
      this.requireLiveLease(lease, this.clock.now());
    }
    const artifact = await this.artifact(assetId);
    return { body: await this.storage.read(artifact.storageKey), mimeType: artifact.mimeType };
  }

  private requireListening(attempt: MockAttemptRecord | null, assetId: string): number {
    if (!attempt || attempt.policyVersion !== 'v2') throw new NotFoundException('Mock audio not found.');
    const content = ieltsMockContentSchema.parse(attempt.mockTestVersion.content);
    const index = content.listening.parts.findIndex(part => part.audioAssetId === assetId);
    if (index < 0) throw new NotFoundException('Mock audio not found.');
    if (attempt.pausedAt) throw new ConflictException({ code: 'IELTS_MOCK_PAUSED' });
    if (attempt.mode === 'PRACTICE') {
      if (attempt.currentSection !== 'LISTENING' && !mockSubmitted(attempt.submittedSections).includes('LISTENING')) throw new NotFoundException('Mock audio not found.');
    } else if (attempt.status !== 'IN_PROGRESS' || attempt.currentSection !== 'LISTENING' || attempt.sectionDeadlineAt.getTime() <= this.clock.now().getTime()) throw new ConflictException({ code: 'IELTS_MOCK_SECTION_EXPIRED' });
    return index;
  }
  private async artifact(id: string) { const artifact = await this.db.audioArtifact.findFirst({ where: { id, status: 'READY', adapterName: { not: 'fake-tts' } } }); if (!artifact) throw new NotFoundException('Mock audio not found.'); return artifact; }
  private requireLiveLease(lease: IeltsMockPlayback, now: Date) { if (lease.expiresAt.getTime() <= now.getTime()) throw new ConflictException({ code: 'IELTS_MOCK_AUDIO_LEASE_EXPIRED' }); }
  private streamUrl(attemptId: string, assetId: string, leaseId?: string) { return `/api/v1/me/ielts-mocks/attempts/${attemptId}/audio/${assetId}${leaseId ? `?leaseId=${leaseId}` : ''}`; }
  private dto(lease: IeltsMockPlayback, now: Date): PlaybackLeaseDto { return playbackLeaseSchema.parse({ id: lease.id, streamUrl: this.streamUrl(lease.attemptId, lease.assetId, lease.id), expiresAt: lease.expiresAt.toISOString(), remainingSeconds: lease.activatedAt ? Math.max(0, (lease.activatedAt.getTime() + lease.durationSeconds * 1000 - now.getTime()) / 1000) : lease.durationSeconds }); }
}
