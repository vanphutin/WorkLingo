import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultTopicPlan } from '@worklingo/contracts';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { learningSessionDtoSchema } from '../../lib/api/api-client';
import { IntermediateTopicPicker } from './intermediate-topic-picker';
import { LocaleProvider } from '../../i18n/provider';
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const id = '11111111-1111-4111-8111-111111111111';
const session = learningSessionDtoSchema.parse({ id, clientSessionId: id, lessonVersionId: id, purpose: 'learning', durationMinutes: 60, status: 'planned', currentCheckpoint: 1, mission: { id, title: 'Restaurant' }, plan: { kind: 'topic', topicSelection: 'chosen', durationMinutes: 60, missionId: id, lessonVersionId: id, blocks: defaultTopicPlan(60).allocations.map((a, i) => ({ ...a, order: i + 1, activityIds: [`11111111-1111-4111-8111-${String(i + 1).padStart(12, '0')}`], skills: [(['writing', 'reading', 'listening', 'speaking'] as const)[i]!] })) }, blocks: [], attempts: [] });
afterEach(() => { cleanup(); vi.restoreAllMocks(); push.mockReset(); });
describe('Learner topic choice', () => {
  it('uses English group names for the English interface with Vietnamese fallback', async () => {
    vi.spyOn(intermediateTopicClient, 'list').mockResolvedValue([{ id, title: 'Booking', lessonVersionId: id, durationMinutes: 60,
      group: { id, name: 'Nhà hàng', nameEn: 'Restaurants', description: '' } }]);
    render(<LocaleProvider initialLocale="en"><IntermediateTopicPicker enabled><p>Legacy launcher</p></IntermediateTopicPicker></LocaleProvider>);
    expect(await screen.findByRole('option', { name: 'Restaurants' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Nhà hàng' })).not.toBeInTheDocument();
  });
  it('selects a group then one of its lessons and keeps ungrouped lessons accessible', async () => {
    const second = '22222222-2222-4222-8222-222222222222';
    const third = '33333333-3333-4333-8333-333333333333';
    const group = { id, name: 'Restaurant', description: 'Dining at work' };
    vi.spyOn(intermediateTopicClient, 'list').mockResolvedValue([
      { id, title: 'Booking', lessonVersionId: id, durationMinutes: 60, group },
      { id: second, title: 'Payment', lessonVersionId: second, durationMinutes: 90, group },
      { id: third, title: 'Earlier lesson', lessonVersionId: third, durationMinutes: 45 },
    ]);
    const create = vi.spyOn(intermediateTopicClient, 'create').mockResolvedValue(session);
    render(<IntermediateTopicPicker enabled><p>Legacy launcher</p></IntermediateTopicPicker>);
    const groups = await screen.findByRole('combobox', { name: 'Choose a topic' });
    const lessons = screen.getByRole('combobox', { name: 'Choose a lesson' });
    expect(lessons).toHaveValue(id);
    expect(lessons).toHaveTextContent('Payment');
    expect(lessons).not.toHaveTextContent('Earlier lesson');
    fireEvent.change(groups, { target: { value: 'ungrouped' } });
    expect(lessons).toHaveValue(third);
    expect(lessons).not.toHaveTextContent('Payment');
    fireEvent.click(screen.getByRole('button', { name: 'Start this lesson' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ topicId: third, clientSessionId: expect.any(String) }));
  });
  it('keeps other programs and legacy lessons usable without querying topics', () => {
    const list = vi.spyOn(intermediateTopicClient, 'list');
    render(<IntermediateTopicPicker enabled={false}><p>Legacy launcher</p></IntermediateTopicPicker>);
    expect(screen.getByText('Legacy launcher')).toBeVisible(); expect(list).not.toHaveBeenCalled();
  });
  it('starts the chosen topic using its approved time, without a learner duration override', async () => {
    vi.spyOn(intermediateTopicClient, 'list').mockResolvedValue([{ id, title: 'Restaurant', lessonVersionId: id, durationMinutes: 60 }]);
    const create = vi.spyOn(intermediateTopicClient, 'create').mockResolvedValue(session);
    render(<IntermediateTopicPicker enabled><p>Legacy launcher</p></IntermediateTopicPicker>);
    fireEvent.click(await screen.findByRole('button', { name: 'Start this lesson' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/sessions/${id}`));
    expect(create).toHaveBeenCalledWith({ topicId: id, clientSessionId: expect.any(String) });
    expect(screen.queryByText('Legacy launcher')).not.toBeInTheDocument();
  });
  it('preserves the random request UUID on retry after a network failure', async () => {
    vi.spyOn(intermediateTopicClient, 'list').mockResolvedValue([{ id, title: 'Restaurant', lessonVersionId: id, durationMinutes: 60 }]);
    const create = vi.spyOn(intermediateTopicClient, 'create').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(session);
    render(<IntermediateTopicPicker enabled><p>Legacy launcher</p></IntermediateTopicPicker>);
    fireEvent.click(await screen.findByRole('button', { name: 'Random lesson across all topics' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Random lesson across all topics' }));
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
