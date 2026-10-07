import type { PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import type { LearningSkill } from '@worklingo/contracts';

export type { LearningSkill, SessionBlock, SessionBlockType, SessionPlan, SessionDuration } from '@worklingo/contracts';

export interface ScheduledReviewItemReference {
  readonly id: string;
  readonly languageBlockId: string;
  readonly skill: LearningSkill;
  readonly priorityScore?: number;
  readonly previousContextSignatures?: readonly string[];
  readonly priorityReason?: 'NEEDS_ATTENTION' | 'OVERDUE' | 'DUE' | 'UPCOMING';
}

export interface PlanFoundationSessionInput {
  readonly mission: PublishedMission;
  readonly durationMinutes: number;
  /** Items are ordered by ReviewScheduler, with NEEDS_ATTENTION before OVERDUE. */
  readonly reviewItems?: readonly ScheduledReviewItemReference[];
}

export class UnsupportedSessionDurationError extends Error {
  readonly code = 'UNSUPPORTED_SESSION_DURATION';

  constructor(readonly durationMinutes: number) {
    super(`Unsupported session duration: ${durationMinutes}. Supported durations are 45, 60, 90, 120, 150 minutes.`);
    this.name = 'UnsupportedSessionDurationError';
  }
}

export class InsufficientContentForDurationError extends Error {
  readonly code = 'INSUFFICIENT_CONTENT_FOR_DURATION';

  constructor(
    readonly durationMinutes: number,
    readonly availableDurations: readonly number[],
  ) {
    super(
      `Published lesson does not have enough unique activities for ${durationMinutes} minutes. Available durations: ${availableDurations.join(', ')}`,
    );
    this.name = 'InsufficientContentForDurationError';
  }
}

export class IncompleteSkillCoverageError extends Error {
  readonly code = 'INCOMPLETE_SKILL_COVERAGE';
  readonly missingSkills: readonly LearningSkill[];

  constructor(missingSkills: readonly LearningSkill[]) {
    super(`Lesson is missing required skills: ${missingSkills.join(', ')}`);
    this.name = 'IncompleteSkillCoverageError';
    this.missingSkills = Object.freeze([...missingSkills]);
  }
}

export class InvalidLessonPlanError extends Error {
  readonly code = 'INVALID_LESSON_PLAN';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidLessonPlanError';
  }
}
