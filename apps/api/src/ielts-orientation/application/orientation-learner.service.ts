import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  orientationAnswerRecordSchema,
  orientationContentSchema,
  orientationLearnerPresentationSchema,
  orientationLearnerStatusSchema,
  orientationProgressResultSchema,
  orientationProgressSchema,
  orientationProgressUpdateSchema,
  type OrientationAnswerRecord,
  type OrientationLearnerPresentation,
  type OrientationLearnerStatusDto,
  type OrientationProgressResult,
  type OrientationProgressUpdateInput,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { INTERMEDIATE_PROGRAM_ID } from '../../learning-programs/domain/program-catalog.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';

const ORIENTATION_SLUG = 'ielts-orientation';
const FOUNDATION_PREFIX = 'FOUNDATION_';
const REQUIRED_SKILLS = ['reading', 'listening', 'speaking', 'writing'] as const;

type OrientationVersionRecord = {
  id: string;
  orientationId: string;
  version: number;
  title: string;
  content: Prisma.JsonValue;
};

type ProgressRecord = {
  id: string;
  orientationVersionId: string;
  currentSlideIndex: number;
  revision: number;
  answers: Prisma.JsonValue;
  completedAt: Date | null;
  orientationVersion: OrientationVersionRecord;
};

@Injectable()
export class OrientationLearnerService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
  ) {}

  async getStatus(learnerId: string): Promise<OrientationLearnerStatusDto> {
    const existing = await this.findPinnedProgress(this.database, learnerId);
    if (existing) return this.statusFromProgress(existing);

    const eligibility = await this.readEligibility(learnerId);
    return orientationLearnerStatusSchema.parse({
      state: eligibility.reasons.length === 0 ? 'available' : 'locked',
      reasons: eligibility.reasons,
      presentation: null,
      progress: null,
    });
  }

  async start(learnerId: string): Promise<OrientationLearnerStatusDto> {
    const existing = await this.findPinnedProgress(this.database, learnerId);
    if (existing) return this.statusFromProgress(existing);

    const eligibility = await this.readEligibility(learnerId);
    if (eligibility.reasons.length > 0 || !eligibility.version) {
      throw new ConflictException({ code: 'ORIENTATION_LOCKED', reasons: eligibility.reasons });
    }
    const created = await this.database.orientationProgress.create({
      data: { learnerId, orientationVersionId: eligibility.version.id, answers: [] },
      include: { orientationVersion: true },
    });
    return this.statusFromProgress(created);
  }

  async updateProgress(learnerId: string, input: OrientationProgressUpdateInput): Promise<OrientationProgressResult> {
    const parsed = orientationProgressUpdateSchema.parse(input);
    return this.database.$transaction(async (transaction) => {
      const initial = await transaction.orientationProgress.findFirst({
        where: { learnerId, orientationVersionId: parsed.orientationVersionId },
        include: { orientationVersion: true },
      });
      if (!initial) throw new NotFoundException('IELTS orientation progress not found.');
      await transaction.$queryRaw`SELECT "id" FROM "OrientationProgress" WHERE "id" = ${initial.id}::uuid FOR UPDATE`;
      const progress = await transaction.orientationProgress.findUnique({
        where: { id: initial.id }, include: { orientationVersion: true },
      });
      if (!progress) throw new NotFoundException('IELTS orientation progress not found.');
      if (progress.completedAt) throw new ConflictException({ code: 'ORIENTATION_ALREADY_COMPLETED' });
      if (progress.revision !== parsed.expectedRevision) throw new ConflictException({ code: 'ORIENTATION_REVISION_STALE' });

      const content = orientationContentSchema.parse(progress.orientationVersion.content);
      const lastIndex = content.slides.length - 1;
      if (parsed.targetSlideIndex > Math.min(progress.currentSlideIndex + 1, lastIndex)) {
        throw new UnprocessableEntityException({ code: 'ORIENTATION_SLIDE_LOCKED' });
      }

      let targetSlideIndex = parsed.targetSlideIndex;
      let answerFeedback: OrientationProgressResult['answerFeedback'] = null;
      let answers = this.parseAnswers(progress.answers);
      const currentQuestion = content.slides[progress.currentSlideIndex]?.question;
      if (parsed.targetSlideIndex > progress.currentSlideIndex && currentQuestion) {
        if (!parsed.answer || parsed.answer.questionSlug !== currentQuestion.slug) {
          throw new UnprocessableEntityException({ code: 'ORIENTATION_ANSWER_REQUIRED' });
        }
        if (parsed.answer.selectedIndex >= currentQuestion.options.length) {
          throw new UnprocessableEntityException({ code: 'ORIENTATION_ANSWER_INVALID' });
        }
        const correct = parsed.answer.selectedIndex === currentQuestion.answerIndex;
        const answer = orientationAnswerRecordSchema.parse({
          questionSlug: currentQuestion.slug,
          selectedIndex: parsed.answer.selectedIndex,
          correct,
          answeredAt: new Date().toISOString(),
        });
        answers = [...answers.filter((item) => item.questionSlug !== answer.questionSlug), answer];
        answerFeedback = { questionSlug: currentQuestion.slug, correct, explanation: currentQuestion.explanation };
        if (!correct) targetSlideIndex = progress.currentSlideIndex;
      } else if (parsed.answer) {
        throw new UnprocessableEntityException({ code: 'ORIENTATION_ANSWER_UNEXPECTED' });
      }

      let completedAt: Date | null = null;
      if (parsed.complete) {
        if (progress.currentSlideIndex !== lastIndex || targetSlideIndex !== lastIndex || !this.allChecksPassed(content, answers)) {
          throw new UnprocessableEntityException({ code: 'ORIENTATION_COMPLETION_REQUIREMENTS_NOT_MET' });
        }
        completedAt = new Date();
      }
      const updated = await transaction.orientationProgress.updateMany({
        where: { id: progress.id, revision: parsed.expectedRevision },
        data: { currentSlideIndex: targetSlideIndex, answers: answers as Prisma.InputJsonValue, completedAt, revision: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException({ code: 'ORIENTATION_REVISION_STALE' });
      return orientationProgressResultSchema.parse({
        progress: {
          orientationVersionId: progress.orientationVersionId,
          currentSlideIndex: targetSlideIndex,
          revision: progress.revision + 1,
          answers,
          completedAt: completedAt?.toISOString() ?? null,
        },
        answerFeedback,
      });
    });
  }

  async getMedia(learnerId: string, assetId: string): Promise<{ body: Buffer; mimeType: string }> {
    const pinned = await this.database.orientationProgress.findMany({
      where: { learnerId }, include: { orientationVersion: true },
    });
    const authorizedOrientationIds = new Set<string>();
    for (const progress of pinned) {
      const content = orientationContentSchema.parse(progress.orientationVersion.content);
      if (content.slides.some((slide) => slide.audioAssetId === assetId || slide.imageAssetId === assetId)) {
        authorizedOrientationIds.add(progress.orientationVersion.orientationId);
      }
    }
    if (authorizedOrientationIds.size === 0) throw new NotFoundException('Orientation media not found.');
    const asset = await this.database.orientationMediaAsset.findFirst({
      where: { id: assetId, orientationId: { in: [...authorizedOrientationIds] } },
    });
    if (!asset) throw new NotFoundException('Orientation media not found.');
    return { body: await this.storage.read(asset.storageKey), mimeType: asset.mimeType };
  }

  private async readEligibility(learnerId: string): Promise<{ reasons: string[]; version: OrientationVersionRecord | null }> {
    const [profile, enrollment, checkpoint, orientation] = await Promise.all([
      this.database.learnerProfile.findUnique({ where: { userId: learnerId } }),
      this.database.learnerProgramEnrollment.findUnique({ where: { learnerId_programId: { learnerId, programId: INTERMEDIATE_PROGRAM_ID } } }),
      this.database.checkpointAssessment.findFirst({
        where: { learnerId, levelCode: { startsWith: FOUNDATION_PREFIX } },
        orderBy: { createdAt: 'desc' },
      }),
      this.database.ieltsOrientation.findUnique({ where: { slug: ORIENTATION_SLUG }, include: { currentPublishedVersion: true } }),
    ]);
    const reasons: string[] = [];
    if (profile?.onboardingStatus !== 'COMPLETE') reasons.push('ONBOARDING_REQUIRED');
    if (!enrollment) reasons.push('INTERMEDIATE_ENROLLMENT_REQUIRED');
    if (!checkpoint || checkpoint.status !== 'passed' || !checkpoint.canAdvance || !this.hasPassedFoundationSkills(checkpoint.skills)) {
      reasons.push('FOUNDATION_CHECKPOINT_REQUIRED');
    }
    if (!orientation?.currentPublishedVersion) reasons.push('ORIENTATION_NOT_PUBLISHED');
    return { reasons, version: orientation?.currentPublishedVersion ?? null };
  }

  private hasPassedFoundationSkills(value: Prisma.JsonValue): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const skills = value as Record<string, unknown>;
    return REQUIRED_SKILLS.every((skill) => {
      const item = skills[skill];
      return !!item && typeof item === 'object' && !Array.isArray(item)
        && (item as Record<string, unknown>).passed === true
        && (item as Record<string, unknown>).pendingCount === 0;
    });
  }

  private async findPinnedProgress(database: PrismaService | Prisma.TransactionClient, learnerId: string): Promise<ProgressRecord | null> {
    return database.orientationProgress.findFirst({
      where: { learnerId }, include: { orientationVersion: true }, orderBy: { createdAt: 'desc' },
    });
  }

  private statusFromProgress(progress: ProgressRecord): OrientationLearnerStatusDto {
    return orientationLearnerStatusSchema.parse({
      state: progress.completedAt ? 'completed' : 'in_progress',
      reasons: [],
      presentation: this.toPresentation(progress.orientationVersion),
      progress: this.toProgress(progress),
    });
  }

  private toPresentation(version: OrientationVersionRecord): OrientationLearnerPresentation {
    const content = orientationContentSchema.parse(version.content);
    return orientationLearnerPresentationSchema.parse({
      id: version.id,
      orientationId: version.orientationId,
      title: version.title,
      version: version.version,
      slides: content.slides.map(({ audioAssetId, imageAssetId, question, ...slide }) => ({
        ...slide,
        audioUrl: audioAssetId ? `/api/v1/me/ielts-orientation/media/${audioAssetId}/content` : null,
        imageUrl: imageAssetId ? `/api/v1/me/ielts-orientation/media/${imageAssetId}/content` : null,
        question: question ? { slug: question.slug, prompt: question.prompt, options: question.options } : null,
      })),
    });
  }

  private toProgress(progress: ProgressRecord) {
    return orientationProgressSchema.parse({
      orientationVersionId: progress.orientationVersionId,
      currentSlideIndex: progress.currentSlideIndex,
      revision: progress.revision,
      answers: this.parseAnswers(progress.answers),
      completedAt: progress.completedAt?.toISOString() ?? null,
    });
  }

  private parseAnswers(value: Prisma.JsonValue): OrientationAnswerRecord[] {
    if (!Array.isArray(value)) return [];
    return value.map((answer) => orientationAnswerRecordSchema.parse(answer));
  }

  private allChecksPassed(content: ReturnType<typeof orientationContentSchema.parse>, answers: OrientationAnswerRecord[]): boolean {
    const correct = new Set(answers.filter((answer) => answer.correct).map((answer) => answer.questionSlug));
    return content.slides.every((slide) => !slide.question || correct.has(slide.question.slug));
  }
}
