import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultTopicPlan, type ContentImportDto } from '@worklingo/contracts';
import { normalizeLessonDocument, parseLessonSource } from '@worklingo/content-format';
import { ApiError, apiClient } from '../../lib/api/api-client';
import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { IntermediateLessonEditor } from './intermediate-lesson-editor';
import { serializeIntermediateTopicLesson } from './topic-lesson-model';
import { createTopicJsonTemplate, topicJsonToDraft } from './topic-json';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const id = '11111111-1111-4111-8111-111111111111';
const artifactId = '22222222-2222-4222-8222-222222222222';
const rawSource = serializeIntermediateTopicLesson(topicJsonToDraft(createTopicJsonTemplate()));
const normalizedDraft = normalizeLessonDocument(parseLessonSource(rawSource).document)!;
const record: ContentImportDto = { id, rawSource, status: 'DRAFT', sourceHash: 'hash', draftRevision: 1, validationHash: null,
  lessonId: null, lessonVersionId: null, parserVersion: '1', createdById: id, updatedById: id, createdAt: '', updatedAt: '' };
const approvedReview = { importId: id, revision: 1, status: 'approved' as const, proposal: null,
  approval: { plan: defaultTopicPlan(60), approvedById: id, approvedAt: '2026-10-22T05:02:13Z' } };
