'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { IntermediateCategory } from '@worklingo/content-format';
import type { ContentImportDto } from '@worklingo/contracts';
import { useT } from '../../i18n/provider';
import { adminProgramAuthoringMessages } from '../../i18n/messages/adminProgramAuthoring';
import { apiClient } from '../../lib/api/api-client';
import { ContentList } from '../admin-content/content-list';
import { getIntermediateCategory } from './lesson-model';
import './intermediate-navigation.css';
import { isIntermediateTopicSource } from './topic-lesson-model';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';

export function IntermediateCategoryWorkspace({ category, topic = false }: { readonly category: IntermediateCategory; readonly topic?: boolean }) {
  return <CategoryLessons key={`${topic}:${category}`} category={category} topic={topic} />;
}

function CategoryLessons({ category, topic }: { readonly category: IntermediateCategory; readonly topic: boolean }) {
  const t = useT('adminProgramAuthoring', adminProgramAuthoringMessages);
  const tt = useT('intermediateTopics', intermediateTopicsMessages);
  const tg = useT('intermediateGroups', intermediateGroupsMessages);
  const [imports, setImports] = useState<ContentImportDto[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const stamp = ++generation.current;
    void apiClient.listContentImports().then((items) => {
      if (generation.current !== stamp) return;
      setImports(items);
      setStatus('ready');
    }, () => { if (generation.current === stamp) setStatus('error'); });
    return () => { generation.current += 1; };
  }, [attempt]);

  const base = `/admin/programs/intermediate/${topic ? 'topics' : category}`;
  const filtered = imports.filter((item) => topic ? isIntermediateTopicSource(item.rawSource)
    : !isIntermediateTopicSource(item.rawSource) && getIntermediateCategory(item.rawSource) === category);
  return <div className="ad-dashboard intermediate-category-workspace">
    <header className="ad-page-header"><h1>{topic ? tt('title') : t('categoryLessons', { category: t(category) })}</h1><p>{topic ? tt('description') : t('categoryHelp')}</p>
      <Link href="/admin/programs/intermediate">{t('back')}</Link>
      {topic ? <p><Link href="/admin/programs/intermediate/topic-groups">{tg('title')}</Link></p> : null}</header>
    {status === 'loading' ? <p role="status">{t('loading')}</p> : null}
    {status === 'error' ? <div className="ad-panel ad-error" role="alert"><p>{t('loadError')}</p>
      <button className="secondary-button" type="button" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}>{t('retry')}</button>
    </div> : null}
    {status === 'ready' ? <ContentList imports={filtered} newImportHref={`${base}/new`}
      newImportLabel={topic ? tt('add') : t('addLesson', { category: t(category) })} getItemHref={(item) => `${base}/${encodeURIComponent(item.id)}`}
      onReload={async () => {
        const stamp = generation.current;
        const items = await apiClient.listContentImports();
        if (stamp === generation.current) setImports(items);
      }}
      onRemoved={({ id, action }) => setImports((items) => action === 'deleted'
        ? items.filter((item) => item.id !== id)
        : items.map((item) => item.id === id ? { ...item, status: 'ARCHIVED', draftRevision: item.draftRevision + 1 } : item))} /> : null}
    <aside className="intermediate-library-note"><Link href="/admin/content">{t('library')}</Link><p className="ad-muted">{t('libraryHelp')}</p></aside>
  </div>;
}
