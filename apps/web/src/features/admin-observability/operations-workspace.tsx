'use client';

import { useAdminObservability } from './i18n';

import React, { useCallback, useEffect, useState } from 'react';
import type { AdminJobDetailDto, AdminJobPageDto, AdminJobStatus, AdminOperationsSummaryDto } from '@worklingo/contracts';

import { adminOperationsClient } from '../../lib/api/admin-operations-client';
import './observability.css';

const statuses = ['', 'PENDING', 'RUNNING', 'RETRY_WAIT', 'COMPLETED', 'FAILED'] as const;

export function OperationsWorkspace() {
  const { t, number, date, label, message: displayMessage } = useAdminObservability();
  const [summary, setSummary] = useState<AdminOperationsSummaryDto | null>(null);
  const [jobs, setJobs] = useState<AdminJobPageDto | null>(null);
  const [detail, setDetail] = useState<AdminJobDetailDto | null>(null);
  const [status, setStatus] = useState<AdminJobStatus | ''>('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextJobs] = await Promise.all([
        adminOperationsClient.getSummary(),
        adminOperationsClient.listJobs({
          page: requestedPage,
          pageSize: 20,
          ...(status ? { status } : {}),
          ...(type.trim() ? { type: type.trim() } : {}),
        }),
      ]);
      setSummary(nextSummary);
      setJobs(nextJobs);
      setPage(requestedPage);
    } catch (reason) {
      setError(reason);
    } finally {
      setLoading(false);
    }
  }, [page, status, type]);

  useEffect(() => { void load(1); }, []);

  return <section className="observability-shell operations-experience">
    <header className="observability-header"><div><h1>{t('operationsTitle')}</h1><p>{t('operationsHelp')}</p></div><button className="observability-button secondary" type="button" onClick={() => void load(page)} disabled={loading}>{t('refresh')}</button></header>
    {Boolean(error) && <div className="observability-alert" role="alert">{displayMessage(error)}</div>}
    {summary && <div className="observability-grid" aria-label={t('summary')}>
      <article className="observability-card"><span>{t('queueDepth')}</span><strong className="metric-value">{number(summary.queueDepth)}</strong></article>
      <article className="observability-card"><span>{t('running')}</span><strong className="metric-value">{number(summary.runningCount)}</strong></article>
      <article className="observability-card"><span>{t('failed')}</span><strong className="metric-value">{number(summary.failedCount)}</strong></article>
      <article className="observability-card"><span>{t('activeWorkers')}</span><strong className="metric-value">{number(summary.activeWorkers)}</strong></article>
    </div>}
    <form className="observability-card observability-filters" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
      <div className="observability-field"><label htmlFor="job-status">{t('status')}</label><select id="job-status" value={status} onChange={(event) => setStatus(event.target.value as AdminJobStatus | '')}>{statuses.map((value) => <option key={value || 'all'} value={value}>{value ? label(value) : t('allStatuses')}</option>)}</select></div>
      <div className="observability-field"><label htmlFor="job-type">{t('jobType')}</label><input id="job-type" value={type} onChange={(event) => setType(event.target.value)} placeholder={t('jobTypePlaceholder')} /></div>
      <button className="observability-button" type="submit" disabled={loading}>{t('applyFilters')}</button>
    </form>
    {loading && !jobs ? <p role="status">{t('loadingOperations')}</p> : jobs && <>
      <div className="observability-table-wrap" tabIndex={0} role="region" aria-label={t('backgroundJobs')}><table className="observability-table"><caption className="sr-only">{t('backgroundJobs')}</caption><thead><tr><th>{t('job')}</th><th>{t('status')}</th><th>{t('created')}</th><th>{t('attempts')}</th><th>{t('details')}</th></tr></thead><tbody>
        {jobs.items.length === 0 ? <tr><td colSpan={5}>{t('emptyJobs')}</td></tr> : jobs.items.map((job) => <tr key={job.id}><td><strong>{job.type}</strong><br /><small>{job.id}</small></td><td><span className="observability-status">{label(job.status)}</span></td><td>{date(job.createdAt)}</td><td>{number(job.attemptCount)}/{number(job.maxAttempts)}</td><td><button className="observability-button secondary" type="button" onClick={async () => { setError(null); try { setDetail(await adminOperationsClient.getJob(job.id)); } catch (reason) { setError(reason); } }}>{t('inspect')}</button></td></tr>)}
      </tbody></table></div>
      <div className="observability-actions"><button className="observability-button secondary" type="button" disabled={loading || page <= 1} onClick={() => void load(page - 1)}>{t('previous')}</button><span>{t('page', { page: number(jobs.page), total: number(Math.max(1, jobs.totalPages)) })}</span><button className="observability-button secondary" type="button" disabled={loading || page >= jobs.totalPages} onClick={() => void load(page + 1)}>{t('next')}</button></div>
    </>}
    {detail && <article className="observability-card" aria-live="polite"><h2>{t('jobDetail')}</h2><p><strong>{detail.type}</strong> · {label(detail.status)}</p>{detail.errorSummary && <p>{detail.errorSummary}</p>}<details><summary>{t('safePayload')}</summary><pre className="job-detail">{JSON.stringify({ attempts: detail.attempts, payloadSummary: detail.payloadSummary }, null, 2)}</pre></details></article>}
  </section>;
}
