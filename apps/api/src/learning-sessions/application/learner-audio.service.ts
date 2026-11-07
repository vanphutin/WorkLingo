import { createHash } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { sessionPlanSchema } from '@worklingo/contracts';
import { resolveListeningAudioBinding } from '../domain/listening-audio-binding.js';

export interface LearnerAudioContent {
  readonly body: Buffer;
  readonly byteSize: number;
  readonly mimeType: string;
}

@Injectable()
export class LearnerAudioService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
  ) {}

  async getActivityAudio(
    learnerId: string,
    sessionId: string,
    activityId: string,
  ): Promise<LearnerAudioContent> {
    const session = await this.database.learningSession.findFirst({
      where: { id: sessionId, learnerId },
      select: { lessonVersionId: true, planSnapshot: true },
    });
    if (!session) throw new NotFoundException('Learning session not found');
    const plan = sessionPlanSchema.parse(session.planSnapshot);
    if (!plan.blocks.some((block) => block.activityIds.includes(activityId))) {
      throw new NotFoundException('Activity not found in this session');
    }
    const stored = await this.database.activity.findFirst({
      where: { id: activityId, lessonVersionId: session.lessonVersionId },
    });
    if (!stored) throw new NotFoundException('Activity not found in this session');
    const activity = activitySchema.parse({
      activityType: stored.activityType,
      contentReferences: stored.contentReferences,
      id: stored.id,
      languageBlockReferences: stored.languageBlockReferences,
      learningBlock: stored.learningBlock,
      order: stored.order,
      payload: stored.payload,
      skills: stored.skills,
      slug: stored.slug,
    });
    const isListening = activity.activityType === 'listening';
    const isShadowing = activity.activityType === 'speaking' && activity.payload.mode === 'shadowing';
    if (!isListening && !isShadowing) {
      throw new NotFoundException('Audio is not available for this activity');
    }
    const reference = await resolveListeningAudioBinding(this.database, session.lessonVersionId, activity, {
      allowSynthetic: process.env.NODE_ENV === 'test' && process.env.WORKLINGO_E2E_MODE === 'true',
    });
    const body = await this.storage.read(reference.storageKey);
    if (createHash('sha256').update(body).digest('hex') !== reference.checksum) {
      throw new NotFoundException('Published audio integrity check failed');
    }
    return {
      body,
      byteSize: body.byteLength,
      mimeType: reference.mimeType,
    };
  }
}