beforeEach(() => {
  vi.spyOn(apiClient, 'getContentImport').mockResolvedValue(record);
  vi.spyOn(intermediateTopicClient, 'review').mockResolvedValue(approvedReview);
  vi.spyOn(apiClient, 'validateContentImport').mockResolvedValue({ importId: id, draftRevision: 1, sourceHash: 'hash', status: 'VALIDATED', canPublish: true, issues: [], issuesTruncated: false });
  vi.spyOn(apiClient, 'getContentPreview').mockResolvedValue({ importId: id, draftRevision: 1, sourceHash: 'hash', status: 'VALIDATED', canPublish: true, normalizedDraft, issues: [] });
  vi.spyOn(apiClient, 'getVocabularyPublicationReview').mockResolvedValue({ importId: id, draftRevision: 1, sourceHash: 'hash', reviewHash: 'vocabulary-1', topic: null, entries: [] });
  vi.spyOn(audioSettingsClient, 'getAdminSettings').mockResolvedValue({ providerId: 'fake-tts', defaultVoiceId: 'fake-neutral', providers: [{ id: 'fake-tts', displayName: 'Simulation', defaultVoiceId: 'fake-neutral', available: true, simulation: true, supportedLocales: ['en-US'] }] });
  vi.spyOn(apiClient, 'listContentAudioArtifacts').mockResolvedValue([{ id: artifactId, contentImportId: id, audioScriptSlug: 'workplace-audio', scriptHash: 'script', adapterName: 'fake-tts', voiceConfig: {}, mimeType: 'audio/wav', byteSize: 1024, checksum: 'sum', storageKey: 'test', status: 'READY', failureSummary: null, simulationLabel: 'Simulation', createdAt: '', updatedAt: '' }]);
  vi.spyOn(apiClient, 'publishContentImport').mockResolvedValue({ importId: id, lessonId: id, lessonVersionId: artifactId, version: 1, status: 'PUBLISHED', publishedAt: '2026-10-22T06:00:00Z' });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function ready() {
  render(<IntermediateLessonEditor category="reading" topic importId={id} />);
  const validate = await screen.findByRole('button', { name: 'Validate Draft' });
  await waitFor(() => expect(validate).toBeEnabled());
  fireEvent.click(validate);
  fireEvent.click(await screen.findByRole('radio', { name: /select candidate from/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Publish Lesson' })).toBeEnabled());
}
describe('Publication stays in the four-step topic editor', () => {
  it('requires approval, then validates and publishes without leaving the editor', async () => {
    vi.mocked(intermediateTopicClient.review).mockResolvedValueOnce({ ...approvedReview, status: 'none', approval: null });
    vi.spyOn(intermediateTopicClient, 'approve').mockResolvedValue(approvedReview);
    render(<IntermediateLessonEditor category="reading" topic importId={id} />);
    const validate = await screen.findByRole('button', { name: 'Validate Draft' });
    await waitFor(() => expect(validate).toBeEnabled());
    fireEvent.click(validate);
    const publish = await screen.findByRole('button', { name: 'Publish Lesson' });
    fireEvent.click(await screen.findByRole('radio', { name: /select candidate from/i }));
    expect(publish).toBeDisabled();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve this plan' }));
    const next = await screen.findByRole('link', { name: 'Continue to validation and publication' });
    expect(next.getAttribute('href')).toMatch(/^#/);
    await waitFor(() => expect(publish).toBeEnabled());
    fireEvent.click(publish);
    expect(await screen.findByRole('region', { name: 'Publish details' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Source passage' })).toBeDisabled();
    expect(apiClient.publishContentImport).toHaveBeenCalledWith(id, expect.objectContaining({ expectedDraftRevision: 1, expectedSourceHash: 'hash', selectedAudioArtifacts: { 'workplace-audio': artifactId }, vocabularyReview: { reviewHash: 'vocabulary-1', choices: [] } }));
  });
  it.each(['source', 'plan', 'json'])('blocks a ready publication when %s is edited', async kind => {
    await ready();
    if (kind === 'source') fireEvent.change(screen.getByRole('textbox', { name: 'Source passage' }), { target: { value: 'Unsaved edit' } });
    if (kind === 'plan') fireEvent.change(screen.getByLabelText('Approved session duration'), { target: { value: '90' } });
    if (kind === 'json') { fireEvent.click(screen.getByText('Import a topic from JSON', { selector: 'summary' })); fireEvent.change(screen.getByLabelText('Topic JSON'), { target: { value: '{unfinished' } }); }
    expect(screen.getByRole('button', { name: 'Publish Lesson' })).toBeDisabled();
    expect(apiClient.publishContentImport).not.toHaveBeenCalled();
  });
  it('locks editing while publication is pending and preserves the editor on failure for retry', async () => {
    let fail!: (error: unknown) => void;
    vi.mocked(apiClient.publishContentImport).mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
    await ready(); fireEvent.click(screen.getByRole('button', { name: 'Publish Lesson' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Source passage' })).toBeDisabled());
    await act(async () => fail(new ApiError({ code: 'NETWORK_ERROR', status: 0, message: 'offline' })));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Source passage' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Publish Lesson' })).toBeEnabled();
  });
  it('rejects a preview from another revision and shows a recoverable error', async () => {
    vi.mocked(apiClient.getContentPreview).mockResolvedValueOnce({ importId: id, draftRevision: 2, sourceHash: 'changed', status: 'VALIDATED', canPublish: true, normalizedDraft, issues: [] });
    render(<IntermediateLessonEditor category="reading" topic importId={id} />);
    const validate = await screen.findByRole('button', { name: 'Validate Draft' });
  await waitFor(() => expect(validate).toBeEnabled());
  fireEvent.click(validate);
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish Lesson' })).toBeDisabled();
  });
  it('restores published details and read-only editing on reload without republishing', async () => {
    vi.mocked(apiClient.getContentImport).mockResolvedValue({ ...record, status: 'PUBLISHED', lessonId: id, lessonVersionId: artifactId });
    render(<IntermediateLessonEditor category="reading" topic importId={id} />);
    expect(await screen.findByRole('region', { name: 'Publish details' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Source passage' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Publish Lesson' })).not.toBeInTheDocument();
    expect(apiClient.publishContentImport).not.toHaveBeenCalled();
  });
  it('resets validation and selected audio after saving a new source revision', async () => {
    vi.spyOn(apiClient, 'updateContentSource').mockResolvedValue({ ...record, draftRevision: 2, sourceHash: 'new-hash' });
    vi.mocked(intermediateTopicClient.review).mockResolvedValueOnce(approvedReview).mockResolvedValue({ ...approvedReview, status: 'stale', approval: null });
    await ready();
    fireEvent.change(screen.getByRole('textbox', { name: 'Source passage' }), { target: { value: 'Revised saved source.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Content changed; a new approval is required');
    expect(screen.getByRole('button', { name: 'Publish Lesson' })).toBeDisabled();
    expect(screen.queryByRole('radio', { name: /select candidate from/i })).not.toBeInTheDocument();
  });
  it('shows validation errors in place and never enables publication for an invalid draft', async () => {
    vi.mocked(apiClient.validateContentImport).mockRejectedValueOnce(new ApiError({ code: 'CONTENT_VALIDATION_FAILED', status: 422, message: 'invalid',
      details: [{ code: 'VAL_REQUIRED_FIELD', message: 'A required field is missing.', severity: 'error', range: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 2, offset: 1 } } }] }));
    render(<IntermediateLessonEditor category="reading" topic importId={id} />);
    const validate = await screen.findByRole('button', { name: 'Validate Draft' });
    await waitFor(() => expect(validate).toBeEnabled()); fireEvent.click(validate);
    expect(await screen.findByRole('button', { name: /required field is missing/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish Lesson' })).toBeDisabled();
  });
  it('keeps publication blocked after a failed preview and permits validation retry', async () => {
    vi.mocked(apiClient.getContentPreview).mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR', status: 0, message: 'offline' }));
    render(<IntermediateLessonEditor category="reading" topic importId={id} />);
    const validate = await screen.findByRole('button', { name: 'Validate Draft' });
    await waitFor(() => expect(validate).toBeEnabled()); fireEvent.click(validate);
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection failed');
    expect(screen.getByRole('button', { name: 'Publish Lesson' })).toBeDisabled();
    expect(validate).toBeEnabled();
  });
});
