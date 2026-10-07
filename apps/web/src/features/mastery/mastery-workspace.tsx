'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckpointPanel } from './checkpoint-panel';
import { ErrorBankPanel } from './error-bank-panel';
import { MasteryOverview } from './mastery-overview';

export function MasteryWorkspace() {
  const [evidenceLevel, setEvidenceLevel] = useState<string | null>(null);
  return <main className="evidence-workspace">
    <header className="evidence-header">
      <Link href="/dashboard">Back to dashboard</Link>
      <span className="eyebrow">Your workplace English</span>
      <h1>Your learning evidence</h1>
      <p>Know what is improving, what needs another look, and when you are ready for the next level.</p>
      <nav className="evidence-section-links" aria-label="Learning evidence sections">
        <a href="#memory-heading">Memory Health</a>
        <a href="#mastery-heading">Mastery Map</a>
        <a href="#errors-heading">Error Bank</a>
        <a href="#checkpoint-heading">Checkpoint assessment</a>
      </nav>
    </header>
    <MasteryOverview key={evidenceLevel} />
    <ErrorBankPanel />
    <CheckpointPanel onLevelChange={setEvidenceLevel} />
  </main>;
}
