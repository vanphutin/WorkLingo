'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { onboardingMessages } from '../../i18n/messages/onboarding';
import { localizedError } from '../../i18n/errors';

import type { PlacementAttemptDto, PlacementSkill } from '@worklingo/contracts';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../lib/api/api-client';
import { onboardingClient } from '../../lib/api/onboarding-client';
import { EvaluationFeedback } from '../learning-session/evaluation-feedback';
import { useEvaluation } from '../learning-session/use-evaluation';
import { onboardingSystemText } from './system-text';
import { formatNumber } from '../../i18n/translator';

const skillOrder: readonly PlacementSkill[] = ['listening', 'reading', 'speaking', 'writing'];

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
  const t = useT('onboarding', onboardingMessages);
  const { locale } = useLocalePreference();
  const router = useRouter();
  const [attempt, setAttempt] = useState(initialAttempt);
  const [refreshError, setRefreshError] = useState(false);
  const [confirmationError, setConfirmationError] = useState(false);
  const [refreshFailure, setRefreshFailure] = useState<unknown>(null);
  const [confirmationFailure, setConfirmationFailure] = useState<unknown>(null);
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
    } catch (error) {
      setRefreshError(true);
      setRefreshFailure(error);
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
      } catch (error) {
        if (active) { setRefreshError(true); setRefreshFailure(error); }
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
    setConfirmationFailure(null);
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
      setConfirmationFailure(error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <section className="placement-status" aria-labelledby="placement-evidence-heading">
      <header>
        <p className="onboarding-section-label">{t('placement')}</p>
        <h2 id="placement-evidence-heading">{t('evidence')}</h2>
        <p>{t('evidenceNote')}</p>
      </header>

      <ul className="placement-skill-list">
        {skillOrder.map((skill) => {
          const result = attempt.skillResults[skill];
          const statusText = result.status === 'evaluated' && result.score !== null
            ? t('evaluated', { score: `${formatNumber(locale, Math.round(result.score * 100))}%` })
            : result.status === 'action_required' ? t('actionRequired') : t('waiting');
          return (
            <li key={skill}>
              <span><strong>{t(skill)}</strong><small>{t('samples', { count: result.evidenceCount })}</small></span>
              <span className={`placement-skill-status ${result.status}`}>{statusText}</span>
            </li>
          );
        })}
      </ul>

      {attempt.status === 'PROCESSING' ? (
        <div className="placement-processing" role="status">
          <strong>{t('teacherProcessing')}</strong>
          <p>{t('sessionSaved')}</p>
        </div>
      ) : null}

      {attempt.retryableAttemptIds.map((id) => (
        <PlacementRetry key={id} attemptId={id} onRetried={refresh} />
      ))}

      {attempt.status === 'RECOMMENDED' && attempt.explanation ? (
        <section className="placement-recommendation" aria-labelledby="recommendation-heading">
          <h2 id="recommendation-heading">{onboardingSystemText(attempt.explanation.summary, locale)}</h2>
          <p>{attempt.explanation.reasons[0] ? onboardingSystemText(attempt.explanation.reasons[0], locale) : null}</p>
          <dl>
            <div><dt>{t('recommendedLevel')}</dt><dd>{attempt.recommendedLevelCode ? onboardingSystemText(attempt.recommendedLevelCode, locale) : null}</dd></div>
            <div><dt>{t('policy')}</dt><dd>{attempt.policyVersion}</dd></div>
          </dl>
          {confirmationError ? (
            <div className="onboarding-action-error" role="alert"><p>{t('recommendationError')}</p>{confirmationFailure !== null && <p>{localizedError(confirmationFailure, locale)}</p>}</div>
          ) : null}
          <button type="button" disabled={isConfirming} onClick={() => void confirm()}>
            {confirmationError
              ? t('retryConfirmation')
              : isConfirming ? t('confirming') : t('confirmRecommended')}
          </button>
        </section>
      ) : null}

      {refreshError || pollLimitReached ? (
        <div className="placement-refresh" role="alert">
          <p>{refreshError
            ? t('refreshError')
            : t('slowEvaluation')}</p>
          {refreshError && <p>{localizedError(refreshFailure, locale)}</p>}
          <button type="button" onClick={() => void refresh()}>{t('checkAgain')}</button>
        </div>
      ) : null}
    </section>
  );
}
