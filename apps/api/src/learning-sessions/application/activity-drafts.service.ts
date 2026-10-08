import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { WritingDraft } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';

export interface ActivityDraftOptions {
  readonly retentionDays: number;
}

export const ACTIVITY_DRAFT_OPTIONS = Symbol('ACTIVITY_DRAFT_OPTIONS');

export interface SaveActivityDraftInput {
  readonly activityId: string;
  readonly expectedRevision: number;
  readonly learnerId: string;
  readonly sessionId: string;
  readonly text: string;
}

@Injectable()
export class ActivityDraftsService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ACTIVITY_DRAFT_OPTIONS) private readonly options: ActivityDraftOptions,
  ) {}

  async save(input: SaveActivityDraftInput): Promise<WritingDraft> {
    await this.requireOwnedWritingActivity(input.learnerId, input.sessionId, input.activityId);
    const text = input.text.trim();
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + this.options.retentionDays);

    const draft = await this.database.$transaction(async (transaction) => {
      const existing = await transaction.activityDraft.findUnique({
        where: { learnerId_sessionId_activityId: {
          activityId: input.activityId, learnerId: input.learnerId, sessionId: input.sessionId,
        } },
      });
      if (!existing) {
        if (input.expectedRevision !== 0) throw this.revisionConflict(0);
        return transaction.activityDraft.create({
          data: {
            activityId: input.activityId,
            expiresAt,
            learnerId: input.learnerId,
            revision: 1,
            sessionId: input.sessionId,
            text,
          },
        });
      }
      if (existing.revision !== input.expectedRevision) {
        throw this.revisionConflict(existing.revision);
      }
      const updated = await transaction.activityDraft.updateMany({
        where: { id: existing.id, revision: input.expectedRevision },
        data: { expiresAt, revision: { increment: 1 }, text },
      });
      if (updated.count !== 1) throw this.revisionConflict(existing.revision + 1);
      return transaction.activityDraft.findUniqueOrThrow({ where: { id: existing.id } });
    });
    return this.toDto(draft);
  }

  async get(learnerId: string, sessionId: string, activityId: string): Promise<WritingDraft | null> {
    await this.requireOwnedWritingActivity(learnerId, sessionId, activityId);
    const draft = await this.database.activityDraft.findUnique({
      where: { learnerId_sessionId_activityId: { activityId, learnerId, sessionId } },
    });
    return draft ? this.toDto(draft) : null;
  }

  async delete(learnerId: string, sessionId: string, activityId: string): Promise<void> {
    await this.requireOwnedWritingActivity(learnerId, sessionId, activityId);
    await this.database.activityDraft.deleteMany({ where: { activityId, learnerId, sessionId } });
  }

  private async requireOwnedWritingActivity(
    learnerId: string,
    sessionId: string,
    activityId: string,
  ): Promise<void> {
    const session = await this.database.learningSession.findFirst({
      where: { id: sessionId, learnerId },
      select: { lessonVersionId: true },
    });
    if (!session) throw new NotFoundException('Learning session not found');
    const activity = await this.database.activity.findFirst({
      where: { id: activityId, lessonVersionId: session.lessonVersionId, activityType: 'writing' },
      select: { id: true },
    });
    if (!activity) throw new NotFoundException('Writing activity not found in this session');
  }

  private revisionConflict(currentRevision: number): ConflictException {
    return new ConflictException({
      code: 'DRAFT_REVISION_CONFLICT',
      currentRevision,
      message: 'A newer draft revision already exists.',
      statusCode: 409,
    });
  }

  private toDto(draft: {
    activityId: string; revision: number; sessionId: string; text: string; updatedAt: Date;
  }): WritingDraft {
    return {
      activityId: draft.activityId,
      revision: draft.revision,
      sessionId: draft.sessionId,
      text: draft.text,
      updatedAt: draft.updatedAt.toISOString(),
    };
  }
}
