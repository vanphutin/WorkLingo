'use client';

import React, { useEffect, useState } from 'react';
import type { AdminPilotAnalyticsResponse } from '@worklingo/contracts';

import { adminAnalyticsClient } from '../../lib/api/admin-analytics-client';
import './observability.css';

function dateKey(date: Date): string { return date.toISOString().slice(0, 10); }

export function AnalyticsWorkspace() {
  const today = dateKey(new Date());
  const monthAgo = dateKey(new Date(Date.now() - 29 * 86_400_000));
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<AdminPilotAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { setData(await adminAnalyticsClient.getPilotAnalytics(from, to)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load pilot analytics'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  const eventTotals = new Map<string, number>();
  for (const metric of data?.metrics ?? []) eventTotals.set(metric.eventType, (eventTotals.get(metric.eventType) ?? 0) + metric.count);

  return <section className="observability-shell">
    <header className="observability-header"><div><h1>Pilot Analytics</h1><p>Aggregate product evidence only—no learner text, audio, email, or user-level export.</p></div></header>
    {error && <div className="observability-alert" role="alert">{error}</div>}
    <form className="observability-card observability-filters" onSubmit={(event) => { event.preventDefault(); void load(); }}>
      <div className="observability-field"><label htmlFor="analytics-from">From</label><input id="analytics-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></div>
      <div className="observability-field"><label htmlFor="analytics-to">To</label><input id="analytics-to" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></div>
      <button className="observability-button" type="submit" disabled={loading}>Update range</button>
    </form>
    {loading && !data ? <p role="status">Loading analytics…</p> : data && <>
      <div className="observability-grid">
        <article className="observability-card"><span>Week 1 retention</span><strong className="metric-value">{Math.round(data.retention.week1.retentionRate * 100)}%</strong><small>{data.retention.week1.retainedCount}/{data.retention.week1.cohortSize} matured learners</small></article>
        <article className="observability-card"><span>Week 4 retention</span><strong className="metric-value">{Math.round(data.retention.week4.retentionRate * 100)}%</strong><small>{data.retention.week4.retainedCount}/{data.retention.week4.cohortSize} matured learners</small></article>
        <article className="observability-card"><span>Sessions completed</span><strong className="metric-value">{eventTotals.get('LEARNING_SESSION_COMPLETED') ?? 0}</strong></article>
        <article className="observability-card"><span>Weekly targets met</span><strong className="metric-value">{eventTotals.get('ENGAGEMENT_TARGET_MET') ?? 0}</strong></article>
      </div>
      <div className="observability-table-wrap"><table className="observability-table"><caption className="sr-only">Pilot event totals</caption><thead><tr><th>Event</th><th>Total</th><th>Definition</th></tr></thead><tbody>{data.definitions.map((definition) => <tr key={definition.eventType}><td>{definition.eventType}</td><td>{eventTotals.get(definition.eventType) ?? 0}</td><td>{definition.description}</td></tr>)}</tbody></table></div>
    </>}
  </section>;
}
