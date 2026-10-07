'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { apiClient, type LearningSkill } from '../../lib/api/api-client';
import { formatDate, SKILLS, skillLabels } from './evidence-format';
import { useLearnerResource } from './use-learner-resource';

export function ErrorBankPanel() {
  const [query, setQuery] = useState<{ skill: LearningSkill | ''; page: number }>({ skill: '', page: 1 });
  const load = useCallback(() => apiClient.getErrorBank({
    ...(query.skill ? { skill: query.skill } : {}), page: query.page, limit: 20,
  }), [query.skill, query.page]);
  const errors = useLearnerResource(load);

  return (
    <section className="evidence-panel" aria-labelledby="errors-heading" aria-busy={errors.isLoading}>
      <div className="evidence-panel-header">
        <div><h2 id="errors-heading">Error Bank</h2><p className="evidence-note">Use mistakes from evaluated practice to guide your next session.</p></div>
        <div className="evidence-filter">
          <label htmlFor="error-skill-filter">Filter errors by skill</label>
          <select id="error-skill-filter" value={query.skill} onChange={(event) => setQuery({ skill: event.target.value as LearningSkill | '', page: 1 })}>
            <option value="">All skills</option>
            {SKILLS.map((skill) => <option key={skill} value={skill}>{skillLabels[skill]}</option>)}
          </select>
        </div>
      </div>
      {errors.isLoading && <p role="status">Loading Error Bank…</p>}
      {errors.failed && <div role="alert"><p>Unable to load Error Bank. Please try again.</p><button type="button" onClick={errors.retry}>Retry Error Bank</button></div>}
      {errors.data && <>
        {errors.data.items.length === 0 ? <p>{query.skill ? `No errors recorded for ${skillLabels[query.skill].toLowerCase()}.` : 'No errors recorded yet.'} Evaluated practice will appear here.</p> : <>
          <p>{errors.data.total} {errors.data.total === 1 ? 'entry' : 'entries'}</p>
          <ul className="evidence-list error-entries">{errors.data.items.map((error) => (
            <li key={error.id}>
              <div><h3>{error.canonicalForm}</h3><p>{skillLabels[error.skill]} · {error.occurrenceCount} {error.occurrenceCount === 1 ? 'occurrence' : 'occurrences'}</p></div>
              <div>
                <p>First recorded: <time dateTime={error.firstOccurredAt}>{formatDate(error.firstOccurredAt)}</time></p>
                <p>Last recorded: <time dateTime={error.lastOccurredAt}>{formatDate(error.lastOccurredAt)}</time></p>
                <p className="evidence-note">{error.evidenceGranularity === 'ACTIVITY' ? 'This entry reflects the activity as a whole.' : 'Recorded from evaluated practice.'}</p>
              </div>
            </li>
          ))}</ul>
          <Link href="/dashboard">Practice again</Link>
        </>}
        {errors.data.totalPages > 0 && <nav className="evidence-pagination" aria-label="Error Bank pages">
          <button type="button" disabled={errors.data.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>Previous page</button>
          <span aria-live="polite">Page {errors.data.page} of {errors.data.totalPages}</span>
          <button type="button" disabled={errors.data.page >= errors.data.totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>Next page</button>
        </nav>}
      </>}
    </section>
  );
}
