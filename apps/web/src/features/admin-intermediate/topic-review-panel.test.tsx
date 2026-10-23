import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultTopicPlan, type TopicReview } from '@worklingo/contracts';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { LocaleProvider } from '../../i18n/provider';
import { TopicReviewPanel } from './topic-review-panel';

const record = { id: '11111111-1111-4111-8111-111111111111', sourceHash: 'saved-hash', draftRevision: 3, status: 'DRAFT' as const };
const empty: TopicReview = { importId: record.id, revision: 0, status: 'none', proposal: null, approval: null };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { vi.spyOn(intermediateTopicClient, 'review').mockResolvedValue(empty); });

describe('Human approval of topic time', () => {
  it('preserves a generated lesson duration instead of resetting it to 60', async () => {
    render(<TopicReviewPanel record={record} dirty={false} initialDurationMinutes={90} />);
    expect(await screen.findByLabelText('Approved session duration')).toHaveValue('90');
  });
  it('loads without asking AI or approving, and dirty source disables both actions', async () => {
    const propose = vi.spyOn(intermediateTopicClient, 'propose'); const approve = vi.spyOn(intermediateTopicClient, 'approve');
    render(<TopicReviewPanel record={record} dirty />);
    expect(await screen.findByRole('button', { name: 'Ask AI for a proposal' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Approve this plan' })).toBeDisabled();
    expect(propose).not.toHaveBeenCalled(); expect(approve).not.toHaveBeenCalled();
  });
  it('AI proposal remains pending until the human explicitly approves its revision and source', async () => {
    const proposed: TopicReview = { ...empty, revision: 1, status: 'proposed', proposal: { plan: defaultTopicPlan(90), rationale: 'Three paragraphs with detailed practice.', provider: 'fake', model: 'simulation', simulation: true } };
    vi.spyOn(intermediateTopicClient, 'propose').mockResolvedValue(proposed);
    const approve = vi.spyOn(intermediateTopicClient, 'approve').mockResolvedValue({ ...proposed, revision: 2, status: 'approved', approval: { plan: defaultTopicPlan(90), approvedById: record.id, approvedAt: '2026-10-19T00:00:00Z' } });
    render(<TopicReviewPanel record={record} dirty={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ask AI for a proposal' }));
    await screen.findByText('Three paragraphs with detailed practice.');
    expect(approve).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Approved session duration')).toHaveValue('90');
    fireEvent.click(screen.getByRole('button', { name: 'Approve this plan' }));
    await waitFor(() => expect(approve).toHaveBeenCalledWith(record.id, { expectedDraftRevision: 3, expectedSourceHash: 'saved-hash', expectedReviewRevision: 1, plan: defaultTopicPlan(90) }));
    expect(await screen.findByText('Approved by an administrator')).toBeVisible();
  });
  it('confirms the saved duration beside the action, disables duplicate approval and exposes publication as a separate next step', async () => {
    vi.spyOn(intermediateTopicClient, 'approve').mockResolvedValue({ ...empty, revision: 1, status: 'approved', approval: { plan: defaultTopicPlan(120), approvedById: record.id, approvedAt: '2026-10-22T05:02:13Z' } });
    render(<TopicReviewPanel record={record} dirty={false} />);
    fireEvent.change(await screen.findByLabelText('Approved session duration'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve this plan' }));
    const button = await screen.findByRole('button', { name: 'Plan approved' });
    expect(button).toBeDisabled();
    const actions = screen.getByRole('group', { name: 'Plan approval' });
    expect(within(actions).getByRole('status')).toHaveTextContent('120-minute');
    expect(within(actions).getByRole('status')).toHaveTextContent('not published');
    expect(within(actions).getByRole('link', { name: 'Continue to validation and publication' })).toHaveAttribute('href', `/admin/content/${record.id}`);
  });
  it('keeps approval visible after reload, then distinguishes edited allocations from the saved approval', async () => {
    vi.mocked(intermediateTopicClient.review).mockResolvedValue({ ...empty, revision: 1, status: 'approved', approval: { plan: defaultTopicPlan(60), approvedById: record.id, approvedAt: '2026-10-22T05:02:13Z' } });
    render(<TopicReviewPanel record={record} dirty={false} />);
    expect(await screen.findByRole('button', { name: 'Plan approved' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Approved session duration'), { target: { value: '90' } });
    expect(screen.getByRole('button', { name: 'Approve this plan' })).toBeEnabled();
    const actions = screen.getByRole('group', { name: 'Plan approval' });
    expect(within(actions).getByRole('status')).toHaveTextContent('Plan changed; approve the changes');
    expect(within(actions).queryByRole('link')).not.toBeInTheDocument();
  });
  it('shows approval failures beside the action while preserving the plan for retry', async () => {
    vi.spyOn(intermediateTopicClient, 'approve').mockRejectedValue(new Error('offline'));
    render(<TopicReviewPanel record={record} dirty={false} />);
    fireEvent.change(await screen.findByLabelText('Approved session duration'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve this plan' }));
    const actions = await screen.findByRole('group', { name: 'Plan approval' });
    expect(await within(actions).findByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('Approved session duration')).toHaveValue('120');
    expect(within(actions).getByRole('button', { name: 'Approve this plan' })).toBeEnabled();
  });
  it('renders the saved approval and the next step in Vietnamese', async () => {
    vi.mocked(intermediateTopicClient.review).mockResolvedValue({ ...empty, revision: 1, status: 'approved', approval: { plan: defaultTopicPlan(60), approvedById: record.id, approvedAt: '2026-10-22T05:02:13Z' } });
    render(<LocaleProvider initialLocale="vi"><TopicReviewPanel record={record} dirty={false} /></LocaleProvider>);
    expect(await screen.findByRole('button', { name: 'Đã phê duyệt' })).toBeDisabled();
    const actions = screen.getByRole('group', { name: 'Phê duyệt khung học' });
    expect(within(actions).getByRole('status')).toHaveTextContent('60 phút');
    expect(within(actions).getByRole('link', { name: 'Tiếp tục kiểm tra và xuất bản' })).toBeVisible();
  });
  it('permits manual planning without AI and rejects totals that do not match', async () => {
    const approve = vi.spyOn(intermediateTopicClient, 'approve');
    render(<TopicReviewPanel record={record} dirty={false} />);
    await screen.findByRole('button', { name: 'Approve this plan' });
    fireEvent.change(screen.getByLabelText('Minutes: Reading'), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'Approve this plan' })).toBeDisabled();
    expect(approve).not.toHaveBeenCalled();
  });
  it('keeps the manual plan after approval failure', async () => {
    vi.spyOn(intermediateTopicClient, 'approve').mockRejectedValue(new Error('offline'));
    render(<TopicReviewPanel record={record} dirty={false} />);
    await screen.findByRole('button', { name: 'Approve this plan' });
    fireEvent.change(screen.getByLabelText('Approved session duration'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve this plan' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Approved session duration')).toHaveValue('120');
  });
});
