import { expect, it } from 'vitest';
import { beginnerMission } from '../../learning-programs/application/__fixtures__/beginner-r21.js';
import { resolveAssessmentContext } from './assessment-context.js';
const mission = beginnerMission();
const row = {
  id: '00000000-0000-4000-8000-000000000301',
  learnerId: '00000000-0000-4000-8000-000000000302',
  activityId: mission.lessonVersion.activities[0]!.id,
  rawResponse: { answerIndexes: [0] },
  activity: mission.lessonVersion.activities[0]!,
  session: {
    lessonVersionId: mission.lessonVersion.id,
    lessonVersion: {
      id: mission.lessonVersion.id,
      parsedContent: mission.lessonVersion,
    },
    mission: { level: { code: 'MG_F0' } },
  },
};
it('resolves only exact session snapshot content and changes identity when submission changes', () => {
  const first = resolveAssessmentContext(row, null);
  expect(first.skill).toBe('reading');
  expect(first.lessonVersionId).toBe(mission.lessonVersion.id);
  expect(first.sources.passage).toContain(
    mission.lessonVersion.contentBlocks[0]!.text,
  );
  expect(
    resolveAssessmentContext(
      { ...row, rawResponse: { answerIndexes: [1] } },
      null,
    ).inputHash,
  ).not.toBe(first.inputHash);
});
it('rejects activity substitution even with a valid activity identifier', () => {
  expect(() =>
    resolveAssessmentContext(
      {
        ...row,
        activity: {
          ...row.activity,
          payload: { ...row.activity.payload, prompt: 'mutated' },
        },
      },
      null,
    ),
  ).toThrow('ACTIVITY_SNAPSHOT_MISMATCH');
});
it('rejects missing or mismatched exact lesson versions', () => {
  expect(() =>
    resolveAssessmentContext(
      {
        ...row,
        session: {
          ...row.session,
          lessonVersion: { ...row.session.lessonVersion, id: row.id },
        },
      },
      null,
    ),
  ).toThrow('LESSON_SNAPSHOT_MISMATCH');
});
