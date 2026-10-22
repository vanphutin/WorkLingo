'use client';

import { AdminLink as Link } from '../admin-dashboard/admin-navigation-guard';
import { AdminPageHeader, AdminFilterBar, AdminEmptyState, AdminDataTable } from '../admin-experience/admin-patterns';
import { useT } from '../../i18n/provider';
import { adminExperienceMessages } from '../../i18n/messages/adminExperience';
import { useAdminContent } from './i18n';

import React, { useRef, useState } from 'react';
import { adminContentLifecycleClient } from '../../lib/api/admin-content-lifecycle-client';

import type { ContentImportDto } from '@worklingo/contracts';
import './authoring-experience.css';

interface ContentListProps {
  readonly imports: readonly ContentImportDto[];
  readonly onRemoved?: (result: { id: string; action: 'deleted' | 'archived' }) => void;
  readonly onReload?: () => Promise<void>;
  readonly newImportHref?: string;
  readonly newImportLabel?: string;
  readonly getItemHref?: (item: ContentImportDto) => string;
}

function extractLessonInfo(rawSource: string): { title: string; slug: string } {
  const slugMatch = rawSource.match(/slug:\s*([^\r\n]+)/i);
  const titleMatch = rawSource.match(/title:\s*([^\r\n]+)/i);
  const slug = slugMatch ? slugMatch[1]!.trim() : 'untitled-draft';
  const title = titleMatch ? titleMatch[1]!.trim() : slug;
  return { title, slug };
}

export function ContentList({ imports, onRemoved, onReload, newImportHref = '/admin/content/new', newImportLabel, getItemHref }: ContentListProps) {
  const { t, date, label, message } = useAdminContent();
  const tx = useT('adminExperience', adminExperienceMessages);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const filtered = imports.filter(item => (!status || item.status === status) && `${extractLessonInfo(item.rawSource).title} ${extractLessonInfo(item.rawSource).slug}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const mutationInFlight = useRef(false);
  const requests = useRef(new Map<string, { revision: number; action: 'deleted' | 'archived'; key: string }>());

  async function reload() {
    if (!onReload || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusyId('reload');
    try { await onReload(); setError(null); }
    catch (cause) { setError(cause); }
    finally { mutationInFlight.current = false; setBusyId(null); }
  }

  async function remove(item: ContentImportDto) {
    if (mutationInFlight.current) return;
    const { title } = extractLessonInfo(item.rawSource);
    const hasHistory = Boolean(item.lessonId || item.lessonVersionId);
    const action = hasHistory ? 'archived' : 'deleted';
    if (!window.confirm(t(hasHistory ? 'confirmArchiveLesson' : 'confirmDeleteDraft', { title }))) return;
    mutationInFlight.current = true;
    setBusyId(item.id);
    setError(null);
    let request = requests.current.get(item.id);
    if (!request || request.revision !== item.draftRevision || request.action !== action) {
      request = { revision: item.draftRevision, action, key: crypto.randomUUID() };
      requests.current.set(item.id, request);
    }
    try {
      const result = await adminContentLifecycleClient.remove('lesson', item.id, {
        expectedRevision: request.revision, expectedAction: action, idempotencyKey: request.key,
      });
      requests.current.delete(item.id);
      onRemoved?.(result);
    } catch (cause) {
      setError(cause);
    } finally {
      mutationInFlight.current = false;
      setBusyId(null);
    }
  }
  if (imports.length === 0) {
    return (
      <div className="content-list-empty authoring-experience" role="region" aria-label={t('importsRegion')}>
        <div className="empty-card">
          <h1>{t('importsEmpty')}</h1>
          <p>{t('importsEmptyHelp')}</p>
          <Link href={newImportHref} className="btn btn-primary">{newImportLabel ?? t('newImport')}</Link>
        </div>
      </div>

    );
  }

  return (
    <div className="content-list-container authoring-experience">
      <AdminPageHeader title={t('allImports', { count: imports.length })} description={t('importsHelp')}
        actions={<Link href={newImportHref} className="btn btn-primary">{newImportLabel ?? t('newImport')}</Link>} />
      <AdminFilterBar label={t('importsRegion')}>
        <label>{tx('searchContent')}<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label>{tx('status')}<select value={status} onChange={event => setStatus(event.target.value)}><option value="">{tx('allStatuses')}</option>{['DRAFT','VALIDATED','PUBLISHED','ARCHIVED'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <button type="button" className="btn btn-secondary" onClick={() => { setQuery(''); setStatus(''); }}>{tx('clearFilters')}</button>
        <p>{tx('loadedOnly')}</p>
      </AdminFilterBar>
      {filtered.length === 0 ? <AdminEmptyState title={tx('noMatches')} /> : null}
      <AdminDataTable label={t('importsRegion')}>
        {error ? <div className="error-card" role="alert"><p>{message(error)}</p>
          {onReload ? <button type="button" disabled={busyId !== null} onClick={() => { void reload(); }}>{t('reloadImports')}</button> : null}
        </div> : null}
        <table className="content-table">
          <thead>
            <tr>
              <th scope="col">{t('status')}</th>
              <th scope="col">{t('lesson')}</th>
              <th scope="col">{t('revisionColumn')}</th>
              <th scope="col">{t('updated')}</th>
              <th scope="col">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const { title, slug } = extractLessonInfo(item.rawSource);
              const formattedDate = date(item.updatedAt);
              const actionLabel = item.status === 'PUBLISHED' || item.status === 'ARCHIVED' ? t('view') : t('openDraft');
              const removeLabel = t(item.lessonId || item.lessonVersionId ? 'archiveLesson' : 'deleteDraft');

              return (
                <tr key={item.id} className={`status-row status-${item.status.toLowerCase()}`}>
                  <td>
                    <span className={`status-pill pill-${item.status.toLowerCase()}`}>
                      {label(item.status)}
                    </span>
                  </td>
                  <td>
                    <div className="lesson-meta-cell">
                      <strong className="lesson-title">{title}</strong>
                      <span className="lesson-slug">{slug}</span>
                    </div>
                  </td>
                  <td>
                    <span className="revision-badge">{t('revisionShort', { count: item.draftRevision })}</span>
                  </td>
                  <td>
                    <time dateTime={item.updatedAt} className="updated-time">
                      {formattedDate}
                    </time>
                  </td>
                  <td>
                    <Link
                      href={getItemHref ? getItemHref(item) : `/admin/content/${item.id}`}
                      className="btn btn-sm btn-secondary"
                    >
                      {actionLabel}
                    </Link>
                    {item.status !== 'ARCHIVED' ? <button type="button" className="btn btn-sm btn-secondary"
                      aria-label={`${removeLabel}: ${title}`} disabled={busyId !== null}
                      onClick={() => { void remove(item); }}>
                      {busyId === item.id ? t('removingLesson') : removeLabel}
                    </button> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminDataTable>
    </div>
  );
}
