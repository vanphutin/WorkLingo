'use client';
import { AdminPageHeader } from '../admin-experience/admin-patterns';

import { useAdminObservability } from './i18n';

import React, { useEffect, useState } from 'react';
import type { AdminPilotAnalyticsResponse } from '@worklingo/contracts';

import { adminAnalyticsClient } from '../../lib/api/admin-analytics-client';
import './observability.css';

const definitionKeys: Readonly<Record<string, 'definitionRegistration' | 'definitionOnboarding' | 'definitionSessionStarted' | 'definitionSessionCompleted' | 'definitionSessionResumed' | 'definitionPlacement' | 'definitionEvaluation' | 'definitionValidation' | 'definitionPublication' | 'definitionEngagement'>> = {
  REGISTRATION_COMPLETED: 'definitionRegistration', ONBOARDING_CONFIRMED: 'definitionOnboarding',
  LEARNING_SESSION_STARTED: 'definitionSessionStarted', LEARNING_SESSION_COMPLETED: 'definitionSessionCompleted',
  LEARNING_SESSION_RESUMED: 'definitionSessionResumed', PLACEMENT_CONFIRMED: 'definitionPlacement',
  EVALUATION_TERMINAL: 'definitionEvaluation', CONTENT_IMPORT_VALIDATED: 'definitionValidation',
  CONTENT_PUBLISHED: 'definitionPublication', ENGAGEMENT_TARGET_MET: 'definitionEngagement',
};
function dateKey(date: Date): string { return date.toISOString().slice(0, 10); }

export function AnalyticsWorkspace() {
  const { t, locale, number, message: displayMessage } = useAdminObservability();
  const today = dateKey(new Date());
  const monthAgo = dateKey(new Date(Date.now() - 29 * 86_400_000));
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<AdminPilotAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  async function load() {
    setLoading(true); setError(null);
    try { setData(await adminAnalyticsClient.getPilotAnalytics(from, to)); }
    catch (reason) { setError(reason); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  const eventTotals = new Map<string, number>();
  for (const metric of data?.metrics ?? []) eventTotals.set(metric.eventType, (eventTotals.get(metric.eventType) ?? 0) + metric.count);

  return <section className="observability-shell operations-experience">
    <AdminPageHeader title={t('analyticsTitle')} description={t('analyticsHelp')} />
    {Boolean(error) && <div className="observability-alert" role="alert">{displayMessage(error)}</div>}
    <form className="observability-card observability-filters" onSubmit={(event) => { event.preventDefault(); void load(); }}>
      <div className="observability-field"><label htmlFor="analytics-from">{t('from')}</label><input id="analytics-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></div>
      <div className="observability-field"><label htmlFor="analytics-to">{t('to')}</label><input id="analytics-to" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></div>
      <button className="observability-button" type="submit" disabled={loading}>{t('updateRange')}</button>
    </form>
    {loading && !data ? <p role="status">{t('loadingAnalytics')}</p> : data && <>
      <div className="observability-grid">
        <article className="observability-card"><span>{t('week1')}</span><strong className="metric-value">{new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'percent', maximumFractionDigits: 0 }).format(data.retention.week1.retentionRate)}</strong><small>{t('maturedLearners', { retained: number(data.retention.week1.retainedCount), cohort: number(data.retention.week1.cohortSize) })}</small></article>
        <article className="observability-card"><span>{t('week4')}</span><strong className="metric-value">{new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'percent', maximumFractionDigits: 0 }).format(data.retention.week4.retentionRate)}</strong><small>{t('maturedLearners', { retained: number(data.retention.week4.retainedCount), cohort: number(data.retention.week4.cohortSize) })}</small></article>
        <article className="observability-card"><span>{t('sessionsCompleted')}</span><strong className="metric-value">{number(eventTotals.get('LEARNING_SESSION_COMPLETED') ?? 0)}</strong></article>
        <article className="observability-card"><span>{t('weeklyTargets')}</span><strong className="metric-value">{number(eventTotals.get('ENGAGEMENT_TARGET_MET') ?? 0)}</strong></article>
      </div>
      <div className="observability-table-wrap" tabIndex={0} role="region" aria-label={t('eventTotals')}><table className="observability-table"><caption className="sr-only">{t('eventTotals')}</caption><thead><tr><th>{t('event')}</th><th>{t('total')}</th><th>{t('definition')}</th></tr></thead><tbody>{data.definitions.map((definition) => <tr key={definition.eventType}><td>{definition.eventType}</td><td>{number(eventTotals.get(definition.eventType) ?? 0)}</td><td>{definitionKeys[definition.eventType] ? t(definitionKeys[definition.eventType]!) : definition.description}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
