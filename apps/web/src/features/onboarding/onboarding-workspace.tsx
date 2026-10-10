'use client';

import type { OnboardingStateDto } from '@worklingo/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../lib/api/api-client';
import { onboardingClient } from '../../lib/api/onboarding-client';

type OnboardingMethodChoice = 'self-placement' | 'assessment';

export function OnboardingWorkspace() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingStateDto | null>(null);
  const [method, setMethod] = useState<OnboardingMethodChoice | null>(null);
  const [selectedLevelCode, setSelectedLevelCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const confirmationId = useRef<string | null>(null);
  const placementAttemptId = useRef<string | null>(null);

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const nextState = await onboardingClient.getState();
      setState(nextState);
      if (nextState.onboardingStatus === 'COMPLETE') {
        router.replace('/dashboard');
      } else if (nextState.activePlacementAttempt) {
        setMethod('assessment');
      }
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const confirmSelfPlacement = async () => {
    if (!selectedLevelCode || isSubmitting) return;
    confirmationId.current ??= crypto.randomUUID();
    setIsSubmitting(true);
    setActionError(null);
    try {
      const nextState = await onboardingClient.confirmSelfPlacement({
        clientConfirmationId: confirmationId.current,
        selectedLevelCode,
      });
      confirmationId.current = null;
      setState(nextState);
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        confirmationId.current = null;
      }
      setActionError('We could not confirm your starting level. Your choice is safe; try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPlacement = async () => {
    if (isSubmitting) return;
    placementAttemptId.current ??= crypto.randomUUID();
    setIsSubmitting(true);
    setActionError(null);
    try {
      const attempt = await onboardingClient.createPlacementAttempt({
        clientAttemptId: placementAttemptId.current,
      });
      placementAttemptId.current = null;
      router.push(`/onboarding/placement/${attempt.learningSessionId}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        placementAttemptId.current = null;
        await loadState();
        return;
      }
      setActionError('We could not open the assessment. Your progress is safe; try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="onboarding-page" aria-busy="true">
        <div className="onboarding-status" role="status">
          <p>Loading your starting options…</p>
        </div>
      </main>
    );
  }

  if (loadError || !state) {
    return (
      <main className="onboarding-page">
        <div className="onboarding-status onboarding-status-error" role="alert">
          <h1>We could not load your options</h1>
          <p>Check your connection and try again. Your account has not changed.</p>
          <button type="button" onClick={() => void loadState()}>Try again</button>
        </div>
      </main>
    );
  }

  const activeAttempt = state.activePlacementAttempt;

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <p className="onboarding-kicker">Your starting point</p>
        <h1>Choose how to begin</h1>
        <p>
          Start from a level you know, or complete a four-skill workplace assessment.
          You can review the result before it changes your level.
        </p>
      </header>

      {actionError ? <div className="onboarding-action-error" role="alert">{actionError}</div> : null}

      {activeAttempt ? (
        <section className="onboarding-resume" aria-labelledby="resume-heading">
          <div>
            <p className="onboarding-section-label">Assessment in progress</p>
            <h2 id="resume-heading">Continue where you stopped</h2>
            <p>Your answers and checkpoint are saved on this device's local WorkLingo server.</p>
          </div>
          <Link
            className="onboarding-primary-link"
            href={`/onboarding/placement/${activeAttempt.learningSessionId}`}
          >
            Resume assessment
          </Link>
        </section>
      ) : (
        <fieldset className="onboarding-methods">
          <legend>Choose one option</legend>
          <label className={method === 'self-placement' ? 'onboarding-method selected' : 'onboarding-method'}>
            <input
              type="radio"
              name="onboarding-method"
              checked={method === 'self-placement'}
              onChange={() => {
                setMethod('self-placement');
                setActionError(null);
              }}
            />
            <span>
              <strong>Choose my starting level</strong>
              <small>Best if you already understand your current workplace English foundation.</small>
            </span>
          </label>
          <label className={method === 'assessment' ? 'onboarding-method selected' : 'onboarding-method'}>
            <input
              type="radio"
              name="onboarding-method"
              checked={method === 'assessment'}
              onChange={() => {
                setMethod('assessment');
                setActionError(null);
              }}
            />
            <span>
              <strong>Take a placement assessment</strong>
              <small>Use reading, listening, speaking, and writing evidence to recommend a level.</small>
            </span>
          </label>
        </fieldset>
      )}

      {!activeAttempt && method === 'self-placement' ? (
        <section className="onboarding-choice-panel" aria-labelledby="level-heading">
          <div>
            <p className="onboarding-section-label">Self-placement</p>
            <h2 id="level-heading">Select an available level</h2>
            <p>Only levels with a complete workplace mission can be selected.</p>
          </div>
          <fieldset className="onboarding-levels">
            <legend className="visually-hidden">Available starting levels</legend>
            {state.eligibleLevels.map((level) => (
              <label
                className={level.available ? 'onboarding-level' : 'onboarding-level unavailable'}
                key={level.code}
              >
                <input
                  type="radio"
                  name="starting-level"
                  value={level.code}
                  checked={selectedLevelCode === level.code}
                  disabled={!level.available}
                  onChange={() => {
                    setSelectedLevelCode(level.code);
                    setActionError(null);
                  }}
                />
                <span className="onboarding-level-copy">
                  <strong>{level.name}</strong>
                  <small>{level.cefrReference}</small>
                  <span>{level.reason}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            disabled={!selectedLevelCode || isSubmitting}
            onClick={() => void confirmSelfPlacement()}
          >
            {actionError
              ? 'Try confirmation again'
              : isSubmitting ? 'Confirming…' : 'Confirm starting level'}
          </button>
        </section>
      ) : null}

      {!activeAttempt && method === 'assessment' ? (
        <section className="onboarding-choice-panel" aria-labelledby="assessment-heading">
          <div>
            <p className="onboarding-section-label">Four-skill assessment</p>
            <h2 id="assessment-heading">Show what you can understand and communicate</h2>
            <p>
              This 45-minute workplace assessment uses local lesson content. Speaking and writing
              may need Teacher AI processing before your recommendation is ready.
            </p>
          </div>
          <aside className="onboarding-privacy-note">
            <strong>Before you start</strong>
            <p>Recording consent and retention choices appear in the speaking activity.</p>
          </aside>
          <button type="button" disabled={isSubmitting} onClick={() => void startPlacement()}>
            {isSubmitting ? 'Opening assessment…' : 'Start assessment'}
          </button>
        </section>
      ) : null}
    </main>
  );
}
