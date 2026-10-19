'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { intermediateCategories, type IntermediateCategory } from '@worklingo/content-format';
import { useT } from '../../i18n/provider';
import { adminProgramAuthoringMessages } from '../../i18n/messages/adminProgramAuthoring';
import { apiClient } from '../../lib/api/api-client';
import { getIntermediateCategory } from './lesson-model';
import './intermediate-navigation.css';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import { isIntermediateTopicSource } from './topic-lesson-model';

type CountState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; counts: Partial<Record<IntermediateCategory, number>> };

export function IntermediateAuthoringHub() {
  const t = useT('adminProgramAuthoring', adminProgramAuthoringMessages);
  const tt = useT('intermediateTopics', intermediateTopicsMessages);
  const tg = useT('intermediateGroups', intermediateGroupsMessages);
  const id = useId();
  const [state, setState] = useState<CountState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void apiClient.listContentImports().then((imports) => {
      const counts: Partial<Record<IntermediateCategory, number>> = {};
      for (const item of imports) {
        if (isIntermediateTopicSource(item.rawSource)) continue;
        const category = getIntermediateCategory(item.rawSource);
        if (category) counts[category] = (counts[category] ?? 0) + 1;
      }
      if (active) setState({ status: 'ready', counts });
    }, () => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [attempt]);

  return <section className="intermediate-authoring-hub" aria-labelledby={`${id}-title`}>
    <header><h2 id={`${id}-title`}>{tg('title')}</h2><p className="ad-muted">{tg('flowHelp')}</p></header>
    <div className="intermediate-category-actions">
      <Link className="intermediate-add-link" href="/admin/programs/intermediate/topic-groups">{tg('title')}</Link>
    </div>
    <details className="intermediate-legacy-tools"><summary>{tt('legacy')}</summary><p>{tt('legacyHelp')}</p>
    {state.status === 'loading' ? <p role="status">{t('loadingCounts')}</p> : null}
    {state.status === 'error' ? <div className="ad-notice" role="alert"><p>{t('countsError')}</p>
      <button type="button" className="secondary-button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }}>{t('retry')}</button>
    </div> : null}
    <div className="intermediate-category-grid">{intermediateCategories.map((category) => <article className="intermediate-category-card" key={category} aria-labelledby={`${id}-${category}`}>
      <h3 id={`${id}-${category}`}>{t(category)}</h3>
      <p>{t(`${category}Description`)}</p>
      {state.status === 'ready' ? <small>{t('lessonCount', { count: state.counts[category] ?? 0 })}</small> : null}
      <div className="intermediate-category-actions">
        <Link className="intermediate-add-link" href={`/admin/programs/intermediate/${category}/new`}>{t('addLesson', { category: t(category) })}</Link>
        <Link href={`/admin/programs/intermediate/${category}`}>{t('viewLessons', { category: t(category) })}</Link>
      </div>
    </article>)}</div>
    <div className="intermediate-library-note"><Link href="/admin/content">{t('library')}</Link><p className="ad-muted">{t('libraryHelp')}</p></div>
    </details>
  </section>;
}
