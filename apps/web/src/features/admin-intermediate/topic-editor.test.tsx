import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentImportDto } from '@worklingo/contracts';
import { apiClient } from '../../lib/api/api-client';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { IntermediateLessonEditor } from './intermediate-lesson-editor';
import { createIntermediateLessonDraft } from './lesson-model';
import { serializeIntermediateTopicLesson } from './topic-lesson-model';
import { createTopicJsonTemplate } from './topic-json';

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
  it('imports JSON into editable fields without saving or approving it', () => {
    render(<IntermediateLessonEditor category="reading" topic />);
    fireEvent.click(screen.getByText('Import a topic from JSON', { selector: 'summary' }));
    const json = { ...createTopicJsonTemplate(), title: 'Restaurant JSON lesson' };
    fireEvent.change(screen.getByLabelText('Topic JSON'), { target: { value: JSON.stringify(json) } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply JSON to form' }));
    expect(screen.getByLabelText('Lesson title')).toHaveValue(json.title);
    expect(screen.getByRole('textbox', { name: 'Source passage' })).toHaveValue(json.readingText);
    expect(apiClient.createContentImport).not.toHaveBeenCalled();
  });
  it('preserves edited fields when JSON is invalid or replacement is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<IntermediateLessonEditor category="reading" topic />);
    fireEvent.change(screen.getByLabelText('Lesson title'), { target: { value: 'Keep my edits' } });
    fireEvent.click(screen.getByText('Import a topic from JSON', { selector: 'summary' }));
    fireEvent.change(screen.getByLabelText('Topic JSON'), { target: { value: '{broken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply JSON to form' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid JSON');
    expect(screen.getByLabelText('Lesson title')).toHaveValue('Keep my edits');
    fireEvent.change(screen.getByLabelText('Topic JSON'), { target: { value: JSON.stringify(createTopicJsonTemplate()) } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply JSON to form' }));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Lesson title')).toHaveValue('Keep my edits');
  });
  it('reads a local JSON file, requires explicit application and saves through the topic source format', async () => {
    render(<IntermediateLessonEditor category="reading" topic />);
    fireEvent.click(screen.getByText('Import a topic from JSON', { selector: 'summary' }));
    const file = new File(['{}'], 'lesson.json', { type: 'application/json' });
    const json = JSON.stringify({ ...createTopicJsonTemplate(), title: 'Local file lesson' });
    Object.defineProperty(file, 'text', { value: async () => json });
    fireEvent.change(screen.getByLabelText('Choose a JSON file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByLabelText('Topic JSON')).toHaveValue(json));
    expect(screen.getByLabelText('Lesson title')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply JSON to form' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/programs/intermediate/topics/${id}`));
    const source = vi.mocked(apiClient.createContentImport).mock.calls[0]![0];
    expect(source).toContain('title: Local file lesson');
    expect(source).toContain('authoring_template: intermediate-topic-v1');
    expect(source).not.toContain('approvedById');
  });
  it('blocks saving during a file read and restores it when reading fails', async () => {
    let rejectRead!: (error: Error) => void;
    const file = new File(['{}'], 'lesson.json');
    Object.defineProperty(file, 'text', { value: () => new Promise<string>((_, reject) => { rejectRead = reject; }) });
    render(<IntermediateLessonEditor category="reading" topic />);
    fireEvent.click(screen.getByText('Import a topic from JSON', { selector: 'summary' }));
    fireEvent.change(screen.getByLabelText('Choose a JSON file'), { target: { files: [file] } });
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
    rejectRead(new Error('Read failed'));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeEnabled();
  });
  it('guards unapplied JSON on browser unload and releases the guard after clearing it', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<IntermediateLessonEditor category="reading" topic />);
    fireEvent.click(screen.getByText('Import a topic from JSON', { selector: 'summary' }));
    fireEvent.change(screen.getByLabelText('Topic JSON'), { target: { value: '{unfinished' } });
    expect(fireEvent(window, new Event('beforeunload', { cancelable: true }))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Clear JSON buffer' }));
    expect(fireEvent(window, new Event('beforeunload', { cancelable: true }))).toBe(true);
  });
  it('releases saving and browser navigation when the JSON buffer is erased manually', () => {
    render(<IntermediateLessonEditor category="reading" topic />);
    fireEvent.click(screen.getByText('Import a topic from JSON', { selector: 'summary' }));
    const input = screen.getByLabelText('Topic JSON');
    fireEvent.change(input, { target: { value: '{unfinished' } });
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '  ' } });
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeEnabled();
    expect(fireEvent(window, new Event('beforeunload', { cancelable: true }))).toBe(true);
  });
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
