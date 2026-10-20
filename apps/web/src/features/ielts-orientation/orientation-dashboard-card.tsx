'use client';

import Link from 'next/link';
import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import { ieltsOrientationMessages } from '../../i18n/messages/ieltsOrientation';
import { useEffect, useState } from 'react';
import type { OrientationLearnerStatusDto } from '@worklingo/contracts';
import { ieltsOrientationClient } from '../../lib/api/ielts-orientation-client';
import './orientation-dashboard-card.css';

const reasonKeys: Readonly<Record<string, keyof typeof ieltsOrientationMessages.en>> = {
  ONBOARDING_REQUIRED: 'onboardingRequired',
  INTERMEDIATE_ENROLLMENT_REQUIRED: 'intermediateRequired',
  FOUNDATION_CHECKPOINT_REQUIRED: 'checkpointRequired',
  ORIENTATION_NOT_PUBLISHED: 'notPublished',
} as const;

export function OrientationDashboardCard() {
  const t = useT('ieltsOrientation', ieltsOrientationMessages);
  const { locale } = useLocalePreference();
  const [status, setStatus] = useState<OrientationLearnerStatusDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { void ieltsOrientationClient.getStatus().then(setStatus).catch((cause) => setError(cause)); }, []);
  const prerequisite = status?.state === 'locked'
    ? status.reasons.includes('ONBOARDING_REQUIRED') ? 'onboarding'
      : status.reasons.includes('INTERMEDIATE_ENROLLMENT_REQUIRED') ? 'program'
        : status.reasons.includes('FOUNDATION_CHECKPOINT_REQUIRED') ? 'foundation' : null
    : null;

  return <section className="dashboard-card orientation-dashboard-card" aria-labelledby="orientation-card-heading">
    <span className="card-tag">{t('pathway')}</span>
    <h2 id="orientation-card-heading" className="section-title">{t('title')}</h2>
    {!status && !error ? <p role="status">{t('checking')}</p> : null}
    {error ? <p className="form-error" role="status">{localizedError(error, locale)}</p> : null}
    {status?.state === 'locked' ? <>{status.reasons.map((reason) => <p key={reason}>{t(reasonKeys[reason] ?? 'evidenceRequired')}</p>)}</> : null}
    {prerequisite === 'onboarding' ? <Link className="primary-action-button" href="/onboarding">{t('completeSetup')}</Link> : null}
    {prerequisite === 'program' ? <Link className="primary-action-button" href="/programs">{t('chooseIntermediate')}</Link> : null}
    {prerequisite === 'foundation' ? <div className="orientation-foundation-guidance">
      <p>{t('foundationSteps')}</p>
      <div className="orientation-prerequisite-actions">
        <Link className="primary-action-button" href="/dashboard">{t('studyFoundation')}</Link>
        <Link className="secondary-action-button" href="/mastery#checkpoint-heading">{t('checkFoundation')}</Link>
      </div>
    </div> : null}
    {status?.state === 'available' ? <><p>{t('introDescription')}</p><Link className="primary-action-button" href="/ielts/orientation">{t('start')}</Link></> : null}
    {status?.state === 'in_progress' ? <><p>{t('resumeSlide', { slide: formatNumber(locale, (status.progress?.currentSlideIndex ?? 0) + 1) })}</p><Link className="primary-action-button" href="/ielts/orientation">{t('resume')}</Link></> : null}
    {status?.state === 'completed' ? <><p>{t('completedDescription')}</p><Link href="/ielts/orientation">{t('review')}</Link></> : null}
  </section>;
}
