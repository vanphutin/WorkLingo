'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { learningSessionMessages } from '../../i18n/messages/learningSession';

import { formatNumber } from '../../i18n/translator';
import type { EvaluationDto } from '@worklingo/contracts';
import styles from './evaluation-feedback.module.css';

interface EvaluationFeedbackProps {
  readonly loading?: boolean;
  readonly showEmpty?: boolean;
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
  loading = false,
  showEmpty = false,
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
  if (!evaluation && !error && !loading && !showEmpty) return null;
  const pending = evaluation?.status === 'queued' || evaluation?.status === 'processing' || evaluation?.status === 'submitted';
  const statusLabels = { waiting: t('aiWaiting'), queued: t('aiQueued'), processing: t('aiProcessing'), completed: t('aiCompleted'), failed: t('aiFailed') };
  const overall = evaluation?.status === 'evaluated' ? 'completed' : evaluation?.status === 'evaluation_failed' ? 'failed'
    : evaluation?.status === 'processing' || evaluation?.processingSteps?.some(step => step.status === 'processing') ? 'processing' : evaluation?.status === 'queued' ? 'queued' : 'waiting';
  const stepLabels = { submission: t('aiSubmission'), transcription: t('aiTranscription'), evaluation: t('aiEvaluation') };

  return (
    <section className={`teacher-feedback ${styles.panel}`} aria-label={t('teacherFeedback')}>
      <header className={styles.heading}><h2>{t('teacherFeedback')}</h2>
        {evaluation?.score !== null && evaluation?.score !== undefined && evaluation.status === 'evaluated' ? <p className="feedback-score">{formatNumber(locale, Math.round(evaluation.score * 100))}<span>/100</span></p> : null}
      </header>
      {loading || evaluation ? <p className={styles.status} role="status" aria-atomic="true">
        {loading || pending ? <span className="feedback-pulse" aria-hidden="true" /> : null}
        {loading ? t('aiLoading') : statusLabels[overall]}
      </p> : null}
      {!evaluation && !loading && !error ? <p className={styles.empty}>{t('aiEmpty')}</p> : null}
      {evaluation?.processingSteps ? <ol className={styles.steps} aria-label={t('aiProgress')}>
        {evaluation.processingSteps.map(step => <li key={step.key} className={styles.step} data-status={step.status} aria-current={step.status === 'processing' ? 'step' : undefined}>
          <div className={styles.stepLine}><strong>{stepLabels[step.key]}</strong><span>{statusLabels[step.status]}</span></div>
          <small className={styles.model}>{step.key === 'submission' ? 'WorkLingo' : step.model ?? step.providerName ?? (step.status === 'completed' ? t('aiModelUnavailable') : t('aiModelPending'))}</small>
        </li>)}
      </ol> : null}

      {evaluation?.status === 'evaluated' && evaluation.feedback ? (
        <div className="teacher-feedback-result">
          <h3 className={styles.summary}>{evaluation.feedback.summary}</h3>
          <details className={styles.details}>
          <summary>{t('aiDetails')}</summary>
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
          </details>
        </div>
      ) : null}

      {error ? <p className="feedback-error" role="alert">{error}</p> : null}
      {evaluation?.status === 'evaluation_failed' && evaluation.retryable && onRetry ? (
        <button type="button" className="secondary-action-button" onClick={onRetry} disabled={isRetrying} aria-busy={isRetrying}>
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
                <button type="button" className="secondary-action-button recording-delete-button"
                  onClick={() => onDeleteRecording(evaluation.recording!.id)} disabled={isDeletingRecording} aria-busy={isDeletingRecording}>
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
