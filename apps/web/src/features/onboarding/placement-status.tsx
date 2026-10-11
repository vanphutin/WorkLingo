'use client';

import type { PlacementAttemptDto, PlacementSkill } from '@worklingo/contracts';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../lib/api/api-client';
import { onboardingClient } from '../../lib/api/onboarding-client';
import { EvaluationFeedback } from '../learning-session/evaluation-feedback';
import { useEvaluation } from '../learning-session/use-evaluation';

const skillOrder: readonly PlacementSkill[] = ['listening', 'reading', 'speaking', 'writing'];
const skillLabels: Record<PlacementSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  speaking: 'Speaking',
  writing: 'Writing',
};

interface PlacementStatusProps {
  readonly initialAttempt: PlacementAttemptDto;
  readonly maxPolls?: number;
  readonly pollIntervalMs?: number;
}

function PlacementRetry({
  attemptId,
  onRetried,
}: {
  readonly attemptId: string;
  readonly onRetried: () => Promise<void>;
}) {
  const evaluation = useEvaluation(attemptId);

  return (
    <EvaluationFeedback
      evaluation={evaluation.evaluation}
      error={evaluation.error}
      isRetrying={evaluation.isRetrying}
      onRetry={() => {
        void (async () => {
          await evaluation.retry();
          await onRetried();
        })();
      }}
    />
  );
}

export function PlacementStatus({
  initialAttempt,
  maxPolls = 30,
  pollIntervalMs = 1_000,
}: PlacementStatusProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(initialAttempt);
  const [refreshError, setRefreshError] = useState(false);
  const [confirmationError, setConfirmationError] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pollLimitReached, setPollLimitReached] = useState(false);
  const confirmationId = useRef<string | null>(null);

  useEffect(() => {
    setAttempt(initialAttempt);
  }, [initialAttempt]);

  const refresh = useCallback(async () => {
    setRefreshError(false);
    try {
      const next = await onboardingClient.getPlacementAttempt(attempt.id);
      setAttempt(next);
      setPollLimitReached(false);
    } catch {
      setRefreshError(true);
    }
  }, [attempt.id]);

  useEffect(() => {
    if (attempt.status !== 'PROCESSING') return;
    let active = true;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const next = await onboardingClient.getPlacementAttempt(attempt.id);
        if (!active) return;
        polls += 1;
        setAttempt(next);
        setRefreshError(false);
        if (next.status === 'PROCESSING' && polls < maxPolls) {
          timer = setTimeout(() => void poll(), pollIntervalMs);
        } else if (next.status === 'PROCESSING') {
          setPollLimitReached(true);
        }
      } catch {
        if (active) setRefreshError(true);
      }
    };

    timer = setTimeout(() => void poll(), pollIntervalMs);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [attempt.id, attempt.status, maxPolls, pollIntervalMs]);

  const confirm = async () => {
    if (isConfirming) return;
    confirmationId.current ??= crypto.randomUUID();
    setIsConfirming(true);
    setConfirmationError(false);
    try {
      const state = await onboardingClient.confirmPlacement(attempt.id, {
        clientConfirmationId: confirmationId.current,
      });
      if (state.onboardingStatus === 'COMPLETE' && state.nextAction === 'open_dashboard') {
        confirmationId.current = null;
        router.push('/dashboard');
      } else {
        setConfirmationError(true);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) confirmationId.current = null;
      setConfirmationError(true);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <section className="placement-status" aria-labelledby="placement-evidence-heading">
      <header>
        <p className="onboarding-section-label">Placement assessment</p>
        <h2 id="placement-evidence-heading">Assessment evidence</h2>
        <p>Your result uses separate evidence from listening, reading, speaking, and writing.</p>
      </header>

      <ul className="placement-skill-list">
        {skillOrder.map((skill) => {
          const result = attempt.skillResults[skill];
          const statusText = result.status === 'evaluated' && result.score !== null
            ? `Evaluated: ${Math.round(result.score * 100)}%`
            : result.status === 'action_required' ? 'Action required' : 'Waiting for evidence';
          return (
            <li key={skill}>
              <span><strong>{skillLabels[skill]}</strong><small>{result.evidenceCount} {result.evidenceCount === 1 ? 'sample' : 'samples'}</small></span>
              <span className={`placement-skill-status ${result.status}`}>{statusText}</span>
            </li>
          );
        })}
      </ul>

      {attempt.status === 'PROCESSING' ? (
        <div className="placement-processing" role="status">
          <strong>Teacher AI is finishing your evaluation</strong>
          <p>Your session is saved. You can leave this page and return later.</p>
        </div>
      ) : null}

      {attempt.retryableAttemptIds.map((id) => (
        <PlacementRetry key={id} attemptId={id} onRetried={refresh} />
      ))}

      {attempt.status === 'RECOMMENDED' && attempt.explanation ? (
        <section className="placement-recommendation" aria-labelledby="recommendation-heading">
          <h2 id="recommendation-heading">{attempt.explanation.summary}</h2>
          <p>{attempt.explanation.reasons[0]}</p>
          <dl>
            <div><dt>Recommended level</dt><dd>{attempt.recommendedLevelCode}</dd></div>
            <div><dt>Policy</dt><dd>{attempt.policyVersion}</dd></div>
          </dl>
          {confirmationError ? (
            <p className="onboarding-action-error" role="alert">
              We could not confirm your recommendation. Review the current state and try again.
            </p>
          ) : null}
          <button type="button" disabled={isConfirming} onClick={() => void confirm()}>
            {confirmationError
              ? 'Try confirmation again'
              : isConfirming ? 'Confirming…' : 'Confirm recommended level'}
          </button>
        </section>
      ) : null}

      {refreshError || pollLimitReached ? (
        <div className="placement-refresh" role="alert">
          <p>{refreshError
            ? 'We could not refresh the latest evaluation state.'
            : 'Evaluation is taking longer than expected. Your session remains saved.'}</p>
          <button type="button" onClick={() => void refresh()}>Check again</button>
        </div>
      ) : null}
    </section>
  );
}
