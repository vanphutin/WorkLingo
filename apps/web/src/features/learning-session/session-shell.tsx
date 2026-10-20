'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { learningSessionMessages } from '../../i18n/messages/learningSession';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

import type {
  ActivityAttemptDto,
  LearnerActivityDto,
  LearningSessionDto,
  RecordingSubmissionResult,
  SubmitRecordingInput,
} from '../../lib/api/api-client';
import { apiClient } from '../../lib/api/api-client';
import { ActivityRenderer, isActivityComplete } from './activity-renderer';
import { EvaluationFeedback } from './evaluation-feedback';
import { useEvaluation } from './use-evaluation';

interface SessionShellProps {
  readonly session: LearningSessionDto;
  readonly currentActivity: LearnerActivityDto | null;
  readonly onSubmitAttempt: (
    activityId: string,
    response: Record<string, unknown>,
    clientAttemptId: string,
  ) => Promise<ActivityAttemptDto>;
  readonly onPauseSession: () => Promise<void>;
  readonly onResumeSession: () => Promise<void>;
  readonly onSubmitRecording?: (input: SubmitRecordingInput) => Promise<RecordingSubmissionResult>;
  readonly isCompleted?: boolean;
  readonly contextLabel?: string;
  readonly completionHref?: string;
  readonly completionLabel?: string;
}



export function findRestorableEvaluationAttemptId(
  attempts: readonly ActivityAttemptDto[],
): string | null {
  const attempt = [...attempts].reverse().find((candidate) => {
    if (
      candidate.evaluationStatus === 'queued' ||
      candidate.evaluationStatus === 'processing' ||
      candidate.evaluationStatus === 'evaluation_failed'
    ) {
      return true;
    }

    if (
      candidate.evaluationStatus !== 'evaluated' ||
      typeof candidate.rawResponse !== 'object' ||
      candidate.rawResponse === null
    ) {
      return false;
    }

    const response = candidate.rawResponse as Record<string, unknown>;
    return 'text' in response || response.kind === 'recording';
  });

  return attempt?.id ?? null;
}

