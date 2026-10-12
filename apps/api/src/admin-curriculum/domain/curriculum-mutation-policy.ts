import { computeAvailableDurations } from '../../learning-sessions/domain/session-planner.js';

export type CurriculumResourceType = 'PATH' | 'LEVEL' | 'MISSION';

export interface CurriculumBlocker {
  code: string;
  message: string;
}

export class CurriculumMutationPolicyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CurriculumMutationPolicyError';
  }
}

export interface MutableIdentityInput {
  resourceType: CurriculumResourceType;
  current: {
    status: 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';
    slug?: string;
    code?: string;
    purpose?: 'LEARNING' | 'PLACEMENT';
    parentId?: string;
    hasSessionHistory?: boolean;
    isPublished?: boolean;
  };
  proposed: {
    slug?: string;
    code?: string;
    purpose?: 'LEARNING' | 'PLACEMENT';
    parentId?: string;
  };
}

export function assertMutableIdentity(input: MutableIdentityInput): void {
  const { current, proposed, resourceType } = input;

  if (current.status === 'ARCHIVED') {
    throw new CurriculumMutationPolicyError(
      'ARCHIVED_CURRICULUM_IMMUTABLE',
      `Cannot modify ${resourceType.toLowerCase()} because it is archived`,
    );
  }

  if (proposed.purpose !== undefined && proposed.purpose !== current.purpose) {
    throw new CurriculumMutationPolicyError(
      'PURPOSE_IMMUTABLE',
      'Mission purpose cannot be changed between LEARNING and PLACEMENT',
    );
  }

  const isLocked =
    current.status === 'PUBLISHED' ||
    Boolean(current.isPublished) ||
    Boolean(current.hasSessionHistory);

  if (isLocked) {
    if (proposed.slug !== undefined && proposed.slug !== current.slug) {
      throw new CurriculumMutationPolicyError(
        'SLUG_IMMUTABLE',
        `${resourceType} slug is immutable after publication or session reference`,
      );
    }

    if (proposed.code !== undefined && proposed.code !== current.code) {
      throw new CurriculumMutationPolicyError(
        'CODE_IMMUTABLE',
        'Level code is immutable after publication or session reference',
      );
    }

    if (proposed.parentId !== undefined && proposed.parentId !== current.parentId) {
      throw new CurriculumMutationPolicyError(
        'PARENT_IMMUTABLE',
        'Parent relationship is immutable after publication or session reference',
      );
    }
  }
}

export interface ArchiveBlockerInput {
  resourceType: CurriculumResourceType;
  status: 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';
  publishedChildCount?: number;
  hasActiveSessions?: boolean;
  isPlayableDependency?: boolean;
}

export function findArchiveBlockers(input: ArchiveBlockerInput): CurriculumBlocker[] {
  const blockers: CurriculumBlocker[] = [];

  if (input.status === 'ARCHIVED') {
    blockers.push({
      code: 'ALREADY_ARCHIVED',
      message: 'Resource is already archived',
    });
    return blockers;
  }

  if (input.resourceType === 'PATH') {
    if ((input.publishedChildCount ?? 0) > 0) {
      blockers.push({
        code: 'HAS_PUBLISHED_LEVELS',
        message: 'Cannot archive a path with active published levels',
      });
    }
  }

  if (input.resourceType === 'LEVEL') {
    if ((input.publishedChildCount ?? 0) > 0) {
      blockers.push({
        code: 'HAS_PUBLISHED_MISSIONS',
        message: 'Cannot archive a level with active published missions',
      });
    }
  }

  if (input.isPlayableDependency) {
    blockers.push({
      code: 'PLAYABLE_LEVEL_DEPENDENCY',
      message: 'Cannot archive resource required for active playable curriculum',
    });
  }

  if (input.hasActiveSessions) {
    blockers.push({
      code: 'ACTIVE_SESSIONS_EXIST',
      message: 'Cannot archive resource with active learning sessions',
    });
  }

  return blockers;
}

export interface AssertPlayableMissionLessonsInput {
  missionPurpose: 'LEARNING' | 'PLACEMENT';
  missionStatus: 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';
  lessons: readonly {
    id: string;
    status: 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';
    currentPublishedVersion?: {
      activities: readonly {
        id: string;
        learningBlock: string;
        skills: readonly string[];
      }[];
    } | null;
  }[];
}

export function assertPlayableMissionLessons(input: AssertPlayableMissionLessonsInput): void {
  if (input.missionStatus !== 'PUBLISHED') {
    return;
  }

  if (input.missionPurpose === 'LEARNING') {
    if (input.lessons.length === 0) {
      throw new CurriculumMutationPolicyError(
        'CURRICULUM_NOT_PLAYABLE',
        'A published learning mission must have at least one playable lesson',
      );
    }

    for (const lesson of input.lessons) {
      if (lesson.status !== 'PUBLISHED' || !lesson.currentPublishedVersion) {
        throw new CurriculumMutationPolicyError(
          'INVALID_CURRICULUM_RELATIONSHIP',
          'Only published lessons can be attached to a published mission',
        );
      }
    }

    const hasPlayableLesson = input.lessons.some((lesson) => {
      if (!lesson.currentPublishedVersion) return false;
      const durations = computeAvailableDurations({
        lessonVersion: {
          activities: lesson.currentPublishedVersion
            .activities as unknown as Parameters<
            typeof computeAvailableDurations
          >[0]['lessonVersion']['activities'],
        },
      });
      return durations.includes(60);
    });

    if (!hasPlayableLesson) {
      throw new CurriculumMutationPolicyError(
        'CURRICULUM_NOT_PLAYABLE',
        'Published learning mission lessons must provide canonical 60-minute four-skill coverage',
      );
    }
  }
}
