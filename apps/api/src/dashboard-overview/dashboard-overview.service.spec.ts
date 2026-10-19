import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DashboardOverviewService } from './dashboard-overview.service.js';
const id = '11111111-1111-4111-8111-111111111111';
function setup(active = true) {
  const context = { getContext: vi.fn(async () => active ? { activeProgram: { id, slug: 'intermediate', name: 'Intermediate' }, enrollment: { id, revision: 1, currentLevel: { id, code: 'B1', name: 'B1' } } } : { activeProgram: null, enrollment: null }) };
  const progress = { getProgress: vi.fn(async () => ({ activityAttempts: 0, completedActivities: 0, currentLevelCode: 'B1', sessions: { completed: 0, inProgress: 0, paused: 0, planned: 0 } })) };
  const availability = { getAvailability: vi.fn(async () => { throw new UnprocessableEntityException({ code: 'CURRICULUM_UNAVAILABLE', message: 'private internal details' }); }) };
  const roadmap = { getRoadmap: vi.fn(async () => ({ programId: id, enrollmentId: id, items: [] })) };
  const analytics = { learner: vi.fn(async () => { throw new Error('database password must not leak'); }) };
  const engagement = { getSummary: vi.fn(async () => { throw new Error('offline'); }) };
  const topics = { list: vi.fn(async () => [{ id, title: 'Restaurant', lessonVersionId: id, durationMinutes: 60 }]) };
  const service = new DashboardOverviewService(context as never, progress as never, availability as never, roadmap as never, analytics as never, engagement as never, topics as never);
  return { service, context, progress, availability, roadmap, analytics, engagement, topics };
}
describe('Dashboard overview aggregation', () => {
  it('uses only the authenticated learner and preserves independent section failures and topics', async () => {
    const s = setup(); const result = await s.service.get(id);
    expect(result.progress.status).toBe('ready'); expect(result.roadmap.status).toBe('ready'); expect(result.topics.status).toBe('ready');
    expect(result.availability).toEqual({ status: 'error', error: { code: 'CURRICULUM_UNAVAILABLE', status: 422 } });
    expect(result.analytics).toEqual({ status: 'error', error: { code: 'DASHBOARD_SECTION_UNAVAILABLE', status: 503 } });
    expect(JSON.stringify(result)).not.toMatch(/password|private internal/u);
    expect(s.context.getContext).toHaveBeenCalledTimes(2);
    for (const method of [s.progress.getProgress, s.availability.getAvailability, s.roadmap.getRoadmap, s.analytics.learner, s.engagement.getSummary, s.topics.list]) {
      expect(method).toHaveBeenCalledWith(id); expect(method).toHaveBeenCalledTimes(1);
    }
  });
  it('skips program-specific queries when no active program exists', async () => {
    const s = setup(false); const result = await s.service.get(id);
    expect(result.programContext.activeProgram).toBeNull();
    expect(s.progress.getProgress).not.toHaveBeenCalled(); expect(s.availability.getAvailability).not.toHaveBeenCalled();
    expect(s.roadmap.getRoadmap).not.toHaveBeenCalled(); expect(s.topics.list).not.toHaveBeenCalled();
    expect(result.topics).toEqual({ status: 'ready', data: [] });
  });
  it('propagates authorization failures instead of masking them as optional data', async () => {
    const s = setup(); s.progress.getProgress.mockRejectedValue(new ForbiddenException());
    await expect(s.service.get(id)).rejects.toMatchObject({ status: 403 });
  });
  it('rejects a context changed while sections were loading', async () => {
    const s = setup(); const context = await s.context.getContext();
    s.context.getContext.mockResolvedValueOnce(context).mockResolvedValueOnce({ activeProgram: null, enrollment: null } as never);
    await expect(s.service.get(id)).rejects.toMatchObject({ status: 409, response: { code: 'PROGRAM_CONTEXT_CHANGED' } });
  });
  it('rejects a revision change within the same active program', async () => {
    const s = setup(); const context = await s.context.getContext();
    s.context.getContext.mockResolvedValueOnce(context).mockResolvedValueOnce({ activeProgram: context.activeProgram!, enrollment: { ...context.enrollment!, revision: 2 } });
    await expect(s.service.get(id)).rejects.toMatchObject({ status: 409, response: { code: 'PROGRAM_CONTEXT_CHANGED' } });
  });
});
