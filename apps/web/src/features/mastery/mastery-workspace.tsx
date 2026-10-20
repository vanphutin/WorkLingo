'use client';

import { useT } from '../../i18n/provider';
import { masteryMessages } from '../../i18n/messages/mastery';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckpointPanel } from './checkpoint-panel';
import { ErrorBankPanel } from './error-bank-panel';
import { MasteryOverview } from './mastery-overview';
import { GlassSurface } from '../../components/glass-surface';

export function MasteryWorkspace() {
  const t = useT('mastery', masteryMessages);
  const [evidenceLevel, setEvidenceLevel] = useState<string | null>(null);
  return <main className="evidence-workspace">
    <header className="evidence-header">
      <Link href="/dashboard">{t('back')}</Link>
      <span className="eyebrow">{t('eyebrow')}</span>
      <h1>{t('title')}</h1>
      <p>{t('introduction')}</p>
      <GlassSurface className="evidence-nav-surface"><nav className="evidence-section-links" aria-label={t('sections')}>
        <a href="#memory-heading">{t('memory')}</a>
        <a href="#mastery-heading">{t('map')}</a>
        <a href="#errors-heading">{t('errors')}</a>
        <a href="#checkpoint-heading">{t('checkpoint')}</a>
      </nav></GlassSurface>
    </header>
    <MasteryOverview key={evidenceLevel} />
    <ErrorBankPanel />
    <CheckpointPanel onLevelChange={setEvidenceLevel} />
  </main>;
}
