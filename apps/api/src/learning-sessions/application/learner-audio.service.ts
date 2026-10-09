import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../common/database/prisma.service.js';
import { activitySchema } from '../../curriculum/domain/curriculum.types.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { sessionPlanSchema } from '@worklingo/contracts';

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
    if (activity.activityType !== 'listening') {
      throw new NotFoundException('Audio is not available for this activity');
    }
    const scriptSlugs = activity.payload.questions
      .map((question) => question.evidence.split(':', 1)[0])
      .filter((slug): slug is string => Boolean(slug));
    const reference = await this.database.lessonVersionAudioArtifact.findFirst({
      where: {
        lessonVersionId: session.lessonVersionId,
        audioScriptSlug: { in: scriptSlugs },
        audioArtifact: { status: 'READY' },
      },
      include: { audioArtifact: true },
    });
    if (!reference) throw new NotFoundException('Published audio is not available');
    const body = await this.storage.read(reference.audioArtifact.storageKey);
    return {
      body,
      byteSize: reference.audioArtifact.byteSize,
      mimeType: reference.audioArtifact.mimeType,
    };
  }
}
