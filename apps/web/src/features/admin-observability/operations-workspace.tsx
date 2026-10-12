'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { AdminJobDetailDto, AdminJobPageDto, AdminJobStatus, AdminOperationsSummaryDto } from '@worklingo/contracts';

import { adminOperationsClient } from '../../lib/api/admin-operations-client';
import './observability.css';

const statuses = ['', 'PENDING', 'RUNNING', 'RETRY_WAIT', 'COMPLETED', 'FAILED'] as const;

export function OperationsWorkspace() {
  const [summary, setSummary] = useState<AdminOperationsSummaryDto | null>(null);
  const [jobs, setJobs] = useState<AdminJobPageDto | null>(null);
  const [detail, setDetail] = useState<AdminJobDetailDto | null>(null);
  const [status, setStatus] = useState<AdminJobStatus | ''>('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(reason instanceof Error ? reason.message : 'Unable to load operations data');
    } finally {
      setLoading(false);
    }
  }, [page, status, type]);

  useEffect(() => { void load(1); }, []);

  return <section className="observability-shell">
    <header className="observability-header"><div><h1>Operations</h1><p>Queue health, workers, and privacy-safe job diagnostics.</p></div><button className="observability-button secondary" type="button" onClick={() => void load(page)} disabled={loading}>Refresh</button></header>
    {error && <div className="observability-alert" role="alert">{error}</div>}
    {summary && <div className="observability-grid" aria-label="Operations summary">
      <article className="observability-card"><span>Queue depth</span><strong className="metric-value">{summary.queueDepth}</strong></article>
      <article className="observability-card"><span>Running</span><strong className="metric-value">{summary.runningCount}</strong></article>
      <article className="observability-card"><span>Failed</span><strong className="metric-value">{summary.failedCount}</strong></article>
      <article className="observability-card"><span>Active workers</span><strong className="metric-value">{summary.activeWorkers}</strong></article>
    </div>}
    <form className="observability-card observability-filters" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
      <div className="observability-field"><label htmlFor="job-status">Status</label><select id="job-status" value={status} onChange={(event) => setStatus(event.target.value as AdminJobStatus | '')}>{statuses.map((value) => <option key={value || 'all'} value={value}>{value || 'All statuses'}</option>)}</select></div>
      <div className="observability-field"><label htmlFor="job-type">Job type</label><input id="job-type" value={type} onChange={(event) => setType(event.target.value)} placeholder="e.g. GENERATE_AUDIO" /></div>
      <button className="observability-button" type="submit" disabled={loading}>Apply filters</button>
    </form>
    {loading && !jobs ? <p role="status">Loading operations…</p> : jobs && <>
      <div className="observability-table-wrap"><table className="observability-table"><caption className="sr-only">Background jobs</caption><thead><tr><th>Job</th><th>Status</th><th>Created</th><th>Attempts</th><th>Details</th></tr></thead><tbody>
        {jobs.items.length === 0 ? <tr><td colSpan={5}>No jobs match these filters.</td></tr> : jobs.items.map((job) => <tr key={job.id}><td><strong>{job.type}</strong><br /><small>{job.id}</small></td><td><span className="observability-status">{job.status}</span></td><td>{new Date(job.createdAt).toLocaleString()}</td><td>{job.attemptCount}/{job.maxAttempts}</td><td><button className="observability-button secondary" type="button" onClick={async () => { setError(null); try { setDetail(await adminOperationsClient.getJob(job.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load job'); } }}>Inspect</button></td></tr>)}
      </tbody></table></div>
      <div className="observability-actions"><button className="observability-button secondary" type="button" disabled={loading || page <= 1} onClick={() => void load(page - 1)}>Previous</button><span>Page {jobs.page} of {Math.max(1, jobs.totalPages)}</span><button className="observability-button secondary" type="button" disabled={loading || page >= jobs.totalPages} onClick={() => void load(page + 1)}>Next</button></div>
    </>}
    {detail && <article className="observability-card" aria-live="polite"><h2>Job detail</h2><p><strong>{detail.type}</strong> · {detail.status}</p>{detail.errorSummary && <p>{detail.errorSummary}</p>}<details><summary>Safe payload and attempts</summary><pre className="job-detail">{JSON.stringify({ attempts: detail.attempts, payloadSummary: detail.payloadSummary }, null, 2)}</pre></details></article>}
  </section>;
}
