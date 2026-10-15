'use client';

import type { IeltsBridgeCatalogDto } from '@worklingo/contracts';
import Link from 'next/link';
import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsBridgeMessages } from '../../i18n/messages/ieltsBridge';
import { useEffect, useState } from 'react';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';

export function IeltsBridgeDashboardCard() {
  const t = useT('ieltsBridge', ieltsBridgeMessages);
  const { locale } = useLocalePreference();
  const [catalog, setCatalog] = useState<IeltsBridgeCatalogDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { void ieltsBridgeClient.catalog().then(setCatalog).catch(setError); }, []);
  const hasProgress = catalog?.modules.some((module) => module.progress && !module.progress.completedAt) ?? false;

  return <section className="dashboard-card" aria-labelledby="bridge-card-heading">
    <span className="card-tag">{t('pathway')}</span>
    <h2 id="bridge-card-heading" className="section-title">{t('title')}</h2>
    {!catalog && !error ? <p role="status">{t('checking')}</p> : null}
    {error ? <p className="form-error" role="status">{localizedError(error, locale)}</p> : null}
    {catalog?.lockedReason === 'ORIENTATION_REQUIRED' ? <p>{t('orientationRequired')}</p> : null}
    {catalog?.bridgeCompleted ? <><p>{t('completeDescription')}</p><Link href="/ielts/bridge">{t('reviewBridge')}</Link></> : null}
    {catalog?.eligible && !catalog.bridgeCompleted ? <>
      <p>{t('habitsDescription')}</p>
      <Link className="primary-action-button" href="/ielts/bridge">{hasProgress ? t('resumeBridge') : t('startBridge')}</Link>
    </> : null}
  </section>;
}
