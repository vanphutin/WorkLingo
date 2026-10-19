import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultTopicPlan } from '@worklingo/contracts';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { learningSessionDtoSchema } from '../../lib/api/api-client';
import { IntermediateTopicPicker } from './intermediate-topic-picker';
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const id = '11111111-1111-4111-8111-111111111111';
const session = learningSessionDtoSchema.parse({ id, clientSessionId: id, lessonVersionId: id, purpose: 'learning', durationMinutes: 60, status: 'planned', currentCheckpoint: 1, mission: { id, title: 'Restaurant' }, plan: { kind: 'topic', topicSelection: 'chosen', durationMinutes: 60, missionId: id, lessonVersionId: id, blocks: defaultTopicPlan(60).allocations.map((a, i) => ({ ...a, order: i + 1, activityIds: [`11111111-1111-4111-8111-${String(i + 1).padStart(12, '0')}`], skills: [(['writing', 'reading', 'listening', 'speaking'] as const)[i]!] })) }, blocks: [], attempts: [] });
afterEach(() => { cleanup(); vi.restoreAllMocks(); push.mockReset(); });
describe('Learner topic choice', () => {
  it('keeps other programs and legacy lessons usable without querying topics', () => {
    const list = vi.spyOn(intermediateTopicClient, 'list');
    render(<IntermediateTopicPicker enabled={false}><p>Legacy launcher</p></IntermediateTopicPicker>);
    expect(screen.getByText('Legacy launcher')).toBeVisible(); expect(list).not.toHaveBeenCalled();
  });
  it('starts the chosen topic using its approved time, without a learner duration override', async () => {
    vi.spyOn(intermediateTopicClient, 'list').mockResolvedValue([{ id, title: 'Restaurant', lessonVersionId: id, durationMinutes: 60 }]);
    const create = vi.spyOn(intermediateTopicClient, 'create').mockResolvedValue(session);
    render(<IntermediateTopicPicker enabled><p>Legacy launcher</p></IntermediateTopicPicker>);
    fireEvent.click(await screen.findByRole('button', { name: 'Start this topic' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/sessions/${id}`));
    expect(create).toHaveBeenCalledWith({ topicId: id, clientSessionId: expect.any(String) });
    expect(screen.queryByText('Legacy launcher')).not.toBeInTheDocument();
  });
  it('preserves the random request UUID on retry after a network failure', async () => {
    vi.spyOn(intermediateTopicClient, 'list').mockResolvedValue([{ id, title: 'Restaurant', lessonVersionId: id, durationMinutes: 60 }]);
    const create = vi.spyOn(intermediateTopicClient, 'create').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(session);
    render(<IntermediateTopicPicker enabled><p>Legacy launcher</p></IntermediateTopicPicker>);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose a random topic' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Choose a random topic' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(create.mock.calls[0]![0]).toEqual(create.mock.calls[1]![0]);
    expect(create.mock.calls[0]![0]).not.toHaveProperty('topicId');
  });
  it('explains when no published topic is eligible and retains legacy launch', async () => {
    vi.spyOn(intermediateTopicClient, 'list').mockResolvedValue([]);
    render(<IntermediateTopicPicker enabled><p>Legacy launcher</p></IntermediateTopicPicker>);
    expect(await screen.findByText('No approved, published topic is available for your current level yet.')).toBeVisible();
    expect(screen.getByText('Legacy launcher')).toBeVisible();
  });
});
