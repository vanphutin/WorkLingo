import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentImportDto } from '@worklingo/contracts';
import { apiClient } from '../../lib/api/api-client';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { IntermediateLessonEditor } from './intermediate-lesson-editor';
import { createIntermediateLessonDraft } from './lesson-model';
import { serializeIntermediateTopicLesson } from './topic-lesson-model';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const id = '11111111-1111-4111-8111-111111111111';
const record: ContentImportDto = { id, lessonId: null, lessonVersionId: null, rawSource: serializeIntermediateTopicLesson({ ...createIntermediateLessonDraft('reading'), title: 'A restaurant visit', readingText: 'The waiter confirms the order.' }), sourceHash: 'hash', status: 'DRAFT', draftRevision: 1, parserVersion: '1.0.0', validationHash: null, createdById: id, updatedById: id, createdAt: '', updatedAt: '' };
beforeEach(() => {
  vi.spyOn(apiClient, 'getContentImport').mockResolvedValue(record);
  vi.spyOn(apiClient, 'createContentImport').mockResolvedValue(record);
  vi.spyOn(intermediateTopicClient, 'review').mockResolvedValue({ importId: id, revision: 0, status: 'none', proposal: null, approval: null });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); push.mockReset(); });
describe('A topic contains the source passage and its connected practice', () => {
  it('creates one topic with its own route and the same passage for audio', async () => {
    render(<IntermediateLessonEditor category="reading" topic />);
    expect(screen.getByRole('heading', { name: 'New topic lesson' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Lesson title'), { target: { value: 'At the restaurant' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Source passage' }), { target: { value: 'Please confirm the order.' } });
    expect(screen.queryByLabelText('Dialogue')).not.toBeInTheDocument();
    expect(screen.getByText('Vocabulary, grammar and pronunciation')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/programs/intermediate/topics/${id}`));
    const source = vi.mocked(apiClient.createContentImport).mock.calls[0]![0];
    expect(source).toContain('authoring_template: intermediate-topic-v1');
    expect(source.match(/Please confirm the order\./g)).toHaveLength(3);
  });
  it('loads the topic and requires source changes to be saved before approval', async () => {
    render(<IntermediateLessonEditor category="reading" topic importId={id} />);
    await screen.findByDisplayValue('A restaurant visit');
    expect(await screen.findByRole('button', { name: 'Approve this plan' })).toBeEnabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Source passage' }), { target: { value: 'A revised source passage.' } });
    expect(screen.getByRole('button', { name: 'Approve this plan' })).toBeDisabled();
    expect(screen.getByText('Save lesson changes before requesting or approving a plan.')).toBeVisible();
  });
  it('requires confirmation before saving a source change discards an unsaved allocation', async () => {
    const update = vi.spyOn(apiClient, 'updateContentSource').mockResolvedValue({ ...record, draftRevision: 2 });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<IntermediateLessonEditor category="reading" topic importId={id} />);
    await screen.findByRole('button', { name: 'Approve this plan' });
    fireEvent.change(screen.getByLabelText('Approved session duration'), { target: { value: '90' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Source passage' }), { target: { value: 'Keep the source and my manual plan.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Approved session duration')).toHaveValue('90');
  });
});