export function SessionShell({
  session,
  currentActivity,
  onSubmitAttempt,
  onPauseSession,
  onResumeSession,
  onSubmitRecording,
  isCompleted = false,
  contextLabel = 'Workplace Learning Session',
  completionHref = '/dashboard',
  completionLabel,
}: SessionShellProps) {
  const t = useT('learningSession', learningSessionMessages);
  const { locale } = useLocalePreference();
  const blockLabels: Record<string, string> = {
    activate: t('activate'),
    readDecode: t('readDecode'),
    listenReason: t('listenReason'),
    respond: t('respond'),
  };
  const isPlacement = contextLabel === 'Placement assessment';
  const displayContext = isPlacement ? t('placementAssessment')
    : contextLabel === 'Workplace Learning Session' ? t('workplaceSession') : contextLabel;
  // Attempts arrive oldest-first; restore the latest response for this activity.
  const previousAttempt = [...(session.attempts ?? [])]
    .reverse()
    .find((attempt) => attempt.activityId === currentActivity?.id);

  const getInitialValue = (activity: LearnerActivityDto | null, raw: unknown): unknown => {
    if (!activity) return '';
    if (raw !== null && raw !== undefined) {
      if (
        (activity.activityType === 'reading' || activity.activityType === 'listening') &&
        typeof raw === 'object' &&
        'answerIndexes' in raw
      ) {
        return raw;
      }
      if (
        (activity.activityType === 'speaking' || activity.activityType === 'writing') &&
        typeof raw === 'object' &&
        'text' in raw
      ) {
        return (raw as { text: string }).text;
      }
      if (typeof raw === 'string') {
        return raw;
      }
    }

    if (activity.activityType === 'reading' || activity.activityType === 'listening') {
      return { answerIndexes: [] };
    }
    return '';
  };

  const [currentResponse, setCurrentResponse] = useState<unknown>(() =>
    getInitialValue(currentActivity, previousAttempt?.rawResponse),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ cause: unknown } | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(null);
  const [evaluationAttemptId, setEvaluationAttemptId] = useState<string | null>(() =>
    findRestorableEvaluationAttemptId(session.attempts ?? []),
  );
  const [sessionAction, setSessionAction] = useState<'pause' | 'resume' | null>(null);
  const [sessionActionError, setSessionActionError] = useState<'pause' | 'resume' | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [deletingRecordingId, setDeletingRecordingId] = useState<string | null>(null);
  const [deletedRecordingId, setDeletedRecordingId] = useState<string | null>(null);
  const [recordingDeleteError, setRecordingDeleteError] = useState<{ cause: unknown } | null>(null);
  const pendingAttemptId = useRef<string | null>(null);
  const asyncEvaluation = useEvaluation(evaluationAttemptId);

  // Sync state when activity changes
  useEffect(() => {
    setCurrentResponse(getInitialValue(currentActivity, previousAttempt?.rawResponse));
    setSubmitError(null);
    pendingAttemptId.current = null;
  }, [currentActivity?.id, previousAttempt?.id]);

  const canContinue = currentActivity
    ? isActivityComplete(currentActivity, currentResponse)
    : false;

  const handleSubmit = async () => {
    if (!currentActivity || !canContinue || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      let payload: Record<string, unknown>;
      if (
        currentActivity.activityType === 'reading' ||
        currentActivity.activityType === 'listening'
      ) {
        payload = currentResponse as Record<string, unknown>;
      } else {
        payload = { text: currentResponse as string };
      }

      const clientAttemptId = pendingAttemptId.current ?? crypto.randomUUID();
      pendingAttemptId.current = clientAttemptId;
      const attempt = await onSubmitAttempt(currentActivity.id, payload, clientAttemptId);
      pendingAttemptId.current = null;
      const hasAsyncEvaluation =
        attempt.evaluationStatus === 'queued' ||
        attempt.evaluationStatus === 'processing' ||
        attempt.evaluationStatus === 'evaluation_failed';
      setEvaluationAttemptId(hasAsyncEvaluation ? attempt.id : null);
      setEvaluationFeedback(hasAsyncEvaluation ? null : attempt.feedback);
    } catch (err) {
      setSubmitError({ cause: err });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResponseChange = (nextResponse: unknown) => {
    pendingAttemptId.current = null;
    setSubmitError(null);
    setEvaluationFeedback(null);
    setCurrentResponse(nextResponse);
  };

  const handleSubmitRecording = async (input: SubmitRecordingInput): Promise<RecordingSubmissionResult> => {
    if (!onSubmitRecording) throw new Error(t('recordingNotAvailable'));
    const result = await onSubmitRecording(input);
    setEvaluationFeedback(null);
    setEvaluationAttemptId(result.attemptId);
    return result;
  };

  const handleDeleteRecording = async (recordingId: string): Promise<void> => {
    if (deletingRecordingId) return;
    setDeletingRecordingId(recordingId);
    setRecordingDeleteError(null);
    try {
      await apiClient.deleteRecording(recordingId);
      setDeletedRecordingId(recordingId);
    } catch (caught) {
      setRecordingDeleteError({ cause: caught });
    } finally {
      setDeletingRecordingId(null);
    }
  };

  const handleSessionAction = async (action: 'pause' | 'resume') => {
    if (sessionAction) return;
    try {
      setSessionAction(action);
      setSessionActionError(null);
      if (action === 'pause') {
        await onPauseSession();
      } else {
        await onResumeSession();
      }
    } catch {
      setSessionActionError(action);
    } finally {
      setSessionAction(null);
    }
  };

  let accumulated = 0;
  const blockRanges = session.plan.blocks.map((block) => {
    const start = accumulated;
    const count = block.activityIds.length;
    accumulated += count;
    return { ...block, start, end: accumulated };
  });

  const activeBlockIndex = blockRanges.findIndex(({ start, end }) =>
    session.currentCheckpoint >= start && session.currentCheckpoint < end,
  );

  const resolvedActiveBlockIndex =
    activeBlockIndex >= 0
      ? activeBlockIndex
      : Math.min(session.plan.blocks.length - 1, Math.max(0, session.plan.blocks.length - 1));

  const currentBlockType =
    currentActivity?.learningBlock ??
    session.plan.blocks[resolvedActiveBlockIndex]?.type ??
    'respond';

  const actions = (
    <>
      {submitError && (
        <div className="submit-error-banner" role="alert">
          <p className="error-text">{t('submissionFailed', { error: localizedError(submitError.cause, locale) })}</p>
          <button
            type="button"
            className="retry-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {t('retry')}
          </button>
        </div>
      )}

      <footer className="activity-footer">
        <button
          type="button"
          className="continue-button"
          onClick={handleSubmit}
          disabled={!canContinue || isSubmitting || session.status === 'paused'}
        >
          {isSubmitting ? t('submitting') : t('continue')}
        </button>
      </footer>
    </>
  );
  const support = ((!isCompleted && currentActivity) || evaluationAttemptId) ? (
    <aside className="session-side-column" aria-label={t('supportAndFeedback')}>
      {/* Information and feedback collapse independently. */}
      {!isCompleted && currentActivity && <section
        className={`session-support-panel ${isPanelCollapsed ? 'collapsed' : ''}`}
        aria-label={t('supportInfo')}
      >
        <div className="panel-header">
          <h2 className="panel-title">{t('sessionInfo')}</h2>
          <button
            type="button"
            className="toggle-panel-button"
            onClick={() => setIsPanelCollapsed((prev) => !prev)}
            aria-expanded={!isPanelCollapsed}
            aria-controls="session-support-content"
            aria-label={isPanelCollapsed ? t('expandSupport') : t('collapseSupport')}
          >
            {isPanelCollapsed ? t('showInfo') : t('hideInfo')}
          </button>
        </div>

        {!isPanelCollapsed && (
          <div className="panel-content" id="session-support-content">
            <div className="info-block">
              <h3>{t('duration')}</h3>
              <p>{session.plan.kind === 'topic'
                ? t('topicDuration', { minutes: session.durationMinutes, stageMinutes: session.plan.blocks[resolvedActiveBlockIndex]?.targetMinutes ?? 0 })
                : t('totalDuration', { minutes: session.durationMinutes })}</p>
            </div>

            <div className="info-block">
              <h3>{t('currentBlock')}</h3>
              <p>
                {t('blockPosition', { label: blockLabels[currentBlockType] ?? currentBlockType, current: resolvedActiveBlockIndex + 1, total: session.plan.blocks.length })}
              </p>
            </div>

            <div className="info-block">
              <h3>{t('skillsCovered')}</h3>
              <p>{currentActivity.skills.map((skill) => t(skill)).join(', ')}</p>
            </div>

            {currentActivity.languageBlocks.length > 0 && (
              <div className="info-block">
                <h3>{t('vocabularyLanguage')}</h3>
                <ul className="info-vocab-list">
                  {currentActivity.languageBlocks.map((lb, i) => (
                    <li key={i} lang="en">{(lb.canonicalForm as string) || (lb.slug as string)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>}
      <EvaluationFeedback
        showEmpty={!isCompleted}
        loading={evaluationAttemptId !== null && !asyncEvaluation.evaluation && !asyncEvaluation.error}
        evaluation={asyncEvaluation.evaluation}
        error={asyncEvaluation.error}
        isRetrying={asyncEvaluation.isRetrying}
        onRetry={() => void asyncEvaluation.retry()}
        onDeleteRecording={(recordingId) => void handleDeleteRecording(recordingId)}
        isDeletingRecording={deletingRecordingId !== null}
        recordingDeleted={asyncEvaluation.evaluation?.recording?.id === deletedRecordingId}
        deletionError={recordingDeleteError ? localizedError(recordingDeleteError.cause, locale) : null}
      />
    </aside>
  ) : null;

  return (
    <div className="session-layout">
      {/* Top Header */}
      <header className="session-header">
        <div className="session-header-content">
          <div className="header-meta">
            <span className="eyebrow">{displayContext}</span>
            <h1 className="session-mission-title" lang="en">{session.mission.title}</h1>
          </div>

          {!isCompleted && <div className="session-actions">
            {session.status === 'paused' ? (
              <button
                type="button"
                className="secondary-action-button"
                onClick={() => void handleSessionAction('resume')}
                disabled={sessionAction !== null}
              >
                {sessionAction === 'resume' ? t('resuming') : t('resumeSession')}
              </button>
            ) : (
              <button
                type="button"
                className="secondary-action-button"
                onClick={() => void handleSessionAction('pause')}
                disabled={sessionAction !== null}
              >
                {sessionAction === 'pause' ? t('pausing') : t('pauseSession')}
              </button>
            )}
          </div>}
        </div>

        {/* Blocks Progress Bar */}
        <nav className="blocks-progress-nav" aria-label={t('blocksProgress')}>
          <ol className="blocks-progress-list">
            {blockRanges.map((block, idx) => {
              const isActive = !isCompleted && idx === activeBlockIndex;
              const persistedBlock =
                session.blocks.find((item) => item.order === block.order) ??
                session.blocks[idx];
              const isPassed =
                isCompleted ||
                persistedBlock?.status === 'completed' ||
                session.currentCheckpoint >= block.end;
              return (
                <li
                  key={persistedBlock?.id ?? `${block.type}-${block.order}`}
                  className={`block-progress-step ${isActive ? 'active' : ''} ${
                    isPassed ? 'completed' : ''
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="step-number">{idx + 1}</span>
                  <span className="step-label">{blockLabels[block.type] ?? block.type}</span>
                </li>
              );
            })}
          </ol>
        </nav>
        <p className="session-progress-note">
          {t('savedActivities', { saved: Math.min(session.currentCheckpoint, accumulated), total: accumulated, minutes: session.durationMinutes })}
        </p>
      </header>

      {/* Main Content Area + Support Panel */}
      <div className="session-body-grid">
        <main className="session-main-content">
          {session.status === 'paused' && (
            <div className="session-paused-banner" role="status">
              <p>{t('pausedNotice')}</p>
            </div>
          )}

          {sessionActionError && (
            <div className="submit-error-banner" role="alert">
              <p className="error-text">{t(sessionActionError === 'pause' ? 'pauseError' : 'resumeError')}</p>
            </div>
          )}

          {evaluationFeedback && (
            <div className="evaluation-feedback-banner" role="status" aria-live="polite">
              <p>{evaluationFeedback}</p>
            </div>
          )}

          {isCompleted ? (
            <section className="session-completed-card" aria-label={t('sessionCompletedLabel')}>
              <h2>{isPlacement ? t('placementComplete') : t('sessionComplete')}</h2>
              <p>{isPlacement
                ? t('placementCompleteDescription')
                : t('sessionCompleteDescription', { count: session.plan.blocks.length, minutes: session.durationMinutes })}
              </p>
              <Link href={completionHref} className="primary-action-button inline-button">
                {completionLabel ?? (isPlacement ? t('reviewAssessment') : t('returnDashboard'))}
              </Link>
            </section>
          ) : (
            <>
              {currentActivity && (
                <ActivityRenderer
                  tools={{ actions, support }}
                  activity={currentActivity}
                  sessionId={session.id}
                  onSubmitRecording={handleSubmitRecording}
                  value={currentResponse}
                  onChange={handleResponseChange}
                  disabled={isSubmitting || session.status === 'paused'}
                />
              )}


            </>
          )}
        </main>

        {isCompleted || !currentActivity ? support : null}
      </div>
    </div>
  );
}
