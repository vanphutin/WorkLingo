import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultTopicPlan, type TopicReview } from '@worklingo/contracts';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { TopicReviewPanel } from './topic-review-panel';

const record = { id: '11111111-1111-4111-8111-111111111111', sourceHash: 'saved-hash', draftRevision: 3, status: 'DRAFT' as const };
const empty: TopicReview = { importId: record.id, revision: 0, status: 'none', proposal: null, approval: null };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { vi.spyOn(intermediateTopicClient, 'review').mockResolvedValue(empty); });

describe('Human approval of topic time', () => {
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
