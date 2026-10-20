import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { ieltsIntroductionSchema, ieltsIntroductionVisitSchema, orientationContentSchema, visitIeltsIntroductionSchema, type IeltsIntroductionDto, type IeltsIntroductionVisitDto } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { canEnterIeltsV3 } from '../../ielts-flow/domain/ielts-flow-policy.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class IeltsIntroductionService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async get(learnerId: string, versionId?: string): Promise<IeltsIntroductionDto> {
    const resolved = await this.resolve(this.db, learnerId, versionId);
    const content = orientationContentSchema.parse(resolved.version.content);
    return ieltsIntroductionSchema.parse({
      currentPublishedVersionId: resolved.current?.id ?? null,
      visit: resolved.visit ? this.visitDto(resolved.visit) : null,
      presentation: {
        id: resolved.version.id, orientationId: resolved.version.orientationId, version: resolved.version.version, title: resolved.version.title,
        slides: content.slides.map(({ audioAssetId, imageAssetId, question, ...slide }) => ({
          ...slide,
          audioUrl: audioAssetId ? this.mediaUrl(audioAssetId, resolved.version.id) : null,
          imageUrl: imageAssetId ? this.mediaUrl(imageAssetId, resolved.version.id) : null,
          question: question ? { slug: question.slug, prompt: question.prompt, options: question.options } : null,
        })),
      },
    });
  }

  async visit(learnerId: string, input: unknown): Promise<IeltsIntroductionVisitDto> {
    const parsed = visitIeltsIntroductionSchema.parse(input);
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-intro:' + learnerId + ':' + parsed.orientationVersionId}))`;
      const { version, visit } = await this.resolve(tx, learnerId, parsed.orientationVersionId);
      if ((visit?.revision ?? 0) !== parsed.expectedRevision) throw new ConflictException({ code: 'IELTS_INTRODUCTION_REVISION_STALE' });
      const content = orientationContentSchema.parse(version.content);
      const slide = content.slides[parsed.slideIndex];
      if (!slide) throw new UnprocessableEntityException({ code: 'IELTS_INTRODUCTION_SLIDE_INVALID' });
      const visitedSlideIds = [...new Set([...(visit && Array.isArray(visit.visitedSlideIds) ? visit.visitedSlideIds.filter((id): id is string => typeof id === 'string') : []), slide.id])];
      const viewedAllAt = visit?.viewedAllAt ?? (content.slides.every(item => visitedSlideIds.includes(item.id)) ? new Date() : null);
      const data = { lastSlideIndex: parsed.slideIndex, visitedSlideIds, viewedAllAt };
      const saved = visit
        ? await tx.ieltsIntroductionVisit.update({ where: { id: visit.id }, data: { ...data, revision: { increment: 1 } } })
        : await tx.ieltsIntroductionVisit.create({ data: { ...data, learnerId, orientationVersionId: version.id } });
      return this.visitDto(saved);
    });
  }

  async getMedia(learnerId: string, assetId: string, versionId: string): Promise<{ body: Buffer; mimeType: string }> {
    const { version } = await this.resolve(this.db, learnerId, versionId);
    const content = orientationContentSchema.parse(version.content);
    if (!content.slides.some(slide => slide.audioAssetId === assetId || slide.imageAssetId === assetId)) throw new NotFoundException('Introduction media not found.');
    const asset = await this.db.orientationMediaAsset.findFirst({ where: { id: assetId, orientationId: version.orientationId } });
    if (!asset) throw new NotFoundException('Introduction media not found.');
    return { body: await this.storage.read(asset.storageKey), mimeType: asset.mimeType };
  }

  private async resolve(db: Db, learnerId: string, versionId?: string) {
    const [user, program, orientation, visit] = await Promise.all([
      db.user.findUnique({ where: { id: learnerId }, include: { profile: true } }),
      db.learningProgram.findUnique({ where: { slug: 'ielts' } }),
      db.ieltsOrientation.findUnique({ where: { slug: 'ielts-orientation' }, include: { currentPublishedVersion: true } }),
      db.ieltsIntroductionVisit.findFirst({ where: { learnerId, ...(versionId ? { orientationVersionId: versionId } : {}) }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] }),
    ]);
    if (!user || user.role !== 'LEARNER' || user.status !== 'ACTIVE' || user.profile?.onboardingStatus !== 'COMPLETE') throw new ConflictException({ code: 'IELTS_ONBOARDING_REQUIRED' });
    const current = orientation?.status === 'PUBLISHED' && orientation.currentPublishedVersion?.status === 'PUBLISHED' ? orientation.currentPublishedVersion : null;
    const targetId = versionId ?? visit?.orientationVersionId ?? current?.id;
    if (!targetId) throw new NotFoundException('IELTS introduction is not published.');
    const oldProgress = await db.orientationProgress.findFirst({ where: { learnerId, orientationVersionId: targetId } });
    const pinned = visit?.orientationVersionId === targetId || !!oldProgress;
    if (!pinned) {
      if (versionId && targetId !== current?.id) throw new NotFoundException('Introduction version not found.');
      if (this.config.get('ieltsFlow') !== 'v3' || !canEnterIeltsV3({ role: user.role, status: user.status, onboardingStatus: user.profile.onboardingStatus, programStatus: program?.availabilityStatus ?? 'DISABLED' })) throw new ConflictException({ code: 'IELTS_V3_NOT_AVAILABLE' });
    }
    const version = await db.ieltsOrientationVersion.findUnique({ where: { id: targetId } });
    if (!version || (!pinned && version.id !== current?.id)) throw new NotFoundException('Introduction version not found.');
    return { version, current, visit: visit?.orientationVersionId === targetId ? visit : null };
  }

  private visitDto(visit: { orientationVersionId: string; lastSlideIndex: number; visitedSlideIds: Prisma.JsonValue; viewedAllAt: Date | null; revision: number }): IeltsIntroductionVisitDto {
    return ieltsIntroductionVisitSchema.parse({ orientationVersionId: visit.orientationVersionId, lastSlideIndex: visit.lastSlideIndex, visitedSlideIds: visit.visitedSlideIds, viewedAllAt: visit.viewedAllAt?.toISOString() ?? null, revision: visit.revision });
  }
  private mediaUrl(assetId: string, versionId: string) { return `/api/v1/me/ielts-introduction/media/${assetId}?versionId=${versionId}`; }
}
