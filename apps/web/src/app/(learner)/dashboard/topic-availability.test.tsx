import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';
import { intermediateTopicClient } from '../../../lib/api/intermediate-topic-client';
import { learnerDashboardClient } from '../../../lib/api/learner-dashboard-client';
import { overviewFixture } from '../../../features/learner-dashboard/overview.test-fixture';
const id = '11111111-1111-4111-8111-111111111111';
const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Topic selection independent from generic mission availability', () => {
  it('uses prefetched topics even when generic mission availability fails with 422', async () => {
    vi.spyOn(learnerDashboardClient, 'getOverview').mockResolvedValue({ ...overviewFixture,
      roadmap: { status: 'ready', data: { programId: id, enrollmentId: id, items: [] } },
      availability: { status: 'error', error: { code: 'CURRICULUM_UNAVAILABLE', status: 422 } },
      topics: { status: 'ready', data: [{ id, title: 'Eligible restaurant topic', durationMinutes: 90, lessonVersionId: id }] } });
    const topics = vi.spyOn(intermediateTopicClient, 'list');
    render(<DashboardPage />);
    expect(await screen.findByRole('button', { name: 'Start this lesson' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Eligible restaurant topic · 90 minutes' })).toBeVisible();
    expect(topics).not.toHaveBeenCalled();
  });
});
