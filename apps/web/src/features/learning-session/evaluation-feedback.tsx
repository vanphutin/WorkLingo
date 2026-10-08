'use client';

import type { EvaluationDto } from '@worklingo/contracts';

interface EvaluationFeedbackProps {
  readonly error?: string | null;
  readonly evaluation: EvaluationDto | null;
  readonly isRetrying?: boolean;
  readonly onRetry?: () => void;
  readonly onDeleteRecording?: (recordingId: string) => void;
  readonly isDeletingRecording?: boolean;
  readonly recordingDeleted?: boolean;
  readonly deletionError?: string | null;
}

const dimensionLabels: Record<string, string> = {
  taskCompletion: 'Hoàn thành nhiệm vụ',
  meaningAndLogic: 'Ý nghĩa & logic',
  targetLanguage: 'Ngôn ngữ mục tiêu',
  clarity: 'Độ rõ ràng',
  pronunciationOrFluency: 'Phát âm & độ trôi chảy',
};

export function EvaluationFeedback({
  error = null,
  evaluation,
  isRetrying = false,
  onRetry,
  onDeleteRecording,
  isDeletingRecording = false,
  recordingDeleted = false,
  deletionError = null,
}: EvaluationFeedbackProps) {
  if (!evaluation && !error) return null;
  const pending = evaluation?.status === 'queued' || evaluation?.status === 'processing';

  return (
    <section className="teacher-feedback" aria-live="polite" aria-label="Teacher AI feedback">
      {pending ? (
        <div className="teacher-feedback-processing" role="status">
          <span className="feedback-pulse" aria-hidden="true" />
          <div>
            <h2>Teacher AI đang phân tích</h2>
            <p>Bài đã được lưu. Bạn có thể tải lại trang mà không mất tiến trình.</p>
          </div>
        </div>
      ) : null}

      {evaluation?.status === 'evaluated' && evaluation.feedback ? (
        <div className="teacher-feedback-result">
          <header>
            <p className="eyebrow">Teacher AI · Phản hồi cá nhân</p>
            <h2>{evaluation.feedback.summary}</h2>
            {evaluation.score !== null ? (
              <p className="feedback-score">{Math.round(evaluation.score * 100)}<span>/100</span></p>
            ) : null}
          </header>
          {evaluation.scores ? (
            <dl className="feedback-dimensions">
              {Object.entries(evaluation.scores)
                .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{dimensionLabels[key] ?? key}</dt>
                    <dd>{Math.round(value * 100)}%</dd>
                  </div>
                ))}
            </dl>
          ) : null}
          <div className="feedback-columns">
            <div><h3>Điểm tốt</h3><ul>{evaluation.feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h3>Cần cải thiện</h3><ul>{evaluation.feedback.improvements.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          {evaluation.feedback.correctedExample ? (
            <blockquote>{evaluation.feedback.correctedExample}</blockquote>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="feedback-error" role="alert">{error}</p> : null}
      {evaluation?.status === 'evaluation_failed' && evaluation.retryable && onRetry ? (
        <button type="button" className="secondary-action-button" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? 'Đang thử lại…' : 'Thử đánh giá lại'}
        </button>
      ) : null}
      {evaluation?.recording ? (
        <div className="recording-retention-controls">
          {evaluation.recording.deletedAt || recordingDeleted ? (
            <p role="status">Recording audio has been deleted. Your transcript and feedback remain available.</p>
          ) : (
            <>
              <p>Recording audio is retained temporarily so a failed evaluation can be retried.</p>
              {onDeleteRecording ? (
                <button type="button" className="secondary-action-button"
                  onClick={() => onDeleteRecording(evaluation.recording!.id)} disabled={isDeletingRecording}>
                  {isDeletingRecording ? 'Deleting recording…' : 'Delete recording now'}
                </button>
              ) : null}
            </>
          )}
          {deletionError ? <p className="feedback-error" role="alert">{deletionError}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
