'use client';

import Link from 'next/link';
import { useAdminContent } from './i18n';

import React from 'react';

import type { ContentImportDto } from '@worklingo/contracts';
import './authoring-experience.css';

interface ContentListProps {
  readonly imports: readonly ContentImportDto[];
}

function extractLessonInfo(rawSource: string): { title: string; slug: string } {
  const slugMatch = rawSource.match(/slug:\s*([^\r\n]+)/i);
  const titleMatch = rawSource.match(/title:\s*([^\r\n]+)/i);
  const slug = slugMatch ? slugMatch[1]!.trim() : 'untitled-draft';
  const title = titleMatch ? titleMatch[1]!.trim() : slug;
  return { title, slug };
}

export function ContentList({ imports }: ContentListProps) {
  const { t, date, label } = useAdminContent();
  if (imports.length === 0) {
    return (
      <div className="content-list-empty authoring-experience" role="region" aria-label={t('importsRegion')}>
        <div className="empty-card">
          <h1>{t('importsEmpty')}</h1>
          <p>{t('importsEmptyHelp')}</p>
          <Link href="/admin/content/new" className="btn btn-primary">{t('newImport')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content-list-container authoring-experience" role="region" aria-label={t('importsRegion')}>
      <div className="content-list-header">
        <div>
          <h1>{t('allImports', { count: imports.length })}</h1>
          <p className="subtitle">{t('importsHelp')}</p>
        </div>
        <Link href="/admin/content/new" className="btn btn-primary">{t('newImport')}</Link>
      </div>

      <div className="content-table-wrapper" tabIndex={0} role="region" aria-label={t('importsRegion')}>
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
            {imports.map((item) => {
              const { title, slug } = extractLessonInfo(item.rawSource);
              const formattedDate = date(item.updatedAt);
              const actionLabel = item.status === 'PUBLISHED' ? t('view') : t('openDraft');

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
                      href={`/admin/content/${item.id}`}
                      className="btn btn-sm btn-secondary"
                    >
                      {actionLabel}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
