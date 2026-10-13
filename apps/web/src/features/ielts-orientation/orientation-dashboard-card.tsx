'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { OrientationLearnerStatusDto } from '@worklingo/contracts';
import { ieltsOrientationClient } from '../../lib/api/ielts-orientation-client';

const reasonCopy: Record<string, string> = {
  ONBOARDING_REQUIRED: 'Complete onboarding to prepare your learning path.',
  INTERMEDIATE_ENROLLMENT_REQUIRED: 'Activate the Intermediate program first.',
  FOUNDATION_CHECKPOINT_REQUIRED: 'Complete your Foundation checkpoint to unlock IELTS Orientation.',
  ORIENTATION_NOT_PUBLISHED: 'IELTS Orientation is being prepared by the content team.',
};

export function OrientationDashboardCard() {
  const [status, setStatus] = useState<OrientationLearnerStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void ieltsOrientationClient.getStatus().then(setStatus).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load IELTS Orientation.')); }, []);

  return <section className="dashboard-card orientation-dashboard-card" aria-labelledby="orientation-card-heading">
    <span className="card-tag">IELTS pathway</span>
    <h2 id="orientation-card-heading" className="section-title">IELTS Orientation</h2>
    {!status && !error ? <p role="status">Checking your readiness…</p> : null}
    {error ? <p className="form-error" role="status">IELTS Orientation status is temporarily unavailable.</p> : null}
    {status?.state === 'locked' ? <>{status.reasons.map((reason) => <p key={reason}>{reasonCopy[reason] ?? 'Complete the required Foundation evidence to continue.'}</p>)}</> : null}
    {status?.state === 'available' ? <><p>Learn the test format, four skills and study expectations before your IELTS pathway begins.</p><Link className="primary-action-button" href="/ielts/orientation">Start IELTS Orientation</Link></> : null}
    {status?.state === 'in_progress' ? <><p>Resume from slide {(status.progress?.currentSlideIndex ?? 0) + 1}.</p><Link className="primary-action-button" href="/ielts/orientation">Resume IELTS Orientation</Link></> : null}
    {status?.state === 'completed' ? <><p>Orientation complete. Your IELTS pathway is ready for the next phase.</p><Link href="/ielts/orientation">Review IELTS Orientation</Link></> : null}
  </section>;
}
