import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MasteryWorkspace } from './mastery-workspace';
import { emptyErrorBank, masteryMap, memoryHealth, passedSkill, pendingAssessment, progression } from './test-fixtures';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('refreshes the current curriculum after confirmation and hides the old map while loading', async () => {
  let advanced = false;
  let finishNewMap: (response: Response) => void = () => undefined;
  const passedAssessment = { ...pendingAssessment, status: 'passed', canAdvance: true, nextLevelCode: 'FOUNDATION_2',
    skills: { reading: passedSkill, listening: passedSkill, speaking: passedSkill, writing: passedSkill } };
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.endsWith('/confirm')) {
      advanced = true;
      return Promise.resolve(Response.json({ ...progression, currentLevelCode: 'FOUNDATION_2', latestAssessment: null, eligibleSessionId: null, nextLevelCode: null, canAssess: false }));
    }
    if (url.endsWith('/progression')) return Promise.resolve(Response.json({ ...progression, latestAssessment: passedAssessment }));
    if (url.endsWith('/memory-health')) return Promise.resolve(Response.json(memoryHealth));
    if (url.endsWith('/mastery-map')) {
      if (advanced) return new Promise<Response>((resolve) => { finishNewMap = resolve; });
      return Promise.resolve(Response.json(masteryMap));
    }
    return Promise.resolve(Response.json(emptyErrorBank));
  }));
  render(<MasteryWorkspace />);
  expect(await screen.findByRole('article', { name: 'Reading mastery: follow up' })).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm next level' }));
  await screen.findByText('Current level: Foundation 2');
  expect(screen.queryByRole('article', { name: 'Reading mastery: follow up' })).not.toBeInTheDocument();
  expect(screen.getByText('Loading Mastery Map…')).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Review queue' })).not.toBeInTheDocument();
  await act(async () => finishNewMap(Response.json({
    items: [{ ...masteryMap.items[0], canonicalForm: 'meet a deadline' }], reviewQueue: [],
  })));
  expect(await screen.findByRole('article', { name: 'Reading mastery: meet a deadline' })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Review queue' })).getByText(/no reviews are scheduled/i)).toBeInTheDocument();
});
