import { expect, it } from 'vitest';
import { projectAssessmentMastery } from './assessment-mastery.js';
it('counts one submission once and keeps synthetic assessment out of certified mastery', () => {
  const result = projectAssessmentMastery([
    {
      id: 'a',
      submissionId: 'same',
      skill: 'writing',
      status: 'SCORED',
      totalScore: 90,
      createdAt: '2026-11-07T00:00:00.000Z',
      confidence: 'HIGH',
      providers: [{ synthetic: true }],
      criteria: [],
    },
    {
      id: 'b',
      submissionId: 'same',
      skill: 'writing',
      status: 'SCORED',
      totalScore: 60,
      createdAt: '2026-11-07T01:00:00.000Z',
      confidence: 'HIGH',
      providers: [{ synthetic: true }],
      criteria: [],
    },
  ]);
  expect(result.skills.find((x) => x.skill === 'writing')?.observations).toBe(
    0,
  );
  expect(result.skills.find((x) => x.skill === 'writing')?.score).toBeNull();
});
it('separates four skills, recency, observations and uncertainty without CEFR claims', () => {
  const result = projectAssessmentMastery([
    {
      id: 'a',
      submissionId: '1',
      skill: 'reading',
      status: 'SCORED',
      totalScore: 100,
      createdAt: '2026-11-07T00:00:00.000Z',
      confidence: 'HIGH',
      providers: [{ synthetic: false }],
      criteria: [],
    },
  ]);
  expect(result.skills).toHaveLength(4);
  expect(result.skills.find((x) => x.skill === 'reading')?.observations).toBe(
    1,
  );
  expect(result.skills.find((x) => x.skill === 'reading')?.confidence).toBe(
    'LOW',
  );
  expect(result.skills.find((x) => x.skill === 'speaking')?.score).toBeNull();
});
