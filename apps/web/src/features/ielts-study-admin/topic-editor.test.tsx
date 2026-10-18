import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ieltsTopicAdminClient } from '../../lib/api/ielts-topic-admin-client';
import { TopicEditor } from './topic-editor';

vi.mock('../../lib/api/ielts-topic-admin-client', () => ({ ieltsTopicAdminClient: { list: vi.fn(), save: vi.fn(), validate: vi.fn(), publish: vi.fn() } }));
const topic = { id: '11111111-1111-4111-8111-111111111111', slug: 'ielts-education', status: 'DRAFT' as const, draftRevision: 2, draft: { schemaVersion: 1 as const, title: 'Education', description: 'Contextual education vocabulary.', packs: [] }, currentPublishedVersionId: null, versions: [], updatedAt: '2026-10-15T00:00:00.000Z' };
describe('TopicEditor', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(ieltsTopicAdminClient.list).mockResolvedValue([topic]); });
  afterEach(cleanup);
  it('shows exact content qualification issues and blocks publication', async () => {
    vi.mocked(ieltsTopicAdminClient.validate).mockResolvedValue({ canPublish: false, supportedDurations: [], qualifiedModes: [], issues: [{ code: 'IELTS_TOPIC_CHUNK_CONTEXT', path: 'education.chunk-one', message: 'Use this chunk in both situations.' }] });
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Validate content' }));
    expect(await screen.findByText('Use this chunk in both situations.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish topic' })).toBeDisabled();
  });
  it('requires revalidation after editing a previously valid draft', async () => {
    vi.mocked(ieltsTopicAdminClient.validate).mockResolvedValue({ canPublish: true, supportedDurations: [90, 120, 150], qualifiedModes: [], issues: [] });
    render(<TopicEditor />);
    fireEvent.click(await screen.findByRole('button', { name: 'Education' }));
    fireEvent.click(screen.getByRole('button', { name: 'Validate content' }));
    expect(await screen.findByText('90 / 120 / 150')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish topic' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Topic manifest (JSON)'), { target: { value: '{}' } });
    expect(screen.getByRole('button', { name: 'Publish topic' })).toBeDisabled();
  });
});
