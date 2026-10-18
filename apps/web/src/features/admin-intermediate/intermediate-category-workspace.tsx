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

export function IntermediateCategoryWorkspace({ category }: { readonly category: IntermediateCategory }) {
  return <CategoryLessons key={category} category={category} />;
}

function CategoryLessons({ category }: { readonly category: IntermediateCategory }) {
  const t = useT('adminProgramAuthoring', adminProgramAuthoringMessages);
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

  const base = `/admin/programs/intermediate/${category}`;
  const filtered = imports.filter((item) => getIntermediateCategory(item.rawSource) === category);
  return <div className="ad-dashboard intermediate-category-workspace">
    <header className="ad-page-header"><h1>{t('categoryLessons', { category: t(category) })}</h1><p>{t('categoryHelp')}</p>
      <Link href="/admin/programs/intermediate">{t('back')}</Link></header>
    {status === 'loading' ? <p role="status">{t('loading')}</p> : null}
    {status === 'error' ? <div className="ad-panel ad-error" role="alert"><p>{t('loadError')}</p>
      <button className="secondary-button" type="button" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}>{t('retry')}</button>
    </div> : null}
    {status === 'ready' ? <ContentList imports={filtered} newImportHref={`${base}/new`}
      newImportLabel={t('addLesson', { category: t(category) })} getItemHref={(item) => `${base}/${encodeURIComponent(item.id)}`}
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
