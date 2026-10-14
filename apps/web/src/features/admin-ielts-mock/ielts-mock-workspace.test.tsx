import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminIeltsMockClient } from '../../lib/api/admin-ielts-mock-client';
import { IeltsMockWorkspace } from './ielts-mock-workspace';

vi.mock('../../lib/api/admin-ielts-mock-client', () => ({ adminIeltsMockClient: { list: vi.fn(), pending: vi.fn(), save: vi.fn(), validate: vi.fn(), publish: vi.fn(), review: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('IeltsMockWorkspace pagination', () => {
  it('loads subsequent mock and review pages when explicit next offsets exist', async () => {
    vi.mocked(adminIeltsMockClient.list)
      .mockResolvedValueOnce({ items: [{ id: 'mock-1', slug: 'mock-one', status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }], nextCursor: 'mock-cursor' })
      .mockResolvedValueOnce({ items: [{ id: 'mock-2', slug: 'mock-two', status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_ACADEMIC_MOCK, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }], nextCursor: null });
    vi.mocked(adminIeltsMockClient.pending)
      .mockResolvedValueOnce({ items: [], nextCursor: 'review-cursor' })
      .mockResolvedValueOnce({ items: [{ id: 'attempt-2', learnerId: 'learner', revision: 1, responses: {}, submittedAt: null, mockTestVersion: { version: 2 } }], nextCursor: null });
    render(<IeltsMockWorkspace />);

    fireEvent.click(await screen.findByRole('button', { name: 'Load more mocks' }));
    await waitFor(() => expect(adminIeltsMockClient.list).toHaveBeenLastCalledWith('mock-cursor'));
    expect(await screen.findByRole('option', { name: 'mock-two' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Load more reviews' }));
    await waitFor(() => expect(adminIeltsMockClient.pending).toHaveBeenLastCalledWith('review-cursor'));
    expect(await screen.findByRole('heading', { name: 'Attempt attempt- · version 2' })).not.toBeNull();
  });
});
