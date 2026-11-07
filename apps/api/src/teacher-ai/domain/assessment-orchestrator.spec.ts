import { expect, it } from 'vitest';
import { runAssessment } from './assessment-orchestrator.js';
import { resolveAssessmentRubric } from './assessment-rubrics.js';
import { resolveAssessmentContext } from './assessment-context.js';
import { beginnerMission } from '../../learning-programs/application/__fixtures__/beginner-r21.js';
const mission = beginnerMission();
const activity = mission.lessonVersion.activities.find(
  (a) => a.activityType === 'writing',
)!;
const context = resolveAssessmentContext(
  {
    id: crypto.randomUUID(),
    learnerId: crypto.randomUUID(),
    activityId: activity.id,
    rawResponse: { text: 'My name is Lucy.' },
    activity,
    session: {
      lessonVersionId: mission.lessonVersion.id,
      lessonVersion: {
        id: mission.lessonVersion.id,
        parsedContent: mission.lessonVersion,
      },
      mission: { level: { code: 'MG_F0' } },
    },
  },
  null,
);
const response = (level: number) => ({
  verdict: {
    confidence: 'HIGH' as const,
    summary: 'Clear response.',
    corrections: [],
    evidence: [
      {
        id: 's1',
        source: 'submission' as const,
        quote: 'My name is Lucy.',
        start: 0,
        end: 16,
        startMs: null,
        endMs: null,
      },
    ],
    criteria: context.rubric.criteria.map((c) => ({
      id: c.id,
      level,
      status: 'SCORED' as const,
      evidenceIds: ['s1'],
      rationale: 'The response demonstrates this criterion.',
      feedback: 'Clear response.',
    })),
  },
  metadata: {
    name: 'test-provider',
    model: 'synthetic-model',
    modelFamily: 'synthetic',
    requestId: null,
    inputTokens: 1,
    outputTokens: 1,
    costUsd: null,
    latencyMs: 1,
    synthetic: true,
  },
});
it('scores only independently agreeing evidence-validated AI decisions', async () => {
  let calls = 0;
  const evaluator = {
    assess: async () => {
      calls++;
      return response(3);
    },
  };
  const result = await runAssessment(context, evaluator, evaluator);
  expect(calls).toBe(2);
  expect(result.status).toBe('SCORED');
  expect(result.totalScore).toBe(100);
  expect(result.providers.map((p) => p.role)).toEqual(['primary', 'verifier']);
});
it('abstains on model disagreement and preserves each actual role identity', async () => {
  const result = await runAssessment(
    context,
    { assess: async () => response(3) },
    { assess: async () => response(0) },
  );
  expect(result.status).toBe('NEEDS_REVIEW');
  expect(result.totalScore).toBeNull();
});
it('missing verifier cannot silently become scored AI-only output', async () => {
  const result = await runAssessment(
    context,
    { assess: async () => response(3) },
    undefined,
  );
  expect(result.totalScore).toBeNull();
  expect(result.status).toBe('NEEDS_REVIEW');
});
it('does not accept agreement from a verifier without required evidence', async () => {
  const incomplete = response(3);
  incomplete.verdict.criteria = incomplete.verdict.criteria.map((c) => ({
    ...c,
    evidenceIds: [],
  }));
  const result = await runAssessment(
    context,
    { assess: async () => response(3) },
    { assess: async () => incomplete },
  );
  expect(result.status).toBe('NEEDS_REVIEW');
  expect(result.totalScore).toBeNull();
});
it('cancellation prevents even the primary provider request', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    runAssessment(
      context,
      {
        assess: async () => {
          throw new Error('REQUEST_SHOULD_NOT_HAPPEN');
        },
      },
      undefined,
      controller.signal,
    ),
  ).rejects.toThrow('ASSESSMENT_CANCELLED');
});
it('objective comprehension uses authored keys and validates complete response lengths', async () => {
  const reading = mission.lessonVersion.activities[0]!;
  const ctx = resolveAssessmentContext(
    {
      id: crypto.randomUUID(),
      learnerId: crypto.randomUUID(),
      activityId: reading.id,
      rawResponse: { answerIndexes: [] },
      activity: reading,
      session: {
        lessonVersionId: mission.lessonVersion.id,
        lessonVersion: {
          id: mission.lessonVersion.id,
          parsedContent: mission.lessonVersion,
        },
        mission: { level: { code: 'MG_F0' } },
      },
    },
    null,
  );
  await expect(runAssessment(ctx, undefined, undefined)).rejects.toThrow(
    'OBJECTIVE_RESPONSE_INVALID',
  );
});
it('routes authored semantic criteria to AI and keeps exact fill policies deterministic', async () => {
  const q = {
    slug: 'name',
    prompt: 'Complete the name',
    options: [],
    answerIndex: -1,
    responseType: 'fill_blank' as const,
    acceptedAnswers: ['Lucy'],
    answerCaseSensitive: false,
    explanation: 'An authored detail.',
    evidence: 'Lucy',
  };
  const ctx = {
    ...context,
    skill: 'reading' as const,
    rubric: resolveAssessmentRubric('reading'),
    objective: { questions: [q], answerIndexes: [-1], answers: ['lucy'] },
  };
  expect((await runAssessment(ctx, undefined, undefined)).totalScore).toBe(100);
  const semantic = {
    ...ctx,
    objective: {
      ...ctx.objective,
      questions: [{ ...q, semanticCriteria: 'Accept supported paraphrases.' }],
    },
  };
  expect((await runAssessment(semantic, undefined, undefined)).status).toBe(
    'NOT_SCORABLE',
  );
});
