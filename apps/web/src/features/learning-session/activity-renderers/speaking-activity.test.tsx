import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as RecorderModule from '../use-audio-recorder';
import type * as ApiClientModule from '../../../lib/api/api-client';
import type { LearnerActivityDto } from '../../../lib/api/api-client';
import { apiClient } from '../../../lib/api/api-client';
import { SpeakingActivity } from './speaking-activity';

vi.mock('../use-audio-recorder', async (importOriginal) => {
  const actual = await importOriginal<typeof RecorderModule>();
  return { ...actual, useAudioRecorder: vi.fn() };
});

vi.mock('../../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return { ...actual, apiClient: { ...actual.apiClient, submitRecording: vi.fn() } };
});

const activity = {
  id: '00000000-0000-4000-8000-000000000010', slug: 'speak', activityType: 'speaking',
  learningBlock: 'respond', skills: ['speaking'], content: [], languageBlocks: [],
  payload: { prompt: 'Give a concise update.' },
} satisfies LearnerActivityDto;

describe('SpeakingActivity', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('requires versioned consent before uploading a preview', async () => {
    const recorder = await import('../use-audio-recorder');
    vi.mocked(recorder.useAudioRecorder).mockReturnValue({
      status: 'preview', blob: new Blob(['audio'], { type: 'audio/webm' }), previewUrl: 'blob:preview',
      error: null, mimeType: 'audio/webm', start: vi.fn(), stop: vi.fn(), discard: vi.fn(), supported: true,
    });
    vi.mocked(apiClient.submitRecording).mockResolvedValue({
      attemptId: '00000000-0000-4000-8000-000000000030',
      recordingId: '00000000-0000-4000-8000-000000000040',
      jobId: '00000000-0000-4000-8000-000000000050', status: 'processing',
    });
    const onSubmitRecording = vi.fn(apiClient.submitRecording);

    render(
      <SpeakingActivity activity={activity} sessionId="00000000-0000-4000-8000-000000000020"
        value="" onChange={vi.fn()} onSubmitRecording={onSubmitRecording} />,
    );
    expect(screen.getByText(/stored locally/i)).toBeInTheDocument();
    expect(screen.getByText(/external speech provider/i)).toBeInTheDocument();
    expect(screen.getByText(/seven days/i)).toBeInTheDocument();
    expect(screen.getByText(/transcript and feedback remain/i)).toBeInTheDocument();
    expect(screen.getByText(/already in flight cannot be recalled/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send for evaluation/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /consent/i }));
    fireEvent.click(screen.getByRole('button', { name: /send for evaluation/i }));

    await waitFor(() => expect(apiClient.submitRecording).toHaveBeenCalledWith(expect.objectContaining({
      activityId: activity.id,
      consentPolicyVersion: 'recording-v1',
      consentScope: 'teacher-ai',
    })));
    expect(onSubmitRecording).toHaveBeenCalledOnce();
  });

  it('reuses the client attempt id when a failed upload is retried', async () => {
    const recorder = await import('../use-audio-recorder');
    vi.mocked(recorder.useAudioRecorder).mockReturnValue({
      status: 'preview', blob: new Blob(['audio'], { type: 'audio/webm' }), previewUrl: 'blob:preview',
      error: null, mimeType: 'audio/webm', start: vi.fn(), stop: vi.fn(), discard: vi.fn(), supported: true,
    });
    const onSubmitRecording = vi.fn()
      .mockRejectedValueOnce(new Error('Network interrupted'))
      .mockResolvedValueOnce({
        attemptId: '00000000-0000-4000-8000-000000000030',
        recordingId: '00000000-0000-4000-8000-000000000040',
        jobId: '00000000-0000-4000-8000-000000000050', status: 'processing' as const,
      });
    render(
      <SpeakingActivity activity={activity} sessionId="00000000-0000-4000-8000-000000000020"
        value="" onChange={vi.fn()} onSubmitRecording={onSubmitRecording} />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /consent/i }));
    fireEvent.click(screen.getByRole('button', { name: /send for evaluation/i }));
    await screen.findByText('Network interrupted');
    fireEvent.click(screen.getByRole('button', { name: /send for evaluation/i }));

    await waitFor(() => expect(onSubmitRecording).toHaveBeenCalledTimes(2));
    expect(onSubmitRecording.mock.calls[1]?.[0].clientAttemptId)
      .toBe(onSubmitRecording.mock.calls[0]?.[0].clientAttemptId);
  });
});
