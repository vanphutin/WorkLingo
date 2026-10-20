import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { StudySummary } from './study-summary';
afterEach(cleanup);
it('distinguishes practice, pending evaluations and stable mastery without inventing scores', () => {
  render(<StudySummary progress={{ completedSessionCount: 1, practicedChunkCount: 12, masteredChunkCount: 0, pendingEvaluationCount: 2, dueReviewCount: 0, skills: [{ skill: 'speaking', evaluatedCount: 0, pendingCount: 1, score: null }, { skill: 'writing', evaluatedCount: 0, pendingCount: 1, score: null }] }} />);
  expect(screen.getByText('2 awaiting evaluation')).toBeVisible();
  expect(screen.getByText('12 chunks practiced')).toBeVisible();
  expect(screen.queryByText('Mastered')).not.toBeInTheDocument();
  expect(screen.queryByText('0%')).not.toBeInTheDocument();
});
