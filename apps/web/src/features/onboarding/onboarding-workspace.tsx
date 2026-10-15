'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { onboardingMessages } from '../../i18n/messages/onboarding';
import { localizedError } from '../../i18n/errors';

import type { OnboardingStateDto } from '@worklingo/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../lib/api/api-client';
import { onboardingClient } from '../../lib/api/onboarding-client';
import { PlacementStatus } from './placement-status';
import { onboardingSystemText } from './system-text';

type OnboardingMethodChoice = 'self-placement' | 'assessment';

export function OnboardingWorkspace() {
  const t = useT('onboarding', onboardingMessages);
  const { locale } = useLocalePreference();
  const router = useRouter();
  const [state, setState] = useState<OnboardingStateDto | null>(null);
  const [method, setMethod] = useState<OnboardingMethodChoice | null>(null);
  const [selectedLevelCode, setSelectedLevelCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadFailure, setLoadFailure] = useState<unknown>(null);
  const [actionError, setActionError] = useState<{ key: 'selfError' | 'startError'; error: unknown } | null>(null);
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
    } catch (error) {
      setLoadError(true);
      setLoadFailure(error);
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
      setActionError({ key: 'selfError', error });
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
      setActionError({ key: 'startError', error });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="onboarding-page" aria-busy="true">
        <div className="onboarding-status" role="status">
          <p>{t('loading')}</p>
        </div>
      </main>
    );
  }

  if (loadError || !state) {
    return (
      <main className="onboarding-page">
        <div className="onboarding-status onboarding-status-error" role="alert">
          <h1>{t('loadError')}</h1>
          <p>{t('loadErrorNote')}</p>
          <p>{localizedError(loadFailure, locale)}</p>
          <button type="button" onClick={() => void loadState()}>{t('retry')}</button>
        </div>
      </main>
    );
  }

  const activeAttempt = state.activePlacementAttempt;

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <p className="onboarding-kicker">{t('kicker')}</p>
        <h1>{t('title')}</h1>
        <p>{t('introduction')}</p>
      </header>

      {actionError ? <div className="onboarding-action-error" role="alert"><p>{t(actionError.key)}</p><p>{localizedError(actionError.error, locale)}</p></div> : null}

      {activeAttempt?.nextAction === 'continue_assessment' ? (
        <section className="onboarding-resume" aria-labelledby="resume-heading">
          <div>
            <p className="onboarding-section-label">{t('inProgress')}</p>
            <h2 id="resume-heading">{t('continue')}</h2>
            <p>{t('saved')}</p>
          </div>
          <Link
            className="onboarding-primary-link"
            href={`/onboarding/placement/${activeAttempt.learningSessionId}`}
          >{t('resume')}</Link>
        </section>
      ) : activeAttempt ? (
        <PlacementStatus initialAttempt={activeAttempt} />
      ) : (
        <fieldset className="onboarding-methods">
          <legend>{t('chooseOption')}</legend>
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
              <strong>{t('selfPlacement')}</strong>
              <small>{t('selfNote')}</small>
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
              <strong>{t('assessment')}</strong>
              <small>{t('assessmentNote')}</small>
            </span>
          </label>
        </fieldset>
      )}

      {!activeAttempt && method === 'self-placement' ? (
        <section className="onboarding-choice-panel" aria-labelledby="level-heading">
          <div>
            <p className="onboarding-section-label">{t('selfLabel')}</p>
            <h2 id="level-heading">{t('selectLevel')}</h2>
            <p>{t('levelNote')}</p>
          </div>
          <fieldset className="onboarding-levels">
            <legend className="visually-hidden">{t('availableLevels')}</legend>
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
                  <strong>{onboardingSystemText(level.name, locale)}</strong>
                  <small>{onboardingSystemText(level.cefrReference, locale)}</small>
                  <span>{onboardingSystemText(level.reason, locale)}</span>
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
              ? t('retryConfirmation')
              : isSubmitting ? t('confirming') : t('confirmStart')}
          </button>
        </section>
      ) : null}

      {!activeAttempt && method === 'assessment' ? (
        <section className="onboarding-choice-panel" aria-labelledby="assessment-heading">
          <div>
            <p className="onboarding-section-label">{t('fourSkills')}</p>
            <h2 id="assessment-heading">{t('showSkills')}</h2>
            <p>{t('assessmentDescription')}</p>
          </div>
          <aside className="onboarding-privacy-note">
            <strong>{t('beforeStart')}</strong>
            <p>{t('privacy')}</p>
          </aside>
          <button type="button" disabled={isSubmitting} onClick={() => void startPlacement()}>
            {isSubmitting ? t('opening') : t('start')}
          </button>
        </section>
      ) : null}
    </main>
  );
}
