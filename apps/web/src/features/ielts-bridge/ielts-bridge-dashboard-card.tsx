'use client';

import type { IeltsBridgeCatalogDto } from '@worklingo/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';

export function IeltsBridgeDashboardCard() {
  const [catalog, setCatalog] = useState<IeltsBridgeCatalogDto | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void ieltsBridgeClient.catalog().then(setCatalog).catch(() => setError(true)); }, []);
  const hasProgress = catalog?.modules.some((module) => module.progress && !module.progress.completedAt) ?? false;

  return <section className="dashboard-card" aria-labelledby="bridge-card-heading">
    <span className="card-tag">IELTS pathway</span>
    <h2 id="bridge-card-heading" className="section-title">IELTS Bridge</h2>
    {!catalog && !error ? <p role="status">Checking Bridge access...</p> : null}
    {error ? <p className="form-error" role="status">IELTS Bridge status is temporarily unavailable.</p> : null}
    {catalog?.lockedReason === 'ORIENTATION_REQUIRED' ? <p>Complete IELTS Orientation to unlock Bridge practice.</p> : null}
    {catalog?.bridgeCompleted ? <><p>Bridge complete. You have built a working routine for all four IELTS skills.</p><Link href="/ielts/bridge">Review IELTS Bridge</Link></> : null}
    {catalog?.eligible && !catalog.bridgeCompleted ? <>
      <p>Build core IELTS habits through ten guided stages in listening, reading, writing and speaking.</p>
      <Link className="primary-action-button" href="/ielts/bridge">{hasProgress ? 'Resume IELTS Bridge' : 'Start IELTS Bridge'}</Link>
    </> : null}
  </section>;
}
