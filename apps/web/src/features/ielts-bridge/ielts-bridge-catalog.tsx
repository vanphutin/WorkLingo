'use client';

import type { IeltsBridgeCatalogDto } from '@worklingo/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';
import './ielts-bridge.css';

const label = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/gu, (letter) => letter.toUpperCase());

export function IeltsBridgeCatalog() {
  const [catalog, setCatalog] = useState<IeltsBridgeCatalogDto | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { void ieltsBridgeClient.catalog().then(setCatalog).catch(() => setError(true)); }, []);
  if (!catalog && !error) return <main className="bridge-shell bridge-state"><p role="status">Loading IELTS Bridge...</p></main>;
  if (error) return <main className="bridge-shell bridge-state"><h1>IELTS Bridge</h1><p role="alert">We could not load your modules. Try again from the dashboard.</p></main>;
  if (!catalog?.eligible && catalog?.modules.length === 0) return <main className="bridge-shell bridge-state"><p className="bridge-kicker">IELTS pathway</p><h1>Complete Orientation first</h1><p>Orientation introduces the format and unlocks your Bridge modules.</p><Link className="bridge-primary" href="/ielts/orientation">Open IELTS Orientation</Link></main>;
  if (!catalog) return null;
  return <main className="bridge-shell">
    <header className="bridge-heading"><div><p className="bridge-kicker">IELTS pathway</p><h1>IELTS Bridge</h1><p>Practise each skill through the same ten-stage learning routine.</p></div><Link href="/dashboard">Back to dashboard</Link></header>
    {catalog.bridgeCompleted ? <p className="bridge-success" role="status">Bridge milestone complete. You can revisit any module below.</p> : null}
    <div className="bridge-module-grid">{catalog.modules.map((module) => {
      const completed = Boolean(module.progress?.completedAt);
      const started = Boolean(module.progress);
      return <article className="bridge-module-card" key={module.moduleId}>
        <div className="bridge-module-meta"><span>{label(module.skill)}</span><span>{label(module.questionType)}</span></div>
        <h2>{module.title}</h2><p>{module.description}</p>
        <p>{completed ? 'Completed' : started ? `Stage ${(module.progress?.currentStageIndex ?? 0) + 1} of 10` : 'Not started'}</p>
        <Link className="bridge-primary" href={`/ielts/bridge/${module.moduleId}`}>{completed ? 'Review module' : started ? 'Resume module' : 'Start module'}</Link>
      </article>;
    })}</div>
  </main>;
}
