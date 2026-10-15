'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { learningSessionMessages } from '../../i18n/messages/learningSession';

import { formatNumber } from '../../i18n/translator';
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
  const t = useT('learningSession', learningSessionMessages);
  const { locale } = useLocalePreference();
  const dimensionLabels: Record<string, string> = {
    taskCompletion: t('taskCompletion'),
    meaningAndLogic: t('meaningAndLogic'),
    targetLanguage: t('targetLanguage'),
    clarity: t('clarity'),
    pronunciationOrFluency: t('pronunciationOrFluency'),
  };
  if (!evaluation && !error) return null;
  const pending = evaluation?.status === 'queued' || evaluation?.status === 'processing';

  return (
    <section className="teacher-feedback" aria-live="polite" aria-label={t('teacherFeedback')}>
      {pending ? (
        <div className="teacher-feedback-processing" role="status">
          <span className="feedback-pulse" aria-hidden="true" />
          <div>
            <h2>{t('teacherAnalyzing')}</h2>
            <p>{t('progressSaved')}</p>
          </div>
        </div>
      ) : null}

      {evaluation?.status === 'evaluated' && evaluation.feedback ? (
        <div className="teacher-feedback-result">
          <header>
            <p className="eyebrow">{t('personalFeedback')}</p>
            <h2>{evaluation.feedback.summary}</h2>
            {evaluation.score !== null ? (
              <p className="feedback-score">{formatNumber(locale, Math.round(evaluation.score * 100))}<span>/100</span></p>
            ) : null}
          </header>
          {evaluation.scores ? (
            <dl className="feedback-dimensions">
              {Object.entries(evaluation.scores)
                .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{dimensionLabels[key] ?? key}</dt>
                    <dd>{formatNumber(locale, value, { style: 'percent', maximumFractionDigits: 0 })}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
          <div className="feedback-columns">
            <div><h3>{t('strengths')}</h3><ul>{evaluation.feedback.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h3>{t('improvements')}</h3><ul>{evaluation.feedback.improvements.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          {evaluation.feedback.correctedExample ? (
            <blockquote lang="en">{evaluation.feedback.correctedExample}</blockquote>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="feedback-error" role="alert">{error}</p> : null}
      {evaluation?.status === 'evaluation_failed' && evaluation.retryable && onRetry ? (
        <button type="button" className="secondary-action-button" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? t('retryingEvaluation') : t('retryEvaluation')}
        </button>
      ) : null}
      {evaluation?.recording ? (
        <div className="recording-retention-controls">
          {evaluation.recording.deletedAt || recordingDeleted ? (
            <p role="status">{t('recordingDeleted')}</p>
          ) : (
            <>
              <p>{t('recordingRetention')}</p>
              {onDeleteRecording ? (
                <button type="button" className="secondary-action-button"
                  onClick={() => onDeleteRecording(evaluation.recording!.id)} disabled={isDeletingRecording}>
                  {isDeletingRecording ? t('deletingRecording') : t('deleteRecording')}
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
