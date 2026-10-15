'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { masteryMessages } from '../../i18n/messages/mastery';
import { localizedError } from '../../i18n/errors';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { apiClient, type LearningSkill } from '../../lib/api/api-client';
import { formatDate, SKILLS } from './evidence-format';
import { useLearnerResource } from './use-learner-resource';

export function ErrorBankPanel() {
  const t = useT('mastery', masteryMessages);
  const { locale } = useLocalePreference();
  const [query, setQuery] = useState<{ skill: LearningSkill | ''; page: number }>({ skill: '', page: 1 });
  const load = useCallback(() => apiClient.getErrorBank({
    ...(query.skill ? { skill: query.skill } : {}), page: query.page, limit: 20,
  }), [query.skill, query.page]);
  const errors = useLearnerResource(load);

  return (
    <section className="evidence-panel" aria-labelledby="errors-heading" aria-busy={errors.isLoading}>
      <div className="evidence-panel-header">
        <div><h2 id="errors-heading">{t('errors')}</h2><p className="evidence-note">{t('errorsNote')}</p></div>
        <div className="evidence-filter">
          <label htmlFor="error-skill-filter">{t('filterErrors')}</label>
          <select id="error-skill-filter" value={query.skill} onChange={(event) => setQuery({ skill: event.target.value as LearningSkill | '', page: 1 })}>
            <option value="">{t('allSkills')}</option>
            {SKILLS.map((skill) => <option key={skill} value={skill}>{t(skill)}</option>)}
          </select>
        </div>
      </div>
      {errors.isLoading && <p role="status">{t('loadingErrors')}</p>}
      {errors.failed && <div role="alert"><p>{t('errorsError')}</p><p>{localizedError(errors.error, locale)}</p><button type="button" onClick={errors.retry}>{t('retryErrors')}</button></div>}
      {errors.data && <>
        {errors.data.items.length === 0 ? <p>{query.skill ? t('emptyErrorsSkill', { skill: t(query.skill).toLocaleLowerCase(locale) }) : t('emptyErrors')}</p> : <>
          <p>{t('entries', { count: errors.data.total })}</p>
          <ul className="evidence-list error-entries">{errors.data.items.map((error) => (
            <li key={error.id}>
              <div><h3 lang="en">{error.canonicalForm}</h3><p>{t(error.skill)} · {t('occurrences', { count: error.occurrenceCount })}</p></div>
              <div>
                <p>{t('firstRecorded')}{' '}<time dateTime={error.firstOccurredAt}>{formatDate(error.firstOccurredAt, locale)}</time></p>
                <p>{t('lastRecorded')}{' '}<time dateTime={error.lastOccurredAt}>{formatDate(error.lastOccurredAt, locale)}</time></p>
                <p className="evidence-note">{error.evidenceGranularity === 'ACTIVITY' ? t('wholeActivity') : t('recordedPractice')}</p>
              </div>
            </li>
          ))}</ul>
          <Link href="/dashboard">{t('practiceAgain')}</Link>
        </>}
        {errors.data.totalPages > 0 && <nav className="evidence-pagination" aria-label={t('errorPages')}>
          <button type="button" disabled={errors.data.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>{t('previousPage')}</button>
          <span aria-live="polite">{t('page', { page: errors.data.page, total: errors.data.totalPages })}</span>
          <button type="button" disabled={errors.data.page >= errors.data.totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>{t('nextPage')}</button>
        </nav>}
      </>}
    </section>
  );
}
