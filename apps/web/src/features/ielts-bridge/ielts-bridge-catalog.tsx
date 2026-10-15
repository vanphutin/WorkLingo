'use client';

import type { IeltsBridgeCatalogDto } from '@worklingo/contracts';
import Link from 'next/link';
import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import { ieltsBridgeMessages } from '../../i18n/messages/ieltsBridge';
import { useEffect, useState } from 'react';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';
import './ielts-bridge.css';

export function IeltsBridgeCatalog() {
  const t = useT('ieltsBridge', ieltsBridgeMessages);
  const { locale } = useLocalePreference();
  const [catalog, setCatalog] = useState<IeltsBridgeCatalogDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { void ieltsBridgeClient.catalog().then(setCatalog).catch(setError); }, []);
  if (!catalog && !error) return <main className="bridge-shell bridge-state"><p role="status">{t('loading')}</p></main>;
  if (error) return <main className="bridge-shell bridge-state"><h1>{t('title')}</h1><p role="alert">{localizedError(error, locale)}</p></main>;
  if (!catalog?.eligible && catalog?.modules.length === 0) return <main className="bridge-shell bridge-state"><p className="bridge-kicker">{t('pathway')}</p><h1>{t('orientationFirst')}</h1><p>{t('orientationDescription')}</p><Link className="bridge-primary" href="/ielts/orientation">{t('openOrientation')}</Link></main>;
  if (!catalog) return null;
  return <main className="bridge-shell">
    <header className="bridge-heading"><div><p className="bridge-kicker">{t('pathway')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div><Link href="/dashboard">{t('dashboard')}</Link></header>
    {catalog.bridgeCompleted ? <p className="bridge-success" role="status">{t('milestoneComplete')}</p> : null}
    {catalog.modules.length === 0 ? <p role="status">{t('emptyModules')}</p> : null}
    <div className="bridge-module-grid">{catalog.modules.map((module) => {
      const completed = Boolean(module.progress?.completedAt);
      const started = Boolean(module.progress);
      return <article className="bridge-module-card" key={module.moduleId}>
        <div className="bridge-module-meta"><span>{t(module.skill)}</span><span>{t(module.questionType)}</span></div>
        <h2 lang="en">{module.title}</h2><p lang="en">{module.description}</p>
        <p>{completed ? t('completed') : started ? t('stageProgress', { stage: formatNumber(locale, (module.progress?.currentStageIndex ?? 0) + 1) }) : t('notStarted')}</p>
        <Link className="bridge-primary" href={`/ielts/bridge/${module.moduleId}`}>{completed ? t('review') : started ? t('resume') : t('start')}</Link>
      </article>;
    })}</div>
  </main>;
}
