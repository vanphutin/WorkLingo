import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EvaluationFeedback } from './evaluation-feedback';
import type { EvaluationDto } from '@worklingo/contracts';

const failedEvaluation: EvaluationDto = {
  attemptId: '00000000-0000-4000-8000-000000000001', status: 'evaluation_failed',
  transcript: null, score: null, scores: null, feedback: null, retryable: true,
  recording: { id: '00000000-0000-4000-8000-000000000002', retentionUntil: '2026-10-25T08:00:00.000Z', deletedAt: null },
  completedAt: null,
};
afterEach(cleanup);

describe('EvaluationFeedback', () => {
  it('shows the current processing step and only the model recorded for that step', () => {
    render(<EvaluationFeedback evaluation={{ attemptId: '00000000-0000-4000-8000-000000000001', status: 'processing', transcript: 'Hello', scores: null, score: null,
      feedback: null, retryable: false, recording: null, completedAt: null,
      processingSteps: [
        { key: 'submission', status: 'completed', providerName: null, model: null },
        { key: 'transcription', status: 'completed', providerName: 'Microsoft Speech', model: null },
        { key: 'evaluation', status: 'processing', providerName: null, model: null },
      ],
    }} />);
    const current = screen.getByText('Scoring and feedback').closest('li');
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Microsoft Speech')).toBeInTheDocument();
    expect(screen.getByText('Model confirmed after processing')).toBeInTheDocument();
  });
  it('exposes busy actions and blocks retry/deletion activation while pending', () => {
    const onRetry = vi.fn();
    const onDeleteRecording = vi.fn();
    const { rerender } = render(<EvaluationFeedback evaluation={failedEvaluation} onRetry={onRetry}
      onDeleteRecording={onDeleteRecording} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry evaluation' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<EvaluationFeedback evaluation={failedEvaluation} onRetry={onRetry} isRetrying
      onDeleteRecording={onDeleteRecording} isDeletingRecording />);
    const retry = screen.getByRole('button', { name: 'Retrying…' });
    const deletion = screen.getByRole('button', { name: 'Deleting recording…' });
    expect(retry).toHaveAttribute('aria-busy', 'true');
    expect(deletion).toHaveAttribute('aria-busy', 'true');
    expect(retry).toBeDisabled();
    expect(deletion).toBeDisabled();
    fireEvent.click(retry);
    fireEvent.click(deletion);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onDeleteRecording).not.toHaveBeenCalled();
  });

  it('keeps inline feedback from taking focus or remounting a draft during asynchronous completion', () => {
    const view = (evaluation: EvaluationDto | null) => <>
      <label>Draft answer<textarea defaultValue="" /></label>
      <EvaluationFeedback evaluation={evaluation} />
      <button type="button">Continue</button>
    </>;
    const { rerender } = render(view(null));
    const draft = screen.getByRole('textbox', { name: 'Draft answer' });
    fireEvent.change(draft, { target: { value: 'My unfinished answer' } });
    draft.focus();
    rerender(view({ ...failedEvaluation, status: 'processing', recording: null }));
    expect(screen.getByRole('status')).toHaveTextContent('Processing');
    expect(draft).toHaveFocus();
    rerender(view({ ...failedEvaluation, status: 'evaluated', feedback: {
      summary: 'Clear update', strengths: ['Clear'], improvements: [], correctedExample: null,
    } }));
    expect(screen.getByRole('textbox')).toBe(draft);
    expect(draft).toHaveValue('My unfinished answer');
    expect(draft).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(draft, { key: 'Escape' });
    expect(screen.getByRole('heading', { name: 'Clear update' })).toBeVisible();
  });

  it('retains deletion errors and removes the destructive action after deletion', () => {
    const onDeleteRecording = vi.fn();
    const { rerender } = render(<EvaluationFeedback evaluation={failedEvaluation}
      onDeleteRecording={onDeleteRecording} deletionError="Please retry deletion" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Please retry deletion');
    fireEvent.click(screen.getByRole('button', { name: 'Delete recording now' }));
    expect(onDeleteRecording).toHaveBeenCalledExactlyOnceWith('00000000-0000-4000-8000-000000000002');
    rerender(<EvaluationFeedback evaluation={failedEvaluation} onDeleteRecording={onDeleteRecording} recordingDeleted />);
    expect(screen.queryByRole('button', { name: 'Delete recording now' })).not.toBeInTheDocument();
    expect(screen.getByText('Recording audio has been deleted. Your transcript and feedback remain available.').closest('[role="status"]')).toBeVisible();
  });

  it('renders structured Teacher AI feedback instead of a single opaque message', () => {
    render(
      <EvaluationFeedback
        evaluation={{
          attemptId: '00000000-0000-4000-8000-000000000001',
          status: 'evaluated',
          processingSteps: [
            { key: 'submission', status: 'completed', providerName: null, model: null },
            { key: 'evaluation', status: 'completed', providerName: 'discovery', model: 'qwen3.8-27b' },
          ],
          transcript: null,
          score: 0.82,
          scores: {
            taskCompletion: 0.9,
            meaningAndLogic: 0.8,
            targetLanguage: 0.75,
            clarity: 0.85,
            pronunciationOrFluency: null,
          },
          feedback: {
            summary: 'Thông điệp rõ ràng và đúng mục tiêu.',
            strengths: ['Nêu đúng hành động cần làm'],
            improvements: ['Thêm thời hạn cụ thể'],
            correctedExample: 'Could you send the report by 3 p.m.?',
          },
          retryable: false,
          recording: null,
          completedAt: '2026-10-08T08:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Thông điệp rõ ràng và đúng mục tiêu.' })).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('Nêu đúng hành động cần làm')).toBeInTheDocument();
    expect(screen.getByText('Thêm thời hạn cụ thể')).toBeInTheDocument();
    expect(screen.getByText('Could you send the report by 3 p.m.?')).toBeInTheDocument();
    expect(screen.getByText('qwen3.8-27b')).toBeVisible();
    expect(screen.getByText('Thêm thời hạn cụ thể')).not.toBeVisible();
    fireEvent.click(screen.getByText('View detailed feedback'));
    expect(screen.getByText('Thêm thời hạn cụ thể')).toBeVisible();
  });

  it('offers an explicit retry only for retryable failures', () => {
    const onRetry = vi.fn();
    render(
      <EvaluationFeedback
        evaluation={{
          attemptId: '00000000-0000-4000-8000-000000000001',
          status: 'evaluation_failed',
          transcript: null,
          score: null,
          scores: null,
          feedback: null,
          retryable: true,
          recording: null,
          completedAt: null,
        }}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry evaluation' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('lets the learner delete retained audio early', () => {
    const onDeleteRecording = vi.fn();
    render(
      <EvaluationFeedback
        evaluation={{
          attemptId: '00000000-0000-4000-8000-000000000001', status: 'evaluated',
          transcript: 'Status update', scores: null, score: 0.8,
          feedback: { summary: 'Clear update', strengths: [], improvements: [], correctedExample: null },
          retryable: false, completedAt: '2026-10-08T08:00:00.000Z',
          recording: { id: '00000000-0000-4000-8000-000000000002', retentionUntil: '2026-10-15T08:00:00.000Z', deletedAt: null },
        }}
        onDeleteRecording={onDeleteRecording}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete recording/i }));
    expect(onDeleteRecording).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000002');
  });
});
