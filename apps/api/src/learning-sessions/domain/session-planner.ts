import { learningSkillSchema, sessionBlockTypeSchema, sessionPlanSchema, type SessionPlan } from '@worklingo/contracts';

import { IncompleteSkillCoverageError, InvalidLessonPlanError, UnsupportedSessionDurationError, type PlanFoundationSessionInput } from './session-plan.types.js';

export function planFoundationSession(input: PlanFoundationSessionInput): SessionPlan {
  if (input.durationMinutes !== 60) throw new UnsupportedSessionDurationError(input.durationMinutes);
  const activityIds = input.mission.lessonVersion.activities.map((activity) => activity.id);
  if (new Set(activityIds).size !== activityIds.length) {
    throw new InvalidLessonPlanError('Lesson contains duplicate activity IDs');
  }
  const coveredSkills = new Set(input.mission.lessonVersion.activities.flatMap((activity) => activity.skills));
  const missingSkills = learningSkillSchema.options.filter((skill) => !coveredSkills.has(skill));
  if (missingSkills.length > 0) throw new IncompleteSkillCoverageError(missingSkills);
  const blockTypes = sessionBlockTypeSchema.options;
  if (input.mission.lessonVersion.activities.some((activity) => !blockTypes.includes(activity.learningBlock))) {
    throw new InvalidLessonPlanError('Lesson contains an unknown learning block');
  }
  const result = sessionPlanSchema.safeParse({
    durationMinutes: input.durationMinutes,
    missionId: input.mission.id,
    lessonVersionId: input.mission.lessonVersion.id,
    blocks: blockTypes.map((type, index) => {
      const activities = input.mission.lessonVersion.activities
        .filter((activity) => activity.learningBlock === type)
        .sort((left, right) => left.order - right.order);
      if (activities.length === 0) throw new InvalidLessonPlanError(`Lesson has an empty ${type} block`);
      return {
        type, order: index + 1, targetMinutes: 15,
        activityIds: activities.map((activity) => activity.id),
        skills: [...new Set(activities.flatMap((activity) => activity.skills))],
      };
    }),
  });
  if (!result.success) throw new InvalidLessonPlanError(`Invalid session plan: ${result.error.message}`);
  return result.data;
}
