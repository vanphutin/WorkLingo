import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EvaluationFeedback } from './evaluation-feedback';

describe('EvaluationFeedback', () => {
  it('renders structured Teacher AI feedback instead of a single opaque message', () => {
    render(
      <EvaluationFeedback
        evaluation={{
          attemptId: '00000000-0000-4000-8000-000000000001',
          status: 'evaluated',
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

    fireEvent.click(screen.getByRole('button', { name: 'Thử đánh giá lại' }));
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
