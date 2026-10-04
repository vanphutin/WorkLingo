import type { PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import type { LearningSkill } from '@worklingo/contracts';

export type { LearningSkill, SessionBlock, SessionBlockType, SessionPlan } from '@worklingo/contracts';

export interface PlanFoundationSessionInput {
  readonly mission: PublishedMission;
  readonly durationMinutes: number;
}

export class UnsupportedSessionDurationError extends Error {
  readonly code = 'UNSUPPORTED_SESSION_DURATION';

  constructor(readonly durationMinutes: number) {
    super('Only 60-minute Foundation sessions are supported in this increment');
    this.name = 'UnsupportedSessionDurationError';
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
