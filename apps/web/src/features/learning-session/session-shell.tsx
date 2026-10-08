'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

import type {
  ActivityAttemptDto,
  LearnerActivityDto,
  LearningSessionDto,
} from '../../lib/api/api-client';
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
  readonly isCompleted?: boolean;
}

const blockLabels: Record<string, string> = {
  activate: 'Activate',
  readDecode: 'Read & Decode',
  listenReason: 'Listen & Reason',
  respond: 'Respond',
};

export function SessionShell({
  session,
  currentActivity,
  onSubmitAttempt,
  onPauseSession,
  onResumeSession,
  isCompleted = false,
}: SessionShellProps) {
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(null);
  const [evaluationAttemptId, setEvaluationAttemptId] = useState<string | null>(() => {
    const pendingAttempt = [...(session.attempts ?? [])]
      .reverse()
      .find((attempt) =>
        attempt.evaluationStatus === 'queued' ||
        attempt.evaluationStatus === 'processing' ||
        attempt.evaluationStatus === 'evaluation_failed',
      );
    return pendingAttempt?.id ?? null;
  });
  const [sessionAction, setSessionAction] = useState<'pause' | 'resume' | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
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
      setSubmitError(
        err instanceof Error ? err.message : 'Submission failed. Please check your connection.',
      );
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
      setSessionActionError(`Could not ${action} session. Try again.`);
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

  return (
    <div className="session-layout">
      {/* Top Header */}
      <header className="session-header">
        <div className="session-header-content">
          <div className="header-meta">
            <span className="eyebrow">Workplace Learning Session</span>
            <h1 className="session-mission-title">{session.mission.title}</h1>
          </div>

          {!isCompleted && <div className="session-actions">
            {session.status === 'paused' ? (
              <button
                type="button"
                className="secondary-action-button"
                onClick={() => void handleSessionAction('resume')}
                disabled={sessionAction !== null}
              >
                {sessionAction === 'resume' ? 'Resuming…' : 'Resume session'}
              </button>
            ) : (
              <button
                type="button"
                className="secondary-action-button"
                onClick={() => void handleSessionAction('pause')}
                disabled={sessionAction !== null}
              >
                {sessionAction === 'pause' ? 'Pausing…' : 'Pause session'}
              </button>
            )}
          </div>}
        </div>

        {/* Blocks Progress Bar */}
        <nav className="blocks-progress-nav" aria-label="Session blocks progress">
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
      </header>

      {/* Main Content Area + Support Panel */}
      <div className="session-body-grid">
        <main className="session-main-content">
          {session.status === 'paused' && (
            <div className="session-paused-banner" role="status">
              <p>Session is currently paused. Click &quot;Resume session&quot; to continue.</p>
            </div>
          )}

          {sessionActionError && (
            <div className="submit-error-banner" role="alert">
              <p className="error-text">{sessionActionError}</p>
            </div>
          )}

          {evaluationFeedback && (
            <div className="evaluation-feedback-banner" role="status" aria-live="polite">
              <p>{evaluationFeedback}</p>
            </div>
          )}

          <EvaluationFeedback
            evaluation={asyncEvaluation.evaluation}
            error={asyncEvaluation.error}
            isRetrying={asyncEvaluation.isRetrying}
            onRetry={() => void asyncEvaluation.retry()}
          />

          {isCompleted ? (
            <section className="session-completed-card" aria-label="Session completed">
              <h2>Session Completed!</h2>
              <p>
                Congratulations on finishing all {session.plan.blocks.length} blocks of this{' '}
                {session.durationMinutes}-minute workplace session.
              </p>
              <Link href="/dashboard" className="primary-action-button inline-button">
                Return to Dashboard
              </Link>
            </section>
          ) : (
            <>
              {currentActivity && (
                <ActivityRenderer
                  activity={currentActivity}
                  sessionId={session.id}
                  value={currentResponse}
                  onChange={handleResponseChange}
                  disabled={isSubmitting || session.status === 'paused'}
                />
              )}

              {submitError && (
                <div className="submit-error-banner" role="alert">
                  <p className="error-text">Submission failed: {submitError}</p>
                  <button
                    type="button"
                    className="retry-button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    Retry
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
                  {isSubmitting ? 'Submitting…' : 'Continue'}
                </button>
              </footer>
            </>
          )}
        </main>

        {/* Collapsible Support Panel */}
        {!isCompleted && currentActivity && <aside
          className={`session-support-panel ${isPanelCollapsed ? 'collapsed' : ''}`}
          aria-label="Support and session information"
        >
          <div className="panel-header">
            <h2 className="panel-title">Session Info</h2>
            <button
              type="button"
              className="toggle-panel-button"
              onClick={() => setIsPanelCollapsed((prev) => !prev)}
              aria-expanded={!isPanelCollapsed}
              aria-label={isPanelCollapsed ? 'Expand support panel' : 'Collapse support panel'}
            >
              {isPanelCollapsed ? 'Show info' : 'Hide info'}
            </button>
          </div>

          {!isPanelCollapsed && (
            <div className="panel-content">
              <div className="info-block">
                <h3>Duration</h3>
                <p>{session.durationMinutes} minutes total (15 minutes per block)</p>
              </div>

              <div className="info-block">
                <h3>Current Block</h3>
                <p>
                  {blockLabels[currentBlockType] ?? currentBlockType} (Block{' '}
                  {resolvedActiveBlockIndex + 1} of {session.plan.blocks.length})
                </p>
              </div>

              <div className="info-block">
                <h3>Skills Covered</h3>
                <p>{currentActivity.skills.join(', ')}</p>
              </div>

              {currentActivity.languageBlocks.length > 0 && (
                <div className="info-block">
                  <h3>Vocabulary / Language</h3>
                  <ul className="info-vocab-list">
                    {currentActivity.languageBlocks.map((lb, i) => (
                      <li key={i}>{(lb.canonicalForm as string) || (lb.slug as string)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </aside>}
      </div>
    </div>
  );
}
